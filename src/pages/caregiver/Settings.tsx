import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { Camera, LayoutDashboard, Users, MessageSquare, Calendar, Settings, Pill, UserCircle2, LogOut, Menu } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

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

export default function CaregiverSettings() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const user = auth.currentUser;
    const { theme, setTheme } = useTheme();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [bio, setBio] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPrefs, setSavingPrefs] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [shareAvailability, setShareAvailability] = useState(true);

    useEffect(() => {
        if (!user) return;
        setEmail(user.email || "");

        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                const data = snap.exists() ? (snap.data() as any) : {};
                setName(data.name || user.displayName || "");
                setPhone(data.phone || "");
                setSpecialty(data.specialty || "");
                setBio(data.bio || "");
                setPhotoUrl(data.photoURL || data.photoUrl || user.photoURL || "");
                setEmailNotifications(data.settings?.emailNotifications ?? true);
                setPushNotifications(data.settings?.pushNotifications ?? true);
                setShareAvailability(data.settings?.shareAvailability ?? true);
                if (data.settings?.theme) {
                    setTheme(data.settings.theme);
                }
            } catch (error) {
                console.error("load caregiver settings failed:", error);
                toast({ title: "Load failed", description: "Could not load caregiver settings.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        })();
    }, [setTheme, toast, user]);

    const save = async () => {
        if (!user || !name.trim()) return;

        try {
            setSavingProfile(true);
            await updateProfile(user, {
                displayName: name.trim(),
                ...(photoUrl ? { photoURL: photoUrl } : {}),
            });
            await setDoc(
                doc(db, "users", user.uid),
                {
                    name: name.trim(),
                    email: user.email,
                    phone: phone.trim(),
                    specialty: specialty.trim(),
                    bio: bio.trim(),
                    photoURL: photoUrl || null,
                    role: "caregiver",
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            toast({ title: "Saved", description: "Profile updated." });
        } catch (error: any) {
            console.error("save caregiver settings failed:", error);
            toast({ title: "Save failed", description: error?.message || "Could not save settings.", variant: "destructive" });
        } finally {
            setSavingProfile(false);
        }
    };

    const savePreferences = async () => {
        if (!user?.uid) return;

        try {
            setSavingPrefs(true);
            await setDoc(
                doc(db, "users", user.uid),
                {
                    settings: {
                        emailNotifications,
                        pushNotifications,
                        shareAvailability,
                        theme: theme || "system",
                    },
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            toast({ title: "Preferences saved", description: "Notification and privacy settings updated." });
        } catch (error: any) {
            console.error("save caregiver preferences failed:", error);
            toast({ title: "Save failed", description: error?.message || "Could not save preferences.", variant: "destructive" });
        } finally {
            setSavingPrefs(false);
        }
    };

    const onPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file || !user?.uid) return;

        try {
            setUploadingPhoto(true);
            const uploadedUrl = await uploadProfileImageToCloudinary(user.uid, file);
            setPhotoUrl(uploadedUrl);
            toast({ title: "Photo updated", description: "Profile picture uploaded." });
        } catch (error: any) {
            console.error("caregiver photo upload failed", error);
            toast({ title: "Upload failed", description: error?.message || "Profile picture upload failed.", variant: "destructive" });
        } finally {
            setUploadingPhoto(false);
            event.target.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* MOBILE HEADER */}
            <header className="border-b border-border bg-card sticky top-0 z-40 lg:hidden">
                <div className="flex items-center gap-4 h-16 px-4">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="ghost">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left">
                            <SheetHeader>
                                <SheetTitle>
                                    <Logo />
                                </SheetTitle>
                            </SheetHeader>
                            <nav className="space-y-2">
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver")}><LayoutDashboard className="w-4 h-4" />Dashboard</Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/patients")}><Users className="w-4 h-4" />Patients</Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/messages")}><MessageSquare className="w-4 h-4" />Messages</Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/appointments")}><Calendar className="w-4 h-4" />Schedule</Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/reminders")}><Pill className="w-4 h-4" />Reminders</Button>
                                <Button variant="secondary" className="w-full justify-start gap-3"><Settings className="w-4 h-4" />Settings</Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3"
                                    onClick={async () => {
                                        sessionStorage.removeItem("echocare_logged_in");
                                        await auth.signOut();
                                        navigate("/auth", { replace: true });
                                    }}
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </Button>
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <Logo className="h-8" />
                </div>
            </header>

            <div className="flex flex-1 min-h-0">
                {/* DESKTOP SIDEBAR */}
                <aside className="w-64 bg-card border-r border-border p-6 hidden lg:flex flex-col overflow-hidden">
                    <Logo className="mb-8" />
                    <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
                        <nav className="space-y-2">
                            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver")}><LayoutDashboard className="w-4 h-4" />Dashboard</Button>
                            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/patients")}><Users className="w-4 h-4" />Patients</Button>
                            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/messages")}><MessageSquare className="w-4 h-4" />Messages</Button>
                            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/appointments")}><Calendar className="w-4 h-4" />Schedule</Button>
                            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/reminders")}><Pill className="w-4 h-4" />Reminders</Button>
                            <Button variant="secondary" className="w-full justify-start gap-3"><Settings className="w-4 h-4" />Settings</Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3"
                                onClick={async () => {
                                    sessionStorage.removeItem("echocare_logged_in");
                                    await auth.signOut();
                                    navigate("/auth", { replace: true });
                                }}
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </Button>
                        </nav>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-5xl mx-auto space-y-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Caregiver Settings</h1>
                            <p className="text-sm text-muted-foreground mt-1">Manage your caregiver account, profile, and preferences.</p>
                        </div>

                        <Card>
                            <CardHeader><CardTitle>Settings Center</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-md border p-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium">Signed in as</p>
                                        <p className="text-xs text-muted-foreground">{email || "Unknown email"}</p>
                                    </div>
                                    <Badge variant="outline">Caregiver Account</Badge>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <Card className="border-dashed">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">Profile</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                                    {photoUrl ? <img src={photoUrl} alt="profile" className="w-full h-full object-cover" /> : <UserCircle2 className="w-10 h-10 text-muted-foreground" />}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="photo">Profile picture</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input id="photo" type="file" accept="image/*" onChange={onPhotoChange} disabled={uploadingPhoto || loading} />
                                                        <Badge variant="outline" className="whitespace-nowrap">
                                                            <Camera className="w-3 h-3 mr-1" />
                                                            {uploadingPhoto ? "Uploading" : "Cloudinary"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="name">Name</Label>
                                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input id="email" value={email} disabled />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Phone</Label>
                                                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555..." disabled={loading} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="specialty">Specialty</Label>
                                                <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Chronic care, rehab..." disabled={loading} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="bio">Bio</Label>
                                                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short intro shown to patients" rows={3} disabled={loading} />
                                            </div>
                                            <div className="flex justify-end">
                                                <Button onClick={save} disabled={savingProfile || !name.trim()}>{savingProfile ? "Saving..." : "Save Profile"}</Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-dashed">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">Notifications & Preferences</CardTitle>
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
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">Email notifications</p>
                                                    <p className="text-xs text-muted-foreground">Schedule updates and patient alerts.</p>
                                                </div>
                                                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} disabled={loading} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">Push notifications</p>
                                                    <p className="text-xs text-muted-foreground">In-app alerts for new chats and reminders.</p>
                                                </div>
                                                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} disabled={loading} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">Share availability with patients</p>
                                                    <p className="text-xs text-muted-foreground">Allow patients to see when you are online.</p>
                                                </div>
                                                <Switch checked={shareAvailability} onCheckedChange={setShareAvailability} disabled={loading} />
                                            </div>
                                            <div className="flex justify-end">
                                                <Button variant="outline" onClick={savePreferences} disabled={savingPrefs}>{savingPrefs ? "Saving..." : "Save Preferences"}</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
