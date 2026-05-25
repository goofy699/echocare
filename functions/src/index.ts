import * as admin from "firebase-admin";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import {
    getFirestore,
    FieldValue,
    Timestamp,
    QuerySnapshot,
} from "firebase-admin/firestore";
import * as crypto from "crypto";
import nodemailer from "nodemailer";

admin.initializeApp();
const db = getFirestore();

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
    if (!uid) {
        throw new HttpsError("unauthenticated", "Not signed in.");
    }

    const callerDoc = await db.collection("users").doc(uid).get();
    const callerRole = callerDoc.exists ? (callerDoc.data() as any).role : null;

    if (callerRole !== "admin") {
        throw new HttpsError("permission-denied", "Admin access required.");
    }
}

async function writeAdminAudit(
    action: string,
    adminUid: string,
    targetUid: string,
    details?: Record<string, any>
) {
    await db.collection("adminActivity").add({
        action,
        adminUid,
        targetUid,
        ...(details ? { details } : {}),
        createdAt: FieldValue.serverTimestamp(),
    });
}

function setCors(res: any, reqOrigin?: string) {
    const origin = reqOrigin || "*";

    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Vary", "Origin");
}

/* =========================
   Email Transport
========================= */

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;

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

    const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);

    const ref = db.collection("otpRequests").doc();

    await ref.set({
        email,
        role,
        otpHash,
        expiresAt,
        used: false,
        attempts: 0,
        createdAt: FieldValue.serverTimestamp(),
    });

    await transporter.sendMail({
        from: `EchoCare <${MAIL_USER || "no-reply@echocare.local"}>`,
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
            attempts: FieldValue.increment(1),
        });

        throw new HttpsError("unauthenticated", "Invalid OTP.");
    }

    await ref.update({
        used: true,
        verifiedAt: FieldValue.serverTimestamp(),
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

        console.error("verifyOtpAndCreateUser createUser error:", err);
        throw new HttpsError("internal", "Failed to create user.");
    }

    await db.collection("users").doc(user.uid).set({
        email,
        role: data.role,
        createdAt: FieldValue.serverTimestamp(),
    });

    return {
        uid: user.uid,
        role: data.role,
    };
});

/* =========================
   Admin helpers to list users
========================= */

export const listDoctors = onCall({ cors: true }, async (request) => {
    const auth = request.auth;

    if (!auth) {
        throw new HttpsError("unauthenticated", "Not signed in.");
    }

    const snap = await db.collection("users").where("role", "==", "doctor").get();

    let docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
    }));

    if (docs.length === 0) {
        const all = await db.collection("users").get();

        docs = all.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
        }));
    }

    return docs.map((d: any) => ({
        id: d.id,
        name: d.name || d.displayName || d.email || null,
        role: d.role || null,
    }));
});

export const listPatientsForDoctor = onCall({ cors: true }, async (request) => {
    const auth = request.auth;

    if (!auth) {
        throw new HttpsError("unauthenticated", "Not signed in.");
    }

    const callerId = auth.uid;

    const callerDoc = await db.collection("users").doc(callerId).get();
    const callerRole = callerDoc.exists ? (callerDoc.data() as any).role : null;

    if (callerRole !== "doctor" && callerRole !== "admin") {
        throw new HttpsError("permission-denied", "Not authorized to list patients.");
    }

    let doctorId = String(request.data?.doctorId || "");

    if (!doctorId) {
        if (callerRole === "doctor") {
            doctorId = callerId;
        } else {
            throw new HttpsError(
                "invalid-argument",
                "doctorId is required for non-doctor callers."
            );
        }
    }

    const allSnap = await db.collection("users").get();

    const all = allSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
    }));

    const isPatientCandidate = (u: any) => (u.role ? u.role === "patient" : true);

    const assigned = all.filter((p: any) => {
        if (!isPatientCandidate(p)) return false;
        if (p.assignedDoctorId) return p.assignedDoctorId === doctorId;
        if (p.doctorId) return p.doctorId === doctorId;
        if (Array.isArray(p.assignedDoctors)) return p.assignedDoctors.includes(doctorId);
        return false;
    });

    const result = assigned.length > 0 ? assigned : all.filter(isPatientCandidate);

    return result.map((d: any) => ({
        id: d.id,
        name: d.name || d.displayName || d.email || null,
        role: d.role || null,
    }));
});

/* =========================
   ADMIN CREATE USER - CALLABLE
========================= */

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
        throw new HttpsError(
            "invalid-argument",
            "Password must be at least 6 characters."
        );
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

        console.error("adminCreateUser createUser error:", error);
        throw new HttpsError("internal", "Failed to create auth user.");
    }

    await db.collection("users").doc(user.uid).set(
        {
            email,
            role,
            ...(name ? { name } : {}),
            suspended: false,
            createdBy: adminUid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    await writeAdminAudit("create-user", adminUid!, user.uid, {
        email,
        role,
    });

    return {
        uid: user.uid,
        email,
        role,
    };
});

/* =========================
   ADMIN CREATE USER - HTTP
========================= */

export const adminCreateUserHttp = onRequest(async (req, res) => {
    console.log("adminCreateUserHttp called:", req.method, "origin=", req.headers.origin);

    setCors(res, req.headers.origin as string | undefined);

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed." });
        return;
    }

    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.replace("Bearer ", "")
            : "";

        if (!token) {
            res.status(401).json({ error: "Not signed in. Missing token." });
            return;
        }

        const decoded = await admin.auth().verifyIdToken(token);
        const adminUid = decoded.uid;

        const callerDoc = await db.collection("users").doc(adminUid).get();
        const callerData = callerDoc.exists ? callerDoc.data() : null;
        const callerRole = callerData?.role;

        console.log("Caller admin check:", {
            uid: adminUid,
            email: decoded.email,
            role: callerRole,
        });

        if (callerRole !== "admin") {
            res.status(403).json({
                error: `Admin access required. Current role is: ${callerRole || "missing"}`,
            });
            return;
        }

        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "").trim();
        const role = String(req.body?.role || "").trim().toLowerCase();
        const name = String(req.body?.name || "").trim();

        if (!email) {
            res.status(400).json({ error: "Email is required." });
            return;
        }

        if (!password || password.length < 6) {
            res.status(400).json({ error: "Password must be at least 6 characters." });
            return;
        }

        if (!["patient", "doctor", "caregiver", "admin"].includes(role)) {
            res.status(400).json({ error: "Invalid role." });
            return;
        }

        let user: admin.auth.UserRecord;

        try {
            user = await admin.auth().createUser({
                email,
                password,
                emailVerified: true,
                displayName: name || undefined,
            });
        } catch (error: any) {
            console.error("adminCreateUserHttp createUser error:", error);

            if (error?.code === "auth/email-already-exists") {
                res.status(409).json({ error: "Email already exists." });
                return;
            }

            res.status(500).json({
                error: error?.message || "Failed to create Firebase Auth user.",
                code: error?.code || null,
            });
            return;
        }

        await db.collection("users").doc(user.uid).set(
            {
                email,
                role,
                ...(name ? { name } : {}),
                suspended: false,
                createdBy: adminUid,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        await writeAdminAudit("create-user", adminUid, user.uid, {
            email,
            role,
        });

        res.status(200).json({
            uid: user.uid,
            email,
            role,
        });
        return;
    } catch (error: any) {
        console.error("adminCreateUserHttp full error:", error);

        res.status(500).json({
            error: error?.message || "Internal server error.",
            code: error?.code || null,
        });
        return;
    }
});

/* =========================
   ADMIN USER CONTROLS
========================= */

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
        throw new HttpsError(
            "failed-precondition",
            "You cannot suspend your own account."
        );
    }

    await admin.auth().updateUser(targetUid, {
        disabled: suspended,
    });

    await db.collection("users").doc(targetUid).set(
        {
            suspended,
            ...(reason ? { suspendedReason: reason } : {}),
            suspendedBy: auth?.uid,
            ...(suspended
                ? { suspendedAt: FieldValue.serverTimestamp() }
                : { unsuspendedAt: FieldValue.serverTimestamp() }),
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    await writeAdminAudit(
        suspended ? "suspend-user" : "unsuspend-user",
        auth!.uid,
        targetUid,
        {
            ...(reason ? { reason } : {}),
        }
    );

    return {
        uid: targetUid,
        suspended,
    };
});

export const adminDeleteUser = onCall({ cors: true }, async (request) => {
    const auth = request.auth;

    await requireAdmin(auth?.uid);

    const targetUid = String(request.data?.uid || "").trim();

    if (!targetUid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }

    if (auth?.uid === targetUid) {
        throw new HttpsError(
            "failed-precondition",
            "You cannot delete your own account."
        );
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

    await writeAdminAudit("delete-user", auth!.uid, targetUid, {
        ...(targetEmail ? { email: targetEmail } : {}),
    });

    return {
        uid: targetUid,
        deleted: true,
    };
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
        throw new HttpsError(
            "invalid-argument",
            "Password must be at least 6 characters."
        );
    }

    await admin.auth().updateUser(targetUid, {
        password: newPassword,
    });

    await db.collection("users").doc(targetUid).set(
        {
            passwordUpdatedAt: FieldValue.serverTimestamp(),
            passwordUpdatedBy: auth?.uid,
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    await writeAdminAudit("set-user-password", auth!.uid, targetUid);

    return {
        uid: targetUid,
        passwordUpdated: true,
    };
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

    if (uid) {
        userRecord = await admin.auth().getUser(uid);
    } else {
        userRecord = await admin.auth().getUserByEmail(emailInput);
    }

    const email = (userRecord.email || "").toLowerCase();

    if (!email) {
        throw new HttpsError("failed-precondition", "Target user has no email.");
    }

    const resetLink = await admin.auth().generatePasswordResetLink(email);

    await writeAdminAudit("generate-password-reset-link", auth!.uid, userRecord.uid, {
        email,
    });

    return {
        uid: userRecord.uid,
        email,
        resetLink,
    };
});

/* =========================
   USER ACTIVITY
========================= */

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
        createdAt: FieldValue.serverTimestamp(),
    });

    const patch: Record<string, any> = {
        lastActiveAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (type === "login") {
        patch.lastLoginAt = FieldValue.serverTimestamp();
    }

    await db.collection("users").doc(auth.uid).set(patch, {
        merge: true,
    });

    return {
        ok: true,
    };
});

export const listUserActivity = onCall({ cors: true }, async (request) => {
    const auth = request.auth;

    await requireAdmin(auth?.uid);

    const uid = String(request.data?.uid || "").trim();
    const limitRaw = Number(request.data?.limit || 40);
    const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 200)
        : 40;

    let querySnap: QuerySnapshot;

    if (uid) {
        querySnap = await db
            .collection("userActivity")
            .where("uid", "==", uid)
            .limit(limit)
            .get();
    } else {
        querySnap = await db.collection("userActivity").limit(limit).get();
    }

    const docs = querySnap.docs
        .map((d) => ({
            id: d.id,
            ...(d.data() as any),
        }))
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

/* =========================
   HTTP ENDPOINTS
========================= */

export const listDoctorsHttp = onRequest(async (req, res) => {
    console.log("listDoctorsHttp", req.method, "origin=", req.headers.origin);

    setCors(res, req.headers.origin as string | undefined);

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const snap = await db.collection("users").where("role", "==", "doctor").get();

        let docs = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
        }));

        if (docs.length === 0) {
            const all = await db.collection("users").get();

            docs = all.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
            }));
        }

        const result = docs.map((d: any) => ({
            id: d.id,
            name: d.name || d.displayName || d.email || null,
            role: d.role || null,
        }));

        res.status(200).json(result);
        return;
    } catch (err: any) {
        console.error("listDoctorsHttp error:", err);

        res.status(500).json({
            error: err?.message || "internal",
            code: err?.code || null,
        });
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
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.replace("Bearer ", "")
            : "";

        if (!token) {
            res.status(401).json({ error: "unauthenticated" });
            return;
        }

        const decoded = await admin.auth().verifyIdToken(token);
        const callerId = decoded.uid;

        const callerDoc = await db.collection("users").doc(callerId).get();
        const callerRole = callerDoc.exists ? (callerDoc.data() as any).role : null;

        if (callerRole !== "doctor" && callerRole !== "admin") {
            res.status(403).json({ error: "permission-denied" });
            return;
        }

        const doctorId = String(req.body?.doctorId || callerId);

        const allSnap = await db.collection("users").get();

        const all = allSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
        }));

        const isPatientCandidate = (u: any) => (u.role ? u.role === "patient" : true);

        const assigned = all.filter((p: any) => {
            if (!isPatientCandidate(p)) return false;
            if (p.assignedDoctorId) return p.assignedDoctorId === doctorId;
            if (p.doctorId) return p.doctorId === doctorId;
            if (Array.isArray(p.assignedDoctors)) return p.assignedDoctors.includes(doctorId);
            return false;
        });

        const result = assigned.length > 0 ? assigned : all.filter(isPatientCandidate);

        res.status(200).json(
            result.map((d: any) => ({
                id: d.id,
                name: d.name || d.displayName || d.email || null,
                role: d.role || null,
            }))
        );
        return;
    } catch (err: any) {
        console.error("listPatientsForDoctorHttp error:", err);

        res.status(500).json({
            error: err?.message || "internal",
            code: err?.code || null,
        });
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
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.replace("Bearer ", "")
            : "";

        if (!token) {
            res.status(401).json({ error: "unauthenticated" });
            return;
        }

        const decoded = await admin.auth().verifyIdToken(token);
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
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 200)
            : 40;

        let querySnap: QuerySnapshot;

        if (uid) {
            querySnap = await db
                .collection("userActivity")
                .where("uid", "==", uid)
                .limit(limit)
                .get();
        } else {
            querySnap = await db.collection("userActivity").limit(limit).get();
        }

        const docs = querySnap.docs
            .map((d) => ({
                id: d.id,
                ...(d.data() as any),
            }))
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

        res.status(200).json(docs);
        return;
    } catch (err: any) {
        console.error("listUserActivityHttp error:", err);

        res.status(500).json({
            error: err?.message || "internal",
            code: err?.code || null,
        });
        return;
    }
});

/* =========================
   RESET PASSWORD
========================= */

export const resetPassword = onCall({ cors: true }, async (request) => {
    await requireAdmin(request.auth?.uid);

    const email = String(request.data?.email || "").trim().toLowerCase();
    const newPassword = String(request.data?.newPassword || "").trim();

    if (!email) {
        throw new HttpsError("invalid-argument", "Email is required.");
    }

    if (!newPassword || newPassword.length < 6) {
        throw new HttpsError(
            "invalid-argument",
            "Password must be at least 6 characters."
        );
    }

    try {
        const userRecord = await admin.auth().getUserByEmail(email);

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
   CHAT ATTACHMENT UPLOAD
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
        throw new HttpsError(
            "invalid-argument",
            "chatId, fileName, contentType and dataBase64 are required."
        );
    }

    const isImage = contentType.startsWith("image/");
    const isPdf = contentType === "application/pdf";

    if (!isImage && !isPdf) {
        throw new HttpsError(
            "invalid-argument",
            "Only image and PDF uploads are supported."
        );
    }

    const base64 = dataBase64Raw.includes(",")
        ? dataBase64Raw.split(",")[1]
        : dataBase64Raw;

    if (!base64) {
        throw new HttpsError("invalid-argument", "Invalid file data.");
    }

    const buffer = Buffer.from(base64, "base64");
    const maxBytes = 8 * 1024 * 1024;

    if (buffer.length > maxBytes) {
        throw new HttpsError("invalid-argument", "File too large. Max size is 8MB.");
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `chatAttachments/${chatId}/${senderId}/${Date.now()}_${safeFileName}`;

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

        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
            objectPath
        )}?alt=media&token=${token}`;

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
/* =========================
   GEMINI AI CHATBOT
========================= */

export const askGeminiChat = onCall({ cors: true }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Please sign in first.");
    }

    const uid = request.auth.uid;
    const message = String(request.data?.message || "").trim();
    const history = Array.isArray(request.data?.history) ? request.data.history : [];

    if (!message) {
        throw new HttpsError("invalid-argument", "Message is required.");
    }

    if (message.length > 2000) {
        throw new HttpsError("invalid-argument", "Message is too long.");
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("GEMINI_API_KEY is missing.");
        throw new HttpsError("failed-precondition", "Gemini API key is not configured.");
    }

    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const role = userData?.role || "user";
    const name = userData?.name || userData?.displayName || userData?.email || "User";

    const safeHistory = history
        .slice(-8)
        .map((item: any) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [
                {
                    text: String(item.content || "").slice(0, 1000),
                },
            ],
        }))
        .filter((item: any) => item.parts[0].text.trim().length > 0);

    const systemInstruction = `
You are EchoCare AI Assistant inside a health support web application for Alzheimer’s/dementia care and patient support.

User profile:
- Name: ${name}
- Role: ${role}

Scope:
You must only help with:
- Alzheimer’s and dementia support
- Memory care and daily routine guidance
- Medication reminder guidance
- Appointment preparation and follow-up support
- SOS/emergency safety guidance
- Mental wellbeing and caregiver support
- EchoCare app usage such as reminders, appointments, SOS, messages, reports, and care team features

Out-of-scope rule:
If the user asks about unrelated topics such as sports, movies, politics, coding, games, entertainment, random facts, or anything not related to EchoCare/health/care support, politely refuse and redirect them back to EchoCare health support.

Medical safety rules:
- Never claim to be a doctor.
- Never diagnose illness.
- Never prescribe medicine or change dosage.
- Never tell a patient to stop or start medication.
- For emergency symptoms such as chest pain, breathing difficulty, fainting, severe bleeding, stroke signs, overdose, self-harm, or immediate danger, tell the user to contact emergency services immediately and use EchoCare SOS/contact caregiver or doctor.
- For medication, advise following the doctor’s prescription and contacting doctor/caregiver if unsure.

Style:
- Be short, calm, simple, and supportive.
- Use clear patient-friendly language.
- For Alzheimer’s/dementia users, keep answers easy to understand.
- Give step-by-step help when useful.
`;

    const contents = [
        ...safeHistory,
        {
            role: "user",
            parts: [
                {
                    text: message,
                },
            ],
        },
    ];

    try {
        const requestBody = {
            systemInstruction: {
                parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig: {
                temperature: 0.5,
                topP: 0.9,
                maxOutputTokens: 700,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
        };

        const modelNames = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-flash-latest",
        ];

        let data: any = null;
        let lastErrorMessage = "Gemini API request failed.";

        for (const modelName of modelNames) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            data = await response.json();

            if (response.ok) {
                console.log(`Gemini response generated using model: ${modelName}`);

                const reply =
                    data?.candidates?.[0]?.content?.parts
                        ?.map((part: any) => part.text || "")
                        .join("")
                        .trim() ||
                    "Sorry, I could not generate a response. Please try again.";

                await db.collection("aiChatLogs").add({
                    uid,
                    role,
                    message,
                    reply,
                    modelName,
                    createdAt: FieldValue.serverTimestamp(),
                });

                return {
                    reply,
                };
            }

            lastErrorMessage = data?.error?.message || lastErrorMessage;
            console.error(`Gemini API error using ${modelName}:`, data);

            const isTemporaryBusy =
                response.status === 429 ||
                response.status === 500 ||
                response.status === 503 ||
                String(lastErrorMessage).toLowerCase().includes("high demand") ||
                String(lastErrorMessage).toLowerCase().includes("overloaded");

            if (!isTemporaryBusy) {
                break;
            }
        }

        throw new HttpsError(
            "internal",
            lastErrorMessage || "Gemini is busy right now. Please try again."
        );
    } catch (error: any) {
        console.error("askGeminiChat error:", error);

        if (error instanceof HttpsError) {
            throw error;
        }

        throw new HttpsError(
            "internal",
            error?.message || "Failed to contact Gemini."
        );
    }
});