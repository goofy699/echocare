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

export const sendOtp = onCall(async (request) => {
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

export const verifyOtpAndCreateUser = onCall(async (request) => {
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

export const listDoctors = onCall(async (request) => {
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

export const listPatientsForDoctor = onCall(async (request) => {
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
