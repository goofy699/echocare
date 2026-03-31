// src/pages/Auth.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { User, Stethoscope, Users, Shield, Lock, Mail, Info } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
  name?: string;
  patientProfile?: {
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

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from as string | undefined;

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
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

  const markSessionLoggedIn = () => {
    sessionStorage.setItem("echocare_logged_in", "1");
  };

  const normalizeCsv = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const roles = [
    {
      id: "patient" as UserRole,
      title: "Patient",
      description: "Access your health records and appointments.",
      icon: User,
      color: "bg-cyan-100 text-cyan-700",
    },
    {
      id: "doctor" as UserRole,
      title: "Doctor",
      description: "Manage patient consultations and schedules.",
      icon: Stethoscope,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      id: "caregiver" as UserRole,
      title: "Caregiver",
      description: "Support and monitor your loved one's care.",
      icon: Users,
      color: "bg-sky-100 text-sky-700",
    },
    {
      id: "admin" as UserRole,
      title: "Admin",
      description: "Oversee platform operations and users.",
      icon: Shield,
      color: "bg-teal-100 text-teal-700",
    },
  ];

  // ✅ If already logged in, check role from Firestore and route correctly
  const handleRoleSelect = async (role: UserRole) => {
    const hasSessionLogin = sessionStorage.getItem("echocare_logged_in") === "1";
    if (auth.currentUser && hasSessionLogin) {
      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        const storedRole = (snap.data()?.role as UserRole) || null;

        if (storedRole && storedRole === role) {
          navigate(ROLE_ROUTES[role], { replace: true });
          return;
        }
      } catch {
        // ignore and show login form
      }
    } else if (auth.currentUser && !hasSessionLogin) {
      await signOut(auth);
    }

    setSelectedRole(role);
    setEmail("");
    setPassword("");
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
    setTab("signin");
  };

  const handleAuth = async (type: "signin" | "signup") => {
    if (!selectedRole) {
      toast.error("Please select a role to continue");
      return;
    }

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      if (type === "signup") {
        // ✅ SIGN UP = send OTP (client side) + store pending in localStorage temporarily
        if (!name.trim()) {
          toast.error("Please enter your full name to sign up.");
          setIsLoading(false);
          return;
        }

        if (selectedRole === "patient") {
          if (!patientProfile.age || Number.isNaN(Number(patientProfile.age))) {
            toast.error("Please provide a valid age.");
            setIsLoading(false);
            return;
          }

          if (!patientProfile.bloodType.trim()) {
            toast.error("Please provide your blood group.");
            setIsLoading(false);
            return;
          }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        try {
          await sendOtpEmail(email, otp);

          const pending: PendingSignup = {
            email,
            password,
            role: selectedRole,
            name: name.trim(),
            ...(selectedRole === "patient"
              ? {
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
              }
              : {}),
            otp,
            expiresAt,
          };

          localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));
          toast.success("Verification code sent! Please check your email.");
          navigate("/verify-otp", { replace: true });
          return;
        } catch (emailErr) {
          console.error("❌ Failed to send OTP email:", emailErr);
          toast.error(
            "Could not send verification email. Please check your email address or try again later."
          );
          return;
        }
      } else {
        // ✅ SIGN IN
        const cred = await signInWithEmailAndPassword(auth, email, password);

        // ✅ READ ROLE FROM FIRESTORE (source of truth)
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        if (!snap.exists()) {
          toast.error("Your account profile was deleted. Please contact admin.");
          await signOut(auth);
          return;
        }

        const userData = snap.data() as any;
        const storedRole = (userData?.role as UserRole) || null;
        const storedName = userData?.name as string | undefined;
        const suspended = Boolean(userData?.suspended);

        if (suspended) {
          toast.error("Your account is suspended. Please contact admin.");
          await signOut(auth);
          return;
        }
        if (!storedRole) {
          toast.error(
            "No role found for this account in Firestore. Please contact admin or sign up again."
          );
          await signOut(auth);
          return;
        }

        // ✅ If user chose wrong role, show EXACT role
        if (storedRole !== selectedRole) {
          toast.error(
            `Wrong role selected. This email is registered as "${storedRole}". Please choose "${storedRole}" to continue.`
          );
          await signOut(auth);
          return;
        }

        // If user has no name yet, ask them to complete profile
        if (!storedName) {
          toast("Please complete your profile.");
          navigate("/complete-profile", { replace: true });
          return;
        }

        markSessionLoggedIn();
        toast.success("Signed in successfully!");
        navigate(from || ROLE_ROUTES[selectedRole], { replace: true });
      }
    } catch (err: any) {
      console.error("❌ Auth error:", err);
      let message = "Something went wrong. Please try again.";

      if (err.code === "auth/email-already-in-use") {
        message = "This email is already in use.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password.";
      } else if (err.code === "auth/user-not-found") {
        message = "No account found with this email.";
      } else if (err.code === "auth/weak-password") {
        message = "Password is too weak. Try a longer one.";
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_45%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.14),transparent_45%),linear-gradient(to_bottom,hsl(180_45%_97%),hsl(0_0%_100%))] flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Button
          onClick={() => navigate("/", { replace: true })}
          size="sm"
          variant="outline"
          className="rounded-full bg-white/90 border-primary/30 text-xs sm:text-sm"
        >
          ← Back to Home
        </Button>
      </div>

      <div className="w-full max-w-6xl">
        <div className="text-center mb-8 mt-8 sm:mt-0">
          <Logo className="justify-center mb-4" />
          {!selectedRole && (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
                Welcome to EchoCare
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Select your role to securely sign in or create an account.
              </p>
            </>
          )}
        </div>

        {!selectedRole ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.id}
                  className="cursor-pointer hover:shadow-medium transition-all hover:scale-[1.02] sm:hover:scale-105 border-2 hover:border-primary/60 bg-white/95"
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <CardHeader className="text-center">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${role.color} mx-auto mb-4 flex items-center justify-center`}
                    >
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    <CardTitle className="text-base sm:text-lg">
                      {role.title}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {role.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="max-w-md mx-auto bg-white/95 border-primary/15 shadow-large">
            <CardHeader>
              <Button
                onClick={() => {
                  setSelectedRole(null);
                  setEmail("");
                  setPassword("");
                  setTab("signin");
                }}
                size="sm"
                variant="outline"
                className="mb-4 rounded-full border-primary/30 text-xs sm:text-sm"
              >
                ← Back to roles
              </Button>

              <CardTitle className="text-xl sm:text-2xl">
                Sign {tab === "signin" ? "in" : "up"} as{" "}
                {roles.find((r) => r.id === selectedRole)?.title}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as "signin" | "signup")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signin">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email-signin"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password-signin">Password</Label>
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
                        id="password-signin"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg flex gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Use the same email and role you registered with to sign in
                      securely.
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleAuth("signin")}
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email-signup"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password-signup"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name-signup">Full name</Label>
                    <Input
                      id="name-signup"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {selectedRole === "patient" && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="patient-age">Age</Label>
                          <Input
                            id="patient-age"
                            type="number"
                            min={0}
                            placeholder="e.g. 42"
                            value={patientProfile.age}
                            onChange={(e) =>
                              setPatientProfile((prev) => ({ ...prev, age: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="patient-gender">Gender</Label>
                          <Input
                            id="patient-gender"
                            placeholder="e.g. Female"
                            value={patientProfile.gender}
                            onChange={(e) =>
                              setPatientProfile((prev) => ({ ...prev, gender: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-blood">Blood Group</Label>
                        <Input
                          id="patient-blood"
                          placeholder="e.g. O+"
                          value={patientProfile.bloodType}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({ ...prev, bloodType: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-allergies">Allergies (comma separated)</Label>
                        <Input
                          id="patient-allergies"
                          placeholder="e.g. Penicillin, peanuts"
                          value={patientProfile.allergies}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({ ...prev, allergies: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-problems">Medical Problems / Chronic Conditions</Label>
                        <Input
                          id="patient-problems"
                          placeholder="e.g. Hypertension, asthma"
                          value={patientProfile.chronicConditions}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({ ...prev, chronicConditions: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-meds">Current Medications</Label>
                        <Input
                          id="patient-meds"
                          placeholder="e.g. Metformin, Atorvastatin"
                          value={patientProfile.currentMedications}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({ ...prev, currentMedications: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patient-primary-concern">Primary Health Concern</Label>
                        <Input
                          id="patient-primary-concern"
                          placeholder="e.g. recurring headaches"
                          value={patientProfile.primaryConcern}
                          onChange={(e) =>
                            setPatientProfile((prev) => ({ ...prev, primaryConcern: e.target.value }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="patient-emergency-name">Emergency Contact Name</Label>
                          <Input
                            id="patient-emergency-name"
                            placeholder="e.g. Jane Doe"
                            value={patientProfile.emergencyContactName}
                            onChange={(e) =>
                              setPatientProfile((prev) => ({ ...prev, emergencyContactName: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="patient-emergency-phone">Emergency Contact Phone</Label>
                          <Input
                            id="patient-emergency-phone"
                            placeholder="e.g. +1 555..."
                            value={patientProfile.emergencyContactPhone}
                            onChange={(e) =>
                              setPatientProfile((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg flex gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      After you sign up, a 6-digit verification code will be
                      emailed to you. Enter that code on the next screen to
                      complete your registration.
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleAuth("signup")}
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending code..." : "Sign Up"}
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center text-xs text-muted-foreground">
                <a href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </a>
                {" · "}
                <a href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
