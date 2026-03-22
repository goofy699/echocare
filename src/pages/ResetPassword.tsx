import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle2, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { auth } from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

const PENDING_RESET_KEY = "echocare_pending_reset";

interface PendingReset {
    email: string;
    code: string;
    expiresAt: number;
}

export default function ResetPassword() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [linkSent, setLinkSent] = useState(false);

    useEffect(() => {
        const pendingData = localStorage.getItem(PENDING_RESET_KEY);
        if (!pendingData) {
            toast.error("No reset session found. Please start from forgot password page.");
            navigate("/forgot-password");
            return;
        }

        try {
            const parsed: PendingReset = JSON.parse(pendingData);
            if (Date.now() > parsed.expiresAt) {
                localStorage.removeItem(PENDING_RESET_KEY);
                toast.error("Reset session expired. Please try again.");
                navigate("/forgot-password");
                return;
            }
            setUserEmail(parsed.email);
        } catch {
            toast.error("Invalid session data.");
            navigate("/forgot-password");
        }
    }, [navigate]);

    const handleSendResetLink = async () => {
        if (!userEmail) {
            toast.error("Session error. Please try again.");
            navigate("/forgot-password");
            return;
        }

        setIsLoading(true);

        try {
            console.log("📧 Attempting to send password reset email to:", userEmail);

            // Send Firebase's password reset email with secure link
            await sendPasswordResetEmail(auth, userEmail);

            console.log("✅ Firebase password reset email sent successfully!");

            // Clear localStorage
            localStorage.removeItem(PENDING_RESET_KEY);

            // Show success
            setLinkSent(true);
            toast.success("Password reset link sent to your email!");
        } catch (error: any) {
            console.error("❌ Firebase password reset error:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);

            if (error.code === "auth/user-not-found") {
                toast.error("User not found. Please check your email.");
            } else if (error.code === "auth/invalid-email") {
                toast.error("Invalid email address.");
            } else if (error.code === "auth/too-many-requests") {
                toast.error("Too many requests. Please try again later.");
            } else {
                toast.error(error.message || "Failed to send reset link. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="flex justify-center">
                    <Logo />
                </div>

                <Card className="shadow-lg border-slate-200">
                    {linkSent ? (
                        <>
                            <CardHeader className="text-center space-y-3">
                                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <Mail className="w-8 h-8 text-green-600" />
                                </div>
                                <CardTitle className="text-2xl">Check Your Email</CardTitle>
                                <CardDescription className="text-base">
                                    Password reset link sent successfully
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                        <p className="font-medium mb-2">📧 Email Sent to {userEmail}</p>
                                        <p className="mb-3">
                                            We've sent you a secure link to reset your password. Click the link in the email to create a new password.
                                        </p>
                                        <p className="text-xs text-blue-600">
                                            The link will expire in 1 hour for security reasons.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
                                        <p className="font-medium mb-2">Didn't receive the email?</p>
                                        <ul className="space-y-1 list-disc list-inside">
                                            <li>Check your spam/junk folder</li>
                                            <li>Make sure you entered the correct email</li>
                                            <li>Wait a few minutes and check again</li>
                                        </ul>
                                    </div>

                                    <Button
                                        onClick={() => navigate("/auth")}
                                        className="w-full"
                                    >
                                        Back to Sign In
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <>
                            <CardHeader className="text-center space-y-3">
                                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Lock className="w-8 h-8 text-blue-600" />
                                </div>
                                <CardTitle className="text-2xl">Verification Complete</CardTitle>
                                <CardDescription className="text-base">
                                    {userEmail && (
                                        <>
                                            Ready to reset password for <strong>{userEmail}</strong>
                                        </>
                                    )}
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <div className="space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                                        <p className="font-medium mb-2">✅ Identity Verified</p>
                                        <p>
                                            Your email has been verified. Click the button below to receive a secure link to reset your password.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleSendResetLink}
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Sending Reset Link..." : "Send Password Reset Link"}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => navigate("/forgot-password")}
                                        disabled={isLoading}
                                    >
                                        Back to Forgot Password
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}