import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, CalendarIcon, MessageSquare, BarChart3, Settings, FileText } from "lucide-react";

interface DoctorProfileForm {
    name: string;
    phone: string;
    specialization: string;
    qualification: string;
    hospital: string;
    bio: string;
}

const DEFAULT_FORM: DoctorProfileForm = {
    name: "",
    phone: "",
    specialization: "",
    qualification: "",
    hospital: "",
    bio: "",
};

export default function DoctorProfile() {
    const navigate = useNavigate();
    const doctorId = auth.currentUser?.uid;
    const [form, setForm] = useState<DoctorProfileForm>(DEFAULT_FORM);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            navigate("/auth", { replace: true });
            return;
        }

        let mounted = true;

        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                const data = snap.exists() ? (snap.data() as any) : {};
                if (!mounted) return;

                setEmail(data.email || user.email || "");
                setForm({
                    name: data.name || user.displayName || "",
                    phone: data.phone || "",
                    specialization: data.specialization || "",
                    qualification: data.qualification || "",
                    hospital: data.hospital || "",
                    bio: data.bio || "",
                });
            } catch (error) {
                console.error("Failed to load doctor profile:", error);
                toast.error("Could not load profile details.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    const updateField = (key: keyof DoctorProfileForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user || !doctorId) return;

        if (!form.name.trim()) {
            toast.error("Name is required.");
            return;
        }

        setSaving(true);
        try {
            await updateProfile(user, { displayName: form.name.trim() });
            await setDoc(
                doc(db, "users", doctorId),
                {
                    name: form.name.trim(),
                    email: user.email,
                    phone: form.phone.trim(),
                    specialization: form.specialization.trim(),
                    qualification: form.qualification.trim(),
                    hospital: form.hospital.trim(),
                    bio: form.bio.trim(),
                    role: "doctor",
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            toast.success("Profile updated successfully.");
        } catch (error) {
            console.error("Failed to update doctor profile:", error);
            toast.error("Could not save profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor")}>
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
                        <Users className="w-4 h-4" />
                        Patients
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/appointments")}>
                        <CalendarIcon className="w-4 h-4" />
                        Appointments
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/messages")}>
                        <MessageSquare className="w-4 h-4" />
                        Messages
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/reports")}>
                        <FileText className="w-4 h-4" />
                        Reports
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/analytics")}>
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                    </Button>
                    <Button variant="secondary" className="w-full justify-start gap-3">
                        <Settings className="w-4 h-4" />
                        Profile
                    </Button>
                </nav>
            </aside>

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Doctor Profile</h1>
                        <p className="text-sm text-muted-foreground mt-1">Update your details shown to patients.</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Professional Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                <p className="text-sm text-muted-foreground">Loading profile...</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" value={email} disabled />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input id="phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+91 9876543210" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="specialization">Specialization</Label>
                                            <Input id="specialization" value={form.specialization} onChange={(e) => updateField("specialization", e.target.value)} placeholder="Cardiology" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="qualification">Qualification</Label>
                                            <Input id="qualification" value={form.qualification} onChange={(e) => updateField("qualification", e.target.value)} placeholder="MBBS, MD" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="hospital">Hospital / Clinic</Label>
                                            <Input id="hospital" value={form.hospital} onChange={(e) => updateField("hospital", e.target.value)} placeholder="City Care Hospital" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bio">About</Label>
                                        <Textarea
                                            id="bio"
                                            value={form.bio}
                                            onChange={(e) => updateField("bio", e.target.value)}
                                            placeholder="Short profile shown to patients"
                                            rows={4}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={() => navigate("/doctor")}>Back</Button>
                                        <Button onClick={handleSave} disabled={saving}>
                                            {saving ? "Saving..." : "Save Profile"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
