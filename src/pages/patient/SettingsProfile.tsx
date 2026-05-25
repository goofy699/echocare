import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { languageTools } from "@/lib/languagetools";

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

export default function PatientSettingsProfile() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [language, setLanguage] = useState(languageTools.getLanguage());

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                const data = snap.exists() ? (snap.data() as any) : {};
                setName(data.name || user.displayName || "");
                setPhone(data.phone || "");
                setPhotoUrl(data.photoURL || data.photoUrl || user.photoURL || "");
            } catch (error) {
                console.error("load patient profile settings failed", error);
                toast.error("Could not load profile settings.");
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid, user?.displayName, user?.photoURL]);

    const handleLanguageToggle = () => {
        const newLang = languageTools.toggleLanguage();
    };

    const onPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file || !user?.uid) return;

        try {
            setUploadingPhoto(true);
            const uploadedUrl = await uploadProfileImageToCloudinary(user.uid, file);
            setPhotoUrl(uploadedUrl);
            toast.success("Profile picture uploaded.");
        } catch (error: any) {
            console.error("patient photo upload failed", error);
            toast.error(error?.message || "Profile picture upload failed.");
        } finally {
            setUploadingPhoto(false);
            event.target.value = "";
        }
    };

    const save = async () => {
        if (!user?.uid) return;
        if (!name.trim()) {
            toast.error("Name is required.");
            return;
        }

        try {
            setSaving(true);
            await updateProfile(user, {
                displayName: name.trim(),
                ...(photoUrl ? { photoURL: photoUrl } : {}),
            });

            await setDoc(
                doc(db, "users", user.uid),
                {
                    name: name.trim(),
                    phone: phone.trim(),
                    photoURL: photoUrl || null,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            toast.success("Profile settings saved.");
        } catch (error: any) {
            console.error("save patient profile settings failed", error);
            toast.error(error?.message || "Could not save profile settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Profile Settings</h1>
                    <p className="text-sm text-muted-foreground">Update your basic profile details and picture.</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/patient/settings")}>Back</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Patient Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                            {photoUrl ? (
                                <img src={photoUrl} alt="profile" className="w-full h-full object-cover" />
                            ) : (
                                <UserCircle2 className="w-12 h-12 text-muted-foreground" />
                            )}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={user?.email || ""} disabled />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555..." disabled={loading} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => navigate("/patient/settings")}>Cancel</Button>
                        <Button onClick={save} disabled={loading || saving}>{saving ? "Saving..." : "Save"}</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
