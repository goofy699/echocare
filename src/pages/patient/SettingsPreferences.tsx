import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PatientSettingsPreferences() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const { theme, setTheme } = useTheme();

    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [shareDataWithDoctor, setShareDataWithDoctor] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                const data = snap.exists() ? (snap.data() as any) : {};
                setEmailNotifications(data.settings?.emailNotifications ?? true);
                setPushNotifications(data.settings?.pushNotifications ?? true);
                setShareDataWithDoctor(data.settings?.shareDataWithDoctor ?? true);
            } catch (error) {
                console.error("load patient preferences failed", error);
                toast.error("Could not load preferences.");
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid]);

    const save = async () => {
        if (!user?.uid) return;

        try {
            setSaving(true);
            await setDoc(
                doc(db, "users", user.uid),
                {
                    settings: {
                        emailNotifications,
                        pushNotifications,
                        shareDataWithDoctor,
                        theme: theme || "system",
                    },
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            toast.success("Preferences saved.");
        } catch (error: any) {
            console.error("save preferences failed", error);
            toast.error(error?.message || "Could not save preferences.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Preferences</h1>
                    <p className="text-sm text-muted-foreground">Control notifications, privacy, and appearance.</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/patient/settings")}>Back</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label>Theme</Label>
                        <div className="flex flex-wrap gap-2">
                            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
                                <Sun className="w-4 h-4 mr-2" />Light
                            </Button>
                            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
                                <Moon className="w-4 h-4 mr-2" />Dark
                            </Button>
                            <Button variant={theme === "system" ? "default" : "outline"} onClick={() => setTheme("system")}>System</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notifications & Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-xs text-muted-foreground">Receive appointment and reminder updates by email.</p>
                        </div>
                        <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} disabled={loading} />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-xs text-muted-foreground">Get in-app updates for important events.</p>
                        </div>
                        <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} disabled={loading} />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <p className="font-medium">Share Data with Assigned Doctor</p>
                            <p className="text-xs text-muted-foreground">Allow your assigned doctor to review your profile details.</p>
                        </div>
                        <Switch checked={shareDataWithDoctor} onCheckedChange={setShareDataWithDoctor} disabled={loading} />
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
