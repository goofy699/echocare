import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { languageTools } from "@/lib/languagetools";

const toCsv = (value: unknown) => (Array.isArray(value) ? value.join(", ") : "");
const splitCsv = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);

export default function PatientSettingsMedical() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [language, setLanguage] = useState(languageTools.getLanguage());

    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [bloodType, setBloodType] = useState("");
    const [allergies, setAllergies] = useState("");
    const [chronicConditions, setChronicConditions] = useState("");
    const [currentMedications, setCurrentMedications] = useState("");
    const [primaryConcern, setPrimaryConcern] = useState("");
    const [emergencyContactName, setEmergencyContactName] = useState("");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                const data = snap.exists() ? (snap.data() as any) : {};

                setAge(data.age != null ? String(data.age) : "");
                setGender(data.gender || "");
                setBloodType(data.bloodType || "");
                setAllergies(toCsv(data.allergies));
                setChronicConditions(toCsv(data.chronicConditions));
                setCurrentMedications(toCsv(data.currentMedications));
                setPrimaryConcern(data.primaryConcern || "");
                setEmergencyContactName(data.emergencyContactName || "");
                setEmergencyContactPhone(data.emergencyContactPhone || "");
            } catch (error) {
                console.error("load patient medical settings failed", error);
                toast.error("Could not load medical settings.");
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid]);

    const handleLanguageToggle = () => {
        const newLang = languageTools.toggleLanguage();
    };

    const save = async () => {
        if (!user?.uid) return;

        try {
            setSaving(true);
            await setDoc(
                doc(db, "users", user.uid),
                {
                    age: age.trim() ? Number(age) : null,
                    gender: gender.trim() || null,
                    bloodType: bloodType.trim() || null,
                    allergies: splitCsv(allergies),
                    chronicConditions: splitCsv(chronicConditions),
                    currentMedications: splitCsv(currentMedications),
                    primaryConcern: primaryConcern.trim() || null,
                    emergencyContactName: emergencyContactName.trim() || null,
                    emergencyContactPhone: emergencyContactPhone.trim() || null,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            toast.success("Medical settings saved.");
        } catch (error: any) {
            console.error("save patient medical settings failed", error);
            toast.error(error?.message || "Could not save medical settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Medical Settings</h1>
                    <p className="text-sm text-muted-foreground">Update your health profile details from signup.</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/patient/settings")}>Back</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Medical Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Age</Label>
                            <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 32" disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <Label>Gender</Label>
                            <Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="e.g. Female" disabled={loading} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Blood Group</Label>
                            <Input value={bloodType} onChange={(e) => setBloodType(e.target.value)} placeholder="e.g. O+" disabled={loading} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Allergies (comma separated)</Label>
                            <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} disabled={loading} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Medical Problems / Chronic Conditions</Label>
                            <Input value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} disabled={loading} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Current Medications</Label>
                            <Input value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} disabled={loading} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Primary Health Concern</Label>
                            <Textarea value={primaryConcern} onChange={(e) => setPrimaryConcern(e.target.value)} className="min-h-20" disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <Label>Emergency Contact Name</Label>
                            <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <Label>Emergency Contact Phone</Label>
                            <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} disabled={loading} />
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
