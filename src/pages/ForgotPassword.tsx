// src/pages/ForgotPassword.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { sendPasswordResetEmail as sendResetEmail } from "@/lib/email";
import { auth } from "@/firebase";

type PendingReset = {
    email: string;
    code: string;
    expiresAt: number;
};

const PENDING_RESET_KEY = "echocare_pending_reset";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error("Please enter your email address");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        try {
            // Generate a 6-digit reset code
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

            // Send email with reset code using EmailJS
            const emailSent = await sendResetEmail(email, resetCode);

            if (!emailSent) {
                toast.error("Failed to send reset email. Please try again.");
                setIsLoading(false);
                return;
            }

            // Store reset info in localStorage
            const pending: PendingReset = {
                email,
                code: resetCode,
                expiresAt,
            };

            localStorage.setItem(PENDING_RESET_KEY, JSON.stringify(pending));

            setEmailSent(true);
            toast.success("Password reset code sent! Check your email.");
        } catch (err: any) {
            console.error("❌ Reset password error:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        const raw = localStorage.getItem(PENDING_RESET_KEY);
        if (!raw) {
            toast.error("Reset session expired. Please request a new code.");
            setEmailSent(false);
            return;
        }

        try {
            const pending: PendingReset = JSON.parse(raw);

            // Check if expired
            if (Date.now() > pending.expiresAt) {
                toast.error("Reset code has expired. Please request a new one.");
                localStorage.removeItem(PENDING_RESET_KEY);
                setEmailSent(false);
                return;
            }

            // Verify the code
            if (otp !== pending.code) {
                toast.error("Invalid code. Please check your email and try again.");
                return;
            }

            toast.success("Code verified! Redirecting to reset password...");
            // Navigate to reset password page
            setTimeout(() => {
                navigate("/reset-password");
            }, 1000);
        } catch {
            toast.error("Invalid reset data. Please try again.");
            setEmailSent(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-teal-50">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

            <div className="w-full max-w-md space-y-6">
                <div className="flex justify-center">
                    <Logo />
                </div>

                <Card className="shadow-lg border-slate-200">
                    <CardHeader className="space-y-3 text-center">
                        {emailSent ? (
                            <>
                                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <KeyRound className="w-8 h-8 text-blue-600" />
                                </div>
                                <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
                                <CardDescription className="text-base">
                                    We've sent a 6-digit code to <strong>{email}</strong>
                                </CardDescription>
                            </>
                        ) : (
                            <>
                                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Mail className="w-8 h-8 text-blue-600" />
                                </div>
                                <CardTitle className="text-2xl">Forgot Password?</CardTitle>
                                <CardDescription className="text-base">
                                    No worries! Enter your email and we'll send you a reset code.
                                </CardDescription>
                            </>
                        )}
                    </CardHeader>

                    <CardContent>
                        {emailSent ? (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="otp">Verification Code</Label>
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="Enter 6-digit code"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        maxLength={6}
                                        className="text-center text-2xl tracking-widest font-semibold"
                                        autoFocus
                                    />
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                    <p className="font-medium mb-2">Check your email:</p>
                                    <p>A 6-digit verification code has been sent to your email address. Enter the code above to proceed with password reset.</p>
                                    <p className="mt-2 text-xs text-blue-600">Code expires in 15 minutes</p>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={otp.length !== 6}
                                >
                                    Verify Code
                                </Button>

                                <div className="text-center text-sm text-slate-600">
                                    Didn't receive the code?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmailSent(false);
                                            setOtp("");
                                            localStorage.removeItem(PENDING_RESET_KEY);
                                        }}
                                        className="text-blue-600 hover:underline font-medium"
                                    >
                                        Resend code
                                    </button>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => navigate("/auth")}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Sign In
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading || !email}
                                >
                                    {isLoading ? "Sending..." : "Send Reset Code"}
                                </Button>

                                <div className="text-center">
                                    <Link
                                        to="/auth"
                                        className="text-sm text-blue-600 hover:underline inline-flex items-center"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Back to Sign In
                                    </Link>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
//hi checking my git //