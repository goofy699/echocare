import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, Pill } from "lucide-react";

export default function CaregiverSettings() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const user = auth.currentUser;

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        setEmail(user.email || "");

        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                const data = snap.exists() ? (snap.data() as any) : {};
                setName(data.name || user.displayName || "");
            } catch (error) {
                console.error("load caregiver settings failed:", error);
            }
        })();
    }, [user]);

    const save = async () => {
        if (!user || !name.trim()) return;

        try {
            setSaving(true);
            await updateProfile(user, { displayName: name.trim() });
            await setDoc(doc(db, "users", user.uid), {
                name: name.trim(),
                email: user.email,
                role: "caregiver",
                updatedAt: serverTimestamp(),
            }, { merge: true });
            toast({ title: "Saved", description: "Settings updated." });
        } catch (error: any) {
            console.error("save caregiver settings failed:", error);
            toast({ title: "Save failed", description: error?.message || "Could not save settings.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver")}><LayoutDashboard className="w-4 h-4" />Dashboard</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/patients")}><Users className="w-4 h-4" />Patients</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/messages")}><MessageSquare className="w-4 h-4" />Messages</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/appointments")}><Calendar className="w-4 h-4" />Schedule</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/reminders")}><Pill className="w-4 h-4" />Reminders</Button>
                    <Button variant="secondary" className="w-full justify-start gap-3"><Settings className="w-4 h-4" />Settings</Button>
                </nav>
            </aside>

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Caregiver Settings</h1>
                        <p className="text-sm text-muted-foreground mt-1">Update caregiver profile details. Address and phone are intentionally not included.</p>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" value={email} disabled />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={save} disabled={saving || !name.trim()}>{saving ? "Saving..." : "Save"}</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
