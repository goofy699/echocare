// src/pages/Auth.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  Activity,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Info,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { auth, db } from "@/firebase";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendOtpEmail } from "@/lib/email";

type UserRole = "patient" | "doctor" | "caregiver" | "admin";

type PatientSignupProfile = {
  age: string;
  gender: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  primaryConcern: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type PendingSignup = {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  patientProfile: {
    age?: number;
    gender?: string;
    bloodType?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
    primaryConcern?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  otp: string;
  expiresAt: number;
};

export const PENDING_SIGNUP_KEY = "echocare_pending_signup";

const ROLE_ROUTES: Record<UserRole, string> = {
  patient: "/patient",
  doctor: "/doctor",
  caregiver: "/caregiver",
  admin: "/admin",
};

function normalizeCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAuthMessage(err: any) {
  if (err?.code === "auth/email-already-in-use") return "This email is already in use.";
  if (err?.code === "auth/invalid-email") return "Please enter a valid email address.";
  if (err?.code === "auth/wrong-password") return "Incorrect password.";
  if (err?.code === "auth/invalid-credential") return "Invalid email or password.";
  if (err?.code === "auth/user-not-found") return "No account found with this email.";
  if (err?.code === "auth/weak-password") return "Password is too weak. Try a longer one.";
  return "Something went wrong. Please try again.";
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from as string | undefined;

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [patientProfile, setPatientProfile] = useState<PatientSignupProfile>({
    age: "",
    gender: "",
    bloodType: "",
    allergies: "",
    chronicConditions: "",
    currentMedications: "",
    primaryConcern: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const markSessionLoggedIn = () => {
    sessionStorage.setItem("echocare_logged_in", "1");
  };

  const resetSignupFields = () => {
    setName("");
    setPatientProfile({
      age: "",
      gender: "",
      bloodType: "",
      allergies: "",
      chronicConditions: "",
      currentMedications: "",
      primaryConcern: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    });
  };

  const handleSignin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      const userRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        toast.error("Your account profile was not found. Please contact admin.");
        await signOut(auth);
        sessionStorage.removeItem("echocare_logged_in");
        return;
      }

      const userData = snap.data() as any;
      const role = userData?.role as UserRole | undefined;
      const suspended = Boolean(userData?.suspended);
      const storedName = userData?.name || userData?.displayName;

      if (suspended) {
        toast.error("Your account is suspended. Please contact admin.");
        await signOut(auth);
        sessionStorage.removeItem("echocare_logged_in");
        return;
      }

      if (!role || !ROLE_ROUTES[role]) {
        toast.error("No valid role found for this account. Please contact admin.");
        await signOut(auth);
        sessionStorage.removeItem("echocare_logged_in");
        return;
      }

      markSessionLoggedIn();

      if (!storedName) {
        toast("Please complete your profile.");
        navigate("/complete-profile", { replace: true });
        return;
      }

      toast.success("Signed in successfully!");
      navigate(from || ROLE_ROUTES[role], { replace: true });
    } catch (err: any) {
      console.error("Signin error:", err);
      toast.error(getAuthMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSignup = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password.");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!patientProfile.age || Number.isNaN(Number(patientProfile.age))) {
      toast.error("Please provide a valid age.");
      return;
    }

    if (!patientProfile.bloodType.trim()) {
      toast.error("Please provide your blood group.");
      return;
    }

    setIsLoading(true);

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      await sendOtpEmail(email.trim(), otp);

      const pending: PendingSignup = {
        email: email.trim(),
        password,
        role: "patient",
        name: name.trim(),
        patientProfile: {
          age: Number(patientProfile.age) || undefined,
          gender: patientProfile.gender.trim() || undefined,
          bloodType: patientProfile.bloodType.trim() || undefined,
          allergies: normalizeCsv(patientProfile.allergies),
          chronicConditions: normalizeCsv(patientProfile.chronicConditions),
          currentMedications: normalizeCsv(patientProfile.currentMedications),
          primaryConcern: patientProfile.primaryConcern.trim() || undefined,
          emergencyContactName: patientProfile.emergencyContactName.trim() || undefined,
          emergencyContactPhone: patientProfile.emergencyContactPhone.trim() || undefined,
        },
        otp,
        expiresAt,
      };

      localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));
      toast.success("Verification code sent. Please check your email.");
      navigate("/verify-otp", { replace: true });
    } catch (err) {
      console.error("Patient signup OTP error:", err);
      toast.error("Could not send verification email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-300/25 rounded-full blur-3xl" />
        <div className="absolute top-40 -right-24 w-80 h-80 bg-emerald-300/25 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-sky-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="w-full px-4 sm:px-8 py-5 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/", { replace: true })}
            className="rounded-full bg-white/80 dark:bg-slate-900/80 border-cyan-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="hidden sm:block">
            <Logo />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="w-full max-w-6xl grid lg:grid-cols-[1fr_440px] gap-8 items-center">
            <section className="hidden lg:block">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 border border-cyan-100 shadow-sm mb-6">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Secure care access for every role
                  </span>
                </div>

                <h1 className="text-5xl font-bold tracking-tight text-slate-950 dark:text-white mb-5">
                  Welcome to{" "}
                  <span className="text-cyan-600">EchoCare</span>
                </h1>

                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                  One secure login for patients, doctors, caregivers, and admins.
                  Patients can create an account, while doctors and caregivers are
                  added by the admin for safer healthcare access.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border shadow-sm">
                    <HeartPulse className="w-7 h-7 text-cyan-600 mb-3" />
                    <h3 className="font-semibold mb-1">Patient support</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Manage reminders, appointments, SOS alerts, and AI care guidance.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border shadow-sm">
                    <ShieldCheck className="w-7 h-7 text-emerald-600 mb-3" />
                    <h3 className="font-semibold mb-1">Role-based security</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Dashboard access is decided by the role stored in Firestore.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border shadow-sm">
                    <Brain className="w-7 h-7 text-purple-600 mb-3" />
                    <h3 className="font-semibold mb-1">Alzheimer’s care</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Supports memory care routines and caregiver coordination.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border shadow-sm">
                    <Activity className="w-7 h-7 text-sky-600 mb-3" />
                    <h3 className="font-semibold mb-1">Live health workflow</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Firebase-backed login, chat, alerts, reminders, and appointments.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="w-full">
              <div className="text-center mb-5 lg:hidden">
                <Logo className="justify-center mb-4" />
                <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
                  Welcome to EchoCare
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Secure login and patient registration
                </p>
              </div>

              <Card className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur border-cyan-100 shadow-xl rounded-3xl overflow-hidden">
                <CardContent className="p-5 sm:p-7">
                  <Tabs
                    value={tab}
                    onValueChange={(value) => {
                      setTab(value as "signin" | "signup");
                      setPassword("");
                      if (value === "signin") resetSignupFields();
                    }}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl mb-6">
                      <TabsTrigger value="signin" className="rounded-xl">
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="rounded-xl">
                        Patient Sign Up
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="signin" className="space-y-5">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-11 h-11 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold">Sign in</h2>
                            <p className="text-sm text-muted-foreground">
                              Login with your EchoCare account.
                            </p>
                          </div>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-2xl p-3 flex gap-2 mt-4">
                          <Info className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            Patients, doctors, caregivers, and admins use the same login.
                            EchoCare redirects you based on your saved role.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-9 h-11 rounded-xl"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">Password</Label>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-primary text-xs sm:text-sm"
                            onClick={() => navigate("/forgot-password")}
                            type="button"
                          >
                            Forgot Password?
                          </Button>
                        </div>

                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type={showSigninPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-10 h-11 rounded-xl"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSigninPassword((prev) => !prev)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showSigninPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        className="w-full h-11 rounded-xl"
                        size="lg"
                        onClick={handleSignin}
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        Doctor, caregiver, and admin accounts are created by the administrator.
                      </p>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-5">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold">Create patient account</h2>
                            <p className="text-sm text-muted-foreground">
                              Only patients can self-register.
                            </p>
                          </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-2xl p-3 flex gap-2 mt-4">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Doctors, caregivers, and admins cannot sign up publicly for security.
                            Please contact admin for those accounts.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-9 h-11 rounded-xl"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showSignupPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-10 h-11 rounded-xl"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword((prev) => !prev)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showSignupPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            placeholder="Your full name"
                            className="pl-9 h-11 rounded-xl"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="patient-age">Age</Label>
                          <Input
                            id="patient-age"
                            type="number"
                            min={0}
                            placeholder="e.g. 42"
                            className="h-11 rounded-xl"
                            value={patientProfile.age}
                            onChange={(e) =>
                              setPatientProfile((prev) => ({
                                ...prev,
                                age: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="patient-gender">Gender</Label>
                          <Input
                            id="patient-gender"
                            placeholder="e.g. Female"
                            className="h-11 rounded-xl"
                            value={patientProfile.gender}
                            onChange={(e) =>
                              setPatientProfile((prev) => ({
                                ...prev,
                                gender: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-blood">Blood Group</Label>
                        <Input
                          id="patient-blood"
                          placeholder="e.g. O+"
                          className="h-11 rounded-xl"
                          value={patientProfile.bloodType}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({
                              ...prev,
                              bloodType: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-allergies">Allergies</Label>
                        <Input
                          id="patient-allergies"
                          placeholder="e.g. Penicillin, peanuts"
                          className="h-11 rounded-xl"
                          value={patientProfile.allergies}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({
                              ...prev,
                              allergies: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-problems">Medical Problems / Chronic Conditions</Label>
                        <Input
                          id="patient-problems"
                          placeholder="e.g. Hypertension, asthma"
                          className="h-11 rounded-xl"
                          value={patientProfile.chronicConditions}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({
                              ...prev,
                              chronicConditions: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-meds">Current Medications</Label>
                        <Input
                          id="patient-meds"
                          placeholder="e.g. Metformin, Atorvastatin"
                          className="h-11 rounded-xl"
                          value={patientProfile.currentMedications}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({
                              ...prev,
                              currentMedications: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-primary-concern">Primary Health Concern</Label>
                        <Input
                          id="patient-primary-concern"
                          placeholder="e.g. Memory support, headaches"
                          className="h-11 rounded-xl"
                          value={patientProfile.primaryConcern}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({
                              ...prev,
                              primaryConcern: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="patient-emergency-name">Emergency Contact Name</Label>
                          <Input
                            id="patient-emergency-name"
                            placeholder="e.g. Jane Doe"
                            className="h-11 rounded-xl"
                            value={patientProfile.emergencyContactName}
                            onChange={(e) =>
                              setPatientProfile((prev) => ({
                                ...prev,
                                emergencyContactName: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="patient-emergency-phone">Emergency Contact Phone</Label>
                          <Input
                            id="patient-emergency-phone"
                            placeholder="e.g. +977..."
                            className="h-11 rounded-xl"
                            value={patientProfile.emergencyContactPhone}
                            onChange={(e) =>
                              setPatientProfile((prev) => ({
                                ...prev,
                                emergencyContactPhone: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900 rounded-2xl p-3 flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-cyan-700 dark:text-cyan-300">
                          A 6-digit verification code will be emailed to you before the account is created.
                        </p>
                      </div>

                      <Button
                        className="w-full h-11 rounded-xl"
                        size="lg"
                        onClick={handlePatientSignup}
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending code..." : "Create Patient Account"}
                      </Button>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 text-center text-xs text-muted-foreground">
                    <span>By using EchoCare, you agree to </span>
                    <a href="#" className="hover:text-primary transition-colors">
                      Terms
                    </a>
                    <span> and </span>
                    <a href="#" className="hover:text-primary transition-colors">
                      Privacy Policy
                    </a>
                    <span>.</span>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}