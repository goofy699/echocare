import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as crypto from "crypto";
import nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

/* =========================
   Helpers
========================= */

function sha256(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
}

type Role = "patient" | "doctor" | "caregiver" | "admin";

function assertRole(role: any): asserts role is Role {
    if (!["patient", "doctor", "caregiver", "admin"].includes(role)) {
        throw new HttpsError("invalid-argument", "Invalid role.");
    }
}

async function requireAdmin(uid: string | undefined) {
    if (!uid) throw new HttpsError("unauthenticated", "Not signed in.");
    const callerDoc = await db.collection("users").doc(uid).get();
    const callerRole = callerDoc.exists ? (callerDoc.data() as any).role : null;
    if (callerRole !== "admin") {
        throw new HttpsError("permission-denied", "Admin access required.");
    }
}

async function writeAdminAudit(action: string, adminUid: string, targetUid: string, details?: Record<string, any>) {
    await db.collection("adminActivity").add({
        action,
        adminUid,
        targetUid,
        ...(details ? { details } : {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/* =========================
   Email Transport
========================= */

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;

// In emulator/dev mode, allow missing mail credentials and use a no-op transporter
let transporter: any;
if (!MAIL_USER || !MAIL_PASS) {
    console.warn("MAIL_USER or MAIL_PASS not set; using no-op transporter for local development.");
    transporter = {
        sendMail: async (opts: any) => {
            console.log("[dev-noop] sendMail called with:", opts);
            return { accepted: [opts.to] };
        },
    };
} else {
    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: MAIL_USER,
            pass: MAIL_PASS,
        },
    });
}

/* =========================
   1) SEND OTP
========================= */

export const sendOtp = onCall({ cors: true }, async (request) => {
    const email = String(request.data?.email || "").trim().toLowerCase();
    const role = request.data?.role;

    if (!email) {
        throw new HttpsError("invalid-argument", "Email is required.");
    }

    assertRole(role);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = sha256(otp);

    const expiresAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + 10 * 60 * 1000
    );

    const ref = db.collection("otpRequests").doc();

    await ref.set({
        email,
        role,
        otpHash,
        expiresAt,
        used: false,
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await transporter.sendMail({
        from: `EchoCare <${MAIL_USER}>`,
        to: email,
        subject: "EchoCare Verification Code",
        text: `Your EchoCare verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    });

    return {
        rid: ref.id,
        expiresInMinutes: 10,
    };
});

/* =========================
   2) VERIFY OTP + CREATE USER
========================= */

export const verifyOtpAndCreateUser = onCall({ cors: true }, async (request) => {
    const rid = String(request.data?.rid || "");
    const otp = String(request.data?.otp || "").trim();
    const password = String(request.data?.password || "");
    const email = String(request.data?.email || "").trim().toLowerCase();

    if (!rid || !otp || !password || !email) {
        throw new HttpsError(
            "invalid-argument",
            "rid, otp, email and password are required."
        );
    }

    const ref = db.collection("otpRequests").doc(rid);
    const snap = await ref.get();

    if (!snap.exists) {
        throw new HttpsError("not-found", "OTP request not found.");
    }

    const data = snap.data()!;

    if (data.used) {
        throw new HttpsError("failed-precondition", "OTP already used.");
    }

    if (data.expiresAt.toMillis() < Date.now()) {
        throw new HttpsError("deadline-exceeded", "OTP expired.");
    }

    if (data.email !== email) {
        throw new HttpsError("permission-denied", "Email mismatch.");
    }

    if ((data.attempts || 0) >= 5) {
        throw new HttpsError(
            "resource-exhausted",
            "Too many attempts. Request a new OTP."
        );
    }

    if (sha256(otp) !== data.otpHash) {
        await ref.update({
            attempts: admin.firestore.FieldValue.increment(1),
        });
        throw new HttpsError("unauthenticated", "Invalid OTP.");
    }

    await ref.update({
        used: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let user: admin.auth.UserRecord;

    try {
        user = await admin.auth().createUser({
            email,
            password,
            emailVerified: true,
        });
    } catch (err: any) {
        if (err?.code === "auth/email-already-exists") {
            throw new HttpsError(
                "already-exists",
                "Email already registered. Please sign in."
            );
        }
        throw new HttpsError("internal", "Failed to create user.");
    }

    await db.collection("users").doc(user.uid).set({
        email,
        role: data.role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
        uid: user.uid,
        role: data.role,
    };
});

/* =========================
   Admin helpers to list users
   (onCall functions — keep access controlled)
========================= */

export const listDoctors = onCall({ cors: true }, async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError("unauthenticated", "Not signed in.");

    // return users with role === 'doctor', fall back to all users if none tagged
    const snap = await db.collection("users").where("role", "==", "doctor").get();
    let docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    if (docs.length === 0) {
        const all = await db.collection("users").get();
        docs = all.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    }

    return docs.map((d) => ({ id: d.id, name: d.name || d.displayName || d.email || null, role: (d as any).role || null }));
});

export const listPatientsForDoctor = onCall({ cors: true }, async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError("unauthenticated", "Not signed in.");

    const callerId = auth.uid;

    // Ensure caller is allowed: must be doctor or admin
    const callerDoc = await db.collection("users").doc(callerId).get();
    const callerRole = callerDoc.exists ? (callerDoc.data() as any).role : null;
    if (callerRole !== "doctor" && callerRole !== "admin") {
        throw new HttpsError("permission-denied", "Not authorized to list patients.");
    }

    let doctorId = String(request.data?.doctorId || "");
    if (!doctorId) {
        // default to caller if doctor
        if (callerRole === "doctor") doctorId = callerId;
        else throw new HttpsError("invalid-argument", "doctorId is required for non-doctor callers.");
    }

    // Query all users and prefer role == patient (or untagged users)
    const allSnap = await db.collection("users").get();
    const all = allSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    const isPatientCandidate = (u: any) => (u.role ? u.role === "patient" : true);

    const assigned = all.filter((p: any) => {
        if (!isPatientCandidate(p)) return false;
        if (p.assignedDoctorId) return p.assignedDoctorId === doctorId;
        if (p.doctorId) return p.doctorId === doctorId;
        if (Array.isArray(p.assignedDoctors)) return p.assignedDoctors.includes(doctorId);
        return false;
    });

    const result = assigned.length > 0 ? assigned : all.filter(isPatientCandidate);

    return result.map((d) => ({ id: d.id, name: d.name || d.displayName || d.email || null, role: d.role || null }));
});

export const adminCreateUser = onCall({ cors: true }, async (request) => {
    const adminUid = request.auth?.uid;
    await requireAdmin(adminUid);

    const email = String(request.data?.email || "").trim().toLowerCase();
    const password = String(request.data?.password || "").trim();
    const role = String(request.data?.role || "").trim().toLowerCase();
    const name = String(request.data?.name || "").trim();

    if (!email) {
        throw new HttpsError("invalid-argument", "Email is required.");
    }

    if (!password || password.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }

    assertRole(role as any);

    let user: admin.auth.UserRecord;
    try {
        user = await admin.auth().createUser({
            email,
            password,
            emailVerified: true,
            displayName: name || undefined,
        });
    } catch (error: any) {
        if (error?.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "Email already exists.");
        }
        throw new HttpsError("internal", "Failed to create auth user.");
    }

    await db.collection("users").doc(user.uid).set({
        email,
        role,
        ...(name ? { name } : {}),
        suspended: false,
        createdBy: adminUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit("create-user", adminUid!, user.uid, { email, role });

    return {
        uid: user.uid,
        email,
        role,
    };
});

export const adminSetUserSuspended = onCall({ cors: true }, async (request) => {
    const auth = request.auth;
    await requireAdmin(auth?.uid);

    const targetUid = String(request.data?.uid || "").trim();
    const suspended = Boolean(request.data?.suspended);
    const reason = String(request.data?.reason || "").trim();

    if (!targetUid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }

    if (auth?.uid === targetUid) {
        throw new HttpsError("failed-precondition", "You cannot suspend your own account.");
    }

    await admin.auth().updateUser(targetUid, { disabled: suspended });

    await db.collection("users").doc(targetUid).set({
        suspended,
        ...(reason ? { suspendedReason: reason } : {}),
        suspendedBy: auth?.uid,
        ...(suspended
            ? { suspendedAt: admin.firestore.FieldValue.serverTimestamp() }
            : { unsuspendedAt: admin.firestore.FieldValue.serverTimestamp() }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit(suspended ? "suspend-user" : "unsuspend-user", auth!.uid, targetUid, {
        ...(reason ? { reason } : {}),
    });

    return { uid: targetUid, suspended };
});

export const adminDeleteUser = onCall({ cors: true }, async (request) => {
    const auth = request.auth;
    await requireAdmin(auth?.uid);

    const targetUid = String(request.data?.uid || "").trim();
    if (!targetUid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }

    if (auth?.uid === targetUid) {
        throw new HttpsError("failed-precondition", "You cannot delete your own account.");
    }

    let targetEmail = "";
    try {
        const record = await admin.auth().getUser(targetUid);
        targetEmail = record.email || "";
    } catch {
        // ignore and continue cleanup
    }

    try {
        await admin.auth().deleteUser(targetUid);
    } catch (error: any) {
        if (error?.code !== "auth/user-not-found") {
            throw new HttpsError("internal", "Failed to delete auth user.");
        }
    }

    await db.collection("users").doc(targetUid).delete();
    await writeAdminAudit("delete-user", auth!.uid, targetUid, { ...(targetEmail ? { email: targetEmail } : {}) });

    return { uid: targetUid, deleted: true };
});

export const adminSetUserPassword = onCall({ cors: true }, async (request) => {
    const auth = request.auth;
    await requireAdmin(auth?.uid);

    const targetUid = String(request.data?.uid || "").trim();
    const newPassword = String(request.data?.newPassword || "").trim();

    if (!targetUid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }
    if (!newPassword || newPassword.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }

    await admin.auth().updateUser(targetUid, { password: newPassword });
    await db.collection("users").doc(targetUid).set({
        passwordUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        passwordUpdatedBy: auth?.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit("set-user-password", auth!.uid, targetUid);
    return { uid: targetUid, passwordUpdated: true };
});

export const adminGeneratePasswordResetLink = onCall({ cors: true }, async (request) => {
    const auth = request.auth;
    await requireAdmin(auth?.uid);

    const uid = String(request.data?.uid || "").trim();
    const emailInput = String(request.data?.email || "").trim().toLowerCase();
    if (!uid && !emailInput) {
        throw new HttpsError("invalid-argument", "uid or email is required.");
    }

    let userRecord: admin.auth.UserRecord;
    if (uid) userRecord = await admin.auth().getUser(uid);
    else userRecord = await admin.auth().getUserByEmail(emailInput);

    const email = (userRecord.email || "").toLowerCase();
    if (!email) {
        throw new HttpsError("failed-precondition", "Target user has no email.");
    }

    const resetLink = await admin.auth().generatePasswordResetLink(email);
    await writeAdminAudit("generate-password-reset-link", auth!.uid, userRecord.uid, { email });

    return {
        uid: userRecord.uid,
        email,
        resetLink,
    };
});

export const recordUserActivity = onCall({ cors: true }, async (request) => {
    const auth = request.auth;
    if (!auth?.uid) {
        throw new HttpsError("unauthenticated", "Not signed in.");
    }

    const type = String(request.data?.type || "").trim().toLowerCase();
    const route = String(request.data?.route || "").trim();
    const metadata = request.data?.metadata;

    if (!type) {
        throw new HttpsError("invalid-argument", "type is required.");
    }

    const userDoc = await db.collection("users").doc(auth.uid).get();
    const userData = userDoc.exists ? (userDoc.data() as any) : {};

    await db.collection("userActivity").add({
        uid: auth.uid,
        email: userData?.email || auth.token?.email || null,
        role: userData?.role || null,
        type,
        ...(route ? { route } : {}),
        ...(metadata && typeof metadata === "object" ? { metadata } : {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const patch: Record<string, any> = {
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (type === "login") {
        patch.lastLoginAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await db.collection("users").doc(auth.uid).set(patch, { merge: true });

    return { ok: true };
});

export const listUserActivity = onCall({ cors: true }, async (request) => {
    const auth = request.auth;
    await requireAdmin(auth?.uid);

    const uid = String(request.data?.uid || "").trim();
    const limitRaw = Number(request.data?.limit || 40);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 40;

    let querySnap: admin.firestore.QuerySnapshot;
    if (uid) {
        querySnap = await db.collection("userActivity").where("uid", "==", uid).limit(limit).get();
    } else {
        querySnap = await db.collection("userActivity").limit(limit).get();
    }

    const docs = querySnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    return docs.slice(0, limit).map((d: any) => ({
        id: d.id,
        uid: d.uid || null,
        email: d.email || null,
        role: d.role || null,
        type: d.type || null,
        route: d.route || null,
        metadata: d.metadata || null,
        createdAt: d.createdAt || null,
    }));
});

// HTTP endpoints with CORS for cross-origin browser fetches
import { onRequest } from "firebase-functions/v2/https";

function setCors(res: any, reqOrigin?: string) {
    // In dev allow localhost, in prod you may restrict
    const origin = reqOrigin || "*";
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    // Allow credentials in case client sends Authorization header with credentials
    res.set("Access-Control-Allow-Credentials", "true");
    // Ensure proxies vary by origin so caches treat origins separately
    res.set("Vary", "Origin");
}

export const listDoctorsHttp = onRequest(async (req, res) => {
    console.log("listDoctorsHttp", req.method, "origin=", req.headers.origin);
    setCors(res, req.headers.origin as string | undefined);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const snap = await db.collection("users").where("role", "==", "doctor").get();
        let docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (docs.length === 0) {
            const all = await db.collection("users").get();
            docs = all.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
        const result = docs.map((d) => ({ id: d.id, name: d.name || d.displayName || d.email || null, role: (d as any).role || null }));
        res.json(result);
        return;
    } catch (err) {
        console.error("listDoctorsHttp error:", err);
        res.status(500).json({ error: "internal" });
        return;
    }
});

export const listPatientsForDoctorHttp = onRequest(async (req, res) => {
    console.log("listPatientsForDoctorHttp", req.method, "origin=", req.headers.origin);
    setCors(res, req.headers.origin as string | undefined);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const authHeader = (req.headers.authorization || "").split("Bearer ")[1];
        if (!authHeader) {
            res.status(401).json({ error: "unauthenticated" });
            return;
        }
        const decoded = await admin.auth().verifyIdToken(authHeader);
        const callerId = decoded.uid;
        const callerDoc = await db.collection("users").doc(callerId).get();
        const callerRole = callerDoc.exists ? (callerDoc.data() as any).role : null;
        if (callerRole !== "doctor" && callerRole !== "admin") {
            res.status(403).json({ error: "permission-denied" });
            return;
        }

        const doctorId = String(req.body?.doctorId || callerId);

        const allSnap = await db.collection("users").get();
        const all = allSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

        const isPatientCandidate = (u: any) => (u.role ? u.role === "patient" : true);

        const assigned = all.filter((p: any) => {
            if (!isPatientCandidate(p)) return false;
            if (p.assignedDoctorId) return p.assignedDoctorId === doctorId;
            if (p.doctorId) return p.doctorId === doctorId;
            if (Array.isArray(p.assignedDoctors)) return p.assignedDoctors.includes(doctorId);
            return false;
        });

        const result = assigned.length > 0 ? assigned : all.filter(isPatientCandidate);

        res.json(result.map((d) => ({ id: d.id, name: d.name || d.displayName || d.email || null, role: (d as any).role || null })));
        return;
    } catch (err) {
        console.error("listPatientsForDoctorHttp error:", err);
        res.status(500).json({ error: "internal" });
        return;
    }
});

export const listUserActivityHttp = onRequest(async (req, res) => {
    console.log("listUserActivityHttp", req.method, "origin=", req.headers.origin);
    setCors(res, req.headers.origin as string | undefined);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const authHeader = (req.headers.authorization || "").split("Bearer ")[1];
        if (!authHeader) {
            res.status(401).json({ error: "unauthenticated" });
            return;
        }

        const decoded = await admin.auth().verifyIdToken(authHeader);
        const callerId = decoded.uid;
        const callerDoc = await db.collection("users").doc(callerId).get();
        const callerRole = callerDoc.exists ? (callerDoc.data() as any).role : null;
        if (callerRole !== "admin") {
            res.status(403).json({ error: "permission-denied" });
            return;
        }

        const body = req.method === "GET" ? req.query : req.body;
        const uid = String(body?.uid || "").trim();
        const limitRaw = Number(body?.limit || 40);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 40;

        let querySnap: admin.firestore.QuerySnapshot;
        if (uid) {
            querySnap = await db.collection("userActivity").where("uid", "==", uid).limit(limit).get();
        } else {
            querySnap = await db.collection("userActivity").limit(limit).get();
        }

        const docs = querySnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, limit)
            .map((d: any) => ({
                id: d.id,
                uid: d.uid || null,
                email: d.email || null,
                role: d.role || null,
                type: d.type || null,
                route: d.route || null,
                metadata: d.metadata || null,
                createdAt: d.createdAt || null,
            }));

        res.json(docs);
        return;
    } catch (err) {
        console.error("listUserActivityHttp error:", err);
        res.status(500).json({ error: "internal" });
        return;
    }
});

/* =========================
   RESET PASSWORD (FORGOT PASSWORD FLOW)
========================= */

export const resetPassword = onCall({ cors: true }, async (request) => {
    await requireAdmin(request.auth?.uid);

    const email = String(request.data?.email || "").trim().toLowerCase();
    const newPassword = String(request.data?.newPassword || "").trim();

    if (!email) {
        throw new HttpsError("invalid-argument", "Email is required.");
    }

    if (!newPassword || newPassword.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }

    try {
        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);

        // Update password using Admin SDK (no current password needed!)
        await admin.auth().updateUser(userRecord.uid, {
            password: newPassword,
        });

        return {
            success: true,
            message: "Password updated successfully",
        };
    } catch (error: any) {
        console.error("resetPassword error:", error);

        if (error.code === "auth/user-not-found") {
            throw new HttpsError("not-found", "No user found with this email.");
        }

        throw new HttpsError("internal", "Failed to reset password.");
    }
});

/* =========================
   CHAT ATTACHMENT UPLOAD (CORS-SAFE)
========================= */

export const uploadChatAttachment = onCall({ cors: true }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Not signed in.");
    }

    const senderId = request.auth.uid;
    const chatId = String(request.data?.chatId || "").trim();
    const fileName = String(request.data?.fileName || "").trim();
    const contentType = String(request.data?.contentType || "").trim().toLowerCase();
    const dataBase64Raw = String(request.data?.dataBase64 || "").trim();

    if (!chatId || !fileName || !contentType || !dataBase64Raw) {
        throw new HttpsError("invalid-argument", "chatId, fileName, contentType and dataBase64 are required.");
    }

    const isImage = contentType.startsWith("image/");
    const isPdf = contentType === "application/pdf";
    if (!isImage && !isPdf) {
        throw new HttpsError("invalid-argument", "Only image and PDF uploads are supported.");
    }

    const base64 = dataBase64Raw.includes(",") ? dataBase64Raw.split(",")[1] : dataBase64Raw;
    if (!base64) {
        throw new HttpsError("invalid-argument", "Invalid file data.");
    }

    const buffer = Buffer.from(base64, "base64");
    const maxBytes = 8 * 1024 * 1024;
    if (buffer.length > maxBytes) {
        throw new HttpsError("invalid-argument", "File too large. Max size is 8MB.");
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `chatAttachments/${chatId}/${senderId}/${Date.now()}_${safeName}`;

    try {
        const bucket = admin.storage().bucket();
        const token = crypto.randomUUID();
        const file = bucket.file(objectPath);

        await file.save(buffer, {
            resumable: false,
            metadata: {
                contentType,
                metadata: {
                    firebaseStorageDownloadTokens: token,
                },
            },
        });

        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;

        return {
            name: fileName,
            url,
            contentType,
            size: buffer.length,
            kind: isImage ? "image" : "pdf",
        };
    } catch (error) {
        console.error("uploadChatAttachment error:", error);
        throw new HttpsError("internal", "Failed to upload attachment.");
    }
});
