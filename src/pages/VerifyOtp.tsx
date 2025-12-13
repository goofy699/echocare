// src/pages/VerifyOtp.tsx
import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

import { auth, db } from "@/firebase";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
} from "firebase/auth";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { PENDING_SIGNUP_KEY } from "./Auth";

type UserRole = "patient" | "doctor" | "caregiver" | "admin";

const ROLE_ROUTES: Record<UserRole, string> = {
    patient: "/patient",
    doctor: "/doctor",
    caregiver: "/caregiver",
    admin: "/admin",
};

type PendingSignup = {
    email: string;
    password: string;
    role: UserRole;
    otp: string;
    expiresAt: number;
};

export default function VerifyOtp() {
    const navigate = useNavigate();
    const [otpInput, setOtpInput] = useState("");
    const [pending, setPending] = useState<PendingSignup | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
        if (!raw) {
            toast.error("No pending signup found. Please sign up again.");
            navigate("/auth");
            return;
        }
        try {
            const parsed: PendingSignup = JSON.parse(raw);
            setPending(parsed);
        } catch {
            localStorage.removeItem(PENDING_SIGNUP_KEY);
            toast.error("Invalid signup data. Please sign up again.");
            navigate("/auth");
        }
    }, [navigate]);

    const handleVerify = async () => {
        if (!pending) return;

        const now = Date.now();
        if (now > pending.expiresAt) {
            localStorage.removeItem(PENDING_SIGNUP_KEY);
            toast.error("Code expired. Please sign up again.");
            navigate("/auth");
            return;
        }

        if (otpInput.trim() !== pending.otp) {
            toast.error("Incorrect code. Please double-check and try again.");
            return;
        }

        try {
            setIsSubmitting(true);

            // 1) Create user
            const cred = await createUserWithEmailAndPassword(
                auth,
                pending.email,
                pending.password
            );

            // 2) ✅ Save role (also keep displayName for compatibility)
            await updateProfile(cred.user, { displayName: pending.role });

            // ✅ STORE ROLE IN FIRESTORE (REAL SOURCE OF TRUTH)
            await setDoc(doc(db, "users", cred.user.uid), {
                email: pending.email,
                role: pending.role,
                createdAt: serverTimestamp(),
            });

            // 3) Sign in user
            await signInWithEmailAndPassword(auth, pending.email, pending.password);

            toast.success("Account created and verified!");

            // 4) cleanup + redirect
            localStorage.removeItem(PENDING_SIGNUP_KEY);

            navigate(ROLE_ROUTES[pending.role], { replace: true });
        } catch (err) {
            console.error("OTP verify/signup error:", err);
            toast.error("Could not complete signup. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-6">
                    <Logo className="justify-center mb-4" />
                </div>

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="text-xl">Verify your email</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            We&apos;ve sent a 6-digit verification code to your email. Enter it
                            below to complete your registration.
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input
                                id="otp"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="123456"
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                                className="tracking-[0.4em] text-center text-lg"
                            />
                        </div>

                        <Button
                            className="w-full mt-2"
                            onClick={handleVerify}
                            disabled={isSubmitting || otpInput.length !== 6 || !pending}
                        >
                            {isSubmitting ? "Verifying..." : "Verify & Continue"}
                        </Button>

                        <p className="text-[11px] text-muted-foreground text-center mt-2">
                            This code expires in 10 minutes. If it expires, go back and sign up
                            again to receive a new code.
                        </p>

                        <Button
                            variant="ghost"
                            className="w-full mt-2"
                            type="button"
                            onClick={() => navigate("/auth")}
                            disabled={isSubmitting}
                        >
                            ← Back to sign in / sign up
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
