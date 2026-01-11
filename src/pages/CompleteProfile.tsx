import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { toast } from "sonner";

export default function CompleteProfile() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate("/auth", { replace: true });
            return;
        }

        let mounted = true;
        getDoc(doc(db, "users", user.uid)).then((snap) => {
            if (!mounted) return;
            const data = snap.exists() ? (snap.data() as any) : {};
            setName(data.name || user.displayName || "");
        });

        return () => {
            mounted = false;
        };
    }, [user, navigate]);

    const handleSave = async () => {
        if (!user) return;
        if (!name.trim()) {
            toast.error("Please enter your full name.");
            return;
        }

        setLoading(true);
        try {
            await updateProfile(user, { displayName: name.trim() });
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                await updateDoc(userRef, { name: name.trim() });
            } else {
                await setDoc(userRef, { name: name.trim(), email: user.email, createdAt: new Date() });
            }
            toast.success("Profile updated");
            // read role and route accordingly
            const finalSnap = await getDoc(userRef);
            const role = finalSnap.data()?.role as string | undefined;
            if (role && role.startsWith("doctor")) navigate("/doctor", { replace: true });
            else if (role && role.startsWith("patient")) navigate("/patient", { replace: true });
            else if (role && role.startsWith("caregiver")) navigate("/caregiver", { replace: true });
            else if (role && role.startsWith("admin")) navigate("/admin", { replace: true });
            else navigate("/", { replace: true });
        } catch (e) {
            console.error(e);
            toast.error("Could not update profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle>Complete your profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Please enter your full name so colleagues and patients see it in chat.</p>
                        <div className="space-y-2">
                            <label className="text-sm">Full name</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <Button className="w-full" onClick={handleSave} disabled={loading}>
                            {loading ? "Saving..." : "Save & Continue"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
