// src/components/OtpModal.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

import { auth } from "@/firebase";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
} from "firebase/auth";

type UserRole = "patient" | "doctor" | "caregiver" | "admin";

type PendingSignup = {
    email: string;
    password: string;
    role: UserRole;
    otp: string;
    expiresAt: number;
};

const PENDING_SIGNUP_KEY = "echocare_pending_signup";

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccessRoute: string | null;
};

export default function OtpModal({ open, onClose, onSuccessRoute }: Props) {
    const [otpInput, setOtpInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
        if (!raw) {
            toast.error("No pending signup found. Please try again.");
            onClose();
            return;
        }

        const pending: PendingSignup = JSON.parse(raw);
        const now = Date.now();

        if (now > pending.expiresAt) {
            localStorage.removeItem(PENDING_SIGNUP_KEY);
            toast.error("Code expired. Please sign up again.");
            onClose();
            return;
        }

        if (otpInput.trim() !== pending.otp) {
            toast.error("Invalid code. Please double-check and try again.");
            return;
        }

        try {
            setIsSubmitting(true);

            // 1) Create the Firebase user
            const cred = await createUserWithEmailAndPassword(
                auth,
                pending.email,
                pending.password
            );

            // 2) Store role in displayName
            await updateProfile(cred.user, {
                displayName: pending.role,
            });

            // 3) Immediately sign in
            await signInWithEmailAndPassword(auth, pending.email, pending.password);

            toast.success("Account created and verified!");

            localStorage.removeItem(PENDING_SIGNUP_KEY);
            setOtpInput("");
            onClose();

            // Route decision is handled by Auth via onSuccessRoute (already navigated there)
            // or you can navigate here if you prefer.
            if (onSuccessRoute) {
                window.location.href = onSuccessRoute;
            }
        } catch (err: any) {
            console.error("OTP verify/signup error:", err);
            toast.error("Could not complete signup. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                    >
                        <Card className="w-[360px] sm:w-[420px]">
                            <CardHeader>
                                <CardTitle className="text-xl">Verify your email</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    We’ve sent a 6-digit code to your email. Enter it below to
                                    complete your registration.
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
                                        onChange={(e) =>
                                            setOtpInput(e.target.value.replace(/\D/g, ""))
                                        }
                                        className="tracking-[0.4em] text-center text-lg"
                                    />
                                </div>

                                <div className="flex gap-2 justify-end mt-4">
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || otpInput.length !== 6}
                                    >
                                        {isSubmitting ? "Verifying..." : "Verify & Continue"}
                                    </Button>
                                </div>

                                <p className="text-[11px] text-muted-foreground text-center mt-2">
                                    This code expires in 10 minutes for your security.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
