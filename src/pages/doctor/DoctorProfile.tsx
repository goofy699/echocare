import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/Logo";
import { Camera, LayoutDashboard, Users, CalendarIcon, MessageSquare, BarChart3, Settings, FileText, UserCircle2 } from "lucide-react";

async function uploadProfileImageToCloudinary(userId: string, file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed for profile picture.");
    }

    const maxImageBytes = 8 * 1024 * 1024;
    if (file.size > maxImageBytes) {
        throw new Error("Image too large. Max size is 8MB.");
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary env is missing. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.");
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", `profilePictures/${userId}`);

    const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.error?.message || "Profile image upload failed.");
    }

    return String(payload.secure_url || "");
}

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
    const { theme, setTheme } = useTheme();
    const doctorId = auth.currentUser?.uid;
    const [form, setForm] = useState<DoctorProfileForm>(DEFAULT_FORM);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [photoUrl, setPhotoUrl] = useState("");
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [shareData, setShareData] = useState(true);

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
                setPhotoUrl(data.photoURL || data.photoUrl || user.photoURL || "");
                setEmailNotifications(data.settings?.emailNotifications ?? true);
                setPushNotifications(data.settings?.pushNotifications ?? true);
                setShareData(data.settings?.shareData ?? true);
                if (data.settings?.theme) setTheme(data.settings.theme);
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
    }, [navigate, setTheme]);

    const updateField = (key: keyof DoctorProfileForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const onPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file || !doctorId) return;

        try {
            setUploadingPhoto(true);
            const uploadedUrl = await uploadProfileImageToCloudinary(doctorId, file);
            setPhotoUrl(uploadedUrl);
            toast.success("Profile picture uploaded.");
        } catch (error: any) {
            console.error("doctor photo upload failed", error);
            toast.error(error?.message || "Profile picture upload failed.");
        } finally {
            setUploadingPhoto(false);
            event.target.value = "";
        }
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
            await updateProfile(user, {
                displayName: form.name.trim(),
                ...(photoUrl ? { photoURL: photoUrl } : {}),
            });
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
                    photoURL: photoUrl || null,
                    role: "doctor",
                    settings: {
                        emailNotifications,
                        pushNotifications,
                        shareData,
                        theme: theme || "system",
                    },
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
                        <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor")}>
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="sidebar-label">Dashboard</span>
                    </Button>
                        <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
                            <Users className="w-4 h-4" />
                            <span className="sidebar-label">Patients</span>
                    </Button>
                        <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/appointments")}>
                            <CalendarIcon className="w-4 h-4" />
                            <span className="sidebar-label">Appointments</span>
                    </Button>
                        <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/messages")}>
                            <MessageSquare className="w-4 h-4" />
                            <span className="sidebar-label">Messages</span>
                    </Button>
                        <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/reports")}>
                            <FileText className="w-4 h-4" />
                            <span className="sidebar-label">Reports</span>
                    </Button>
                        <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/analytics")}>
                            <BarChart3 className="w-4 h-4" />
                            <span className="sidebar-label">Analytics</span>
                    </Button>
                        <Button variant="secondary" className="sidebar-item w-full justify-start gap-3">
                            <Settings className="w-4 h-4" />
                            <span className="sidebar-label">Profile</span>
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
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                            {photoUrl ? <img src={photoUrl} alt="profile" className="w-full h-full object-cover" /> : <UserCircle2 className="w-10 h-10 text-muted-foreground" />}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="photo">Profile picture</Label>
                                            <div className="flex items-center gap-2">
                                                <Input id="photo" type="file" accept="image/*" onChange={onPhotoChange} disabled={uploadingPhoto || loading} />
                                                <Button variant="outline" size="sm" disabled={uploadingPhoto || loading}>
                                                    <Camera className="w-4 h-4 mr-1" />{uploadingPhoto ? "Uploading" : "Use Cloudinary"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

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

                                    <Card className="border-dashed" id="preferences">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">Preferences</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Theme</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>Light</Button>
                                                    <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>Dark</Button>
                                                    <Button variant={theme === "system" ? "default" : "outline"} onClick={() => setTheme("system")}>System</Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between rounded-md border p-3">
                                                <div>
                                                    <p className="font-medium">Email notifications</p>
                                                    <p className="text-xs text-muted-foreground">Appointment and message summaries.</p>
                                                </div>
                                                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                                            </div>
                                            <div className="flex items-center justify-between rounded-md border p-3">
                                                <div>
                                                    <p className="font-medium">Push notifications</p>
                                                    <p className="text-xs text-muted-foreground">Instant in-app alerts.</p>
                                                </div>
                                                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                                            </div>
                                            <div className="flex items-center justify-between rounded-md border p-3">
                                                <div>
                                                    <p className="font-medium">Share profile with patients</p>
                                                    <p className="text-xs text-muted-foreground">Allow patients to view your photo and specialty.</p>
                                                </div>
                                                <Switch checked={shareData} onCheckedChange={setShareData} />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={() => navigate("/doctor")}>Back</Button>
                                        <Button onClick={handleSave} disabled={saving}>
                                            {saving ? "Saving..." : "Save Profile & Preferences"}
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
