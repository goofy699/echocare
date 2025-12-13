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

if (!MAIL_USER || !MAIL_PASS) {
    throw new Error("MAIL_USER or MAIL_PASS not set in environment variables");
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
    },
});

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
