import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { listenCaregiverPatients } from "@/services/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, Search, FileText, Pill } from "lucide-react";

export default function CaregiverPatients() {
    const navigate = useNavigate();
    const caregiverId = auth.currentUser?.uid;
    const [patients, setPatients] = useState<any[]>([]);
    const [reminders, setReminders] = useState<any[]>([]);
    const [query, setQuery] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

    useEffect(() => {
        if (!caregiverId) return;
        const unPatients = listenCaregiverPatients(caregiverId, setPatients);
        const unReminders = onSnapshot(collection(db, "reminders"), (snapshot) => {
            setReminders(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });

        return () => {
            unPatients && unPatients();
            unReminders && unReminders();
        };
    }, [caregiverId]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return patients.filter((patient: any) => {
            const name = String(patient.name || patient.displayName || patient.email || "").toLowerCase();
            const email = String(patient.email || "").toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [patients, query]);

    const rows = useMemo(() => {
        const nowSec = Math.floor(Date.now() / 1000);
        return filtered.map((patient: any) => {
            const patientReminders = reminders.filter((r: any) => r.patientId === patient.id);
            const pending = patientReminders.filter((r: any) => r.status === "pending").length;
            const missed = patientReminders.filter((r: any) => r.status === "pending" && (r.dueAt?.seconds || 0) < nowSec).length;
            return {
                id: patient.id,
                name: patient.name || patient.displayName || patient.email || patient.id,
                email: patient.email || "",
                hasReminder: patientReminders.length > 0,
                pending,
                missed,
            };
        });
    }, [filtered, reminders]);

    useEffect(() => {
        if (!selectedPatient && rows.length > 0) {
            const first = patients.find((p: any) => p.id === rows[0].id) || null;
            setSelectedPatient(first);
        }
    }, [rows, patients, selectedPatient]);

    const selectedProfile = useMemo(() => {
        if (!selectedPatient) return null;
        const source = patients.find((p: any) => p.id === selectedPatient.id) || selectedPatient;
        return {
            ...source,
            allergies: source.allergies || source.patientProfile?.allergies || [],
            chronicConditions: source.chronicConditions || source.patientProfile?.chronicConditions || [],
            currentMedications: source.currentMedications || source.patientProfile?.currentMedications || [],
            primaryConcern: source.primaryConcern || source.patientProfile?.primaryConcern || "",
            emergencyContactName: source.emergencyContactName || source.patientProfile?.emergencyContactName || "",
            emergencyContactPhone: source.emergencyContactPhone || source.patientProfile?.emergencyContactPhone || "",
        };
    }, [patients, selectedPatient]);

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver")}><LayoutDashboard className="w-4 h-4" />Dashboard</Button>
                    <Button variant="secondary" className="w-full justify-start gap-3"><Users className="w-4 h-4" />Patients</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/messages")}><MessageSquare className="w-4 h-4" />Messages</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/appointments")}><Calendar className="w-4 h-4" />Schedule</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/reminders")}><Pill className="w-4 h-4" />Reminders</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/settings")}><Settings className="w-4 h-4" />Settings</Button>
                </nav>
            </aside>

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Tracked Patients</h1>
                        <p className="text-sm text-muted-foreground mt-1">Real patient list with reminder tracking status.</p>
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Search patients..." className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Patients</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {rows.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No patients found.</p>
                                ) : (
                                    rows.map((row) => (
                                        <div key={row.id} className={`rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer ${selectedPatient?.id === row.id ? "border-primary" : ""}`} onClick={() => setSelectedPatient(patients.find((p: any) => p.id === row.id) || null)}>
                                            <div>
                                                <p className="font-medium">{row.name}</p>
                                                <p className="text-xs text-muted-foreground">{row.email || row.id}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {row.hasReminder ? <Badge className="bg-primary/10 text-primary"><FileText className="w-3 h-3 mr-1" />Has Reminder</Badge> : <Badge variant="outline">No Reminder</Badge>}
                                                <Badge className="bg-warning/10 text-warning">Pending {row.pending}</Badge>
                                                <Badge variant={row.missed > 0 ? "destructive" : "outline"}>Missed {row.missed}</Badge>
                                                <Button size="sm" variant="outline" onClick={() => navigate("/caregiver/reminders")}>Manage</Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Patient Profile</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                {!selectedProfile ? (
                                    <p className="text-sm text-muted-foreground">Select a patient to view medical profile.</p>
                                ) : (
                                    <>
                                        <p className="font-medium">{selectedProfile.name || selectedProfile.displayName || selectedProfile.email || selectedProfile.id}</p>
                                        <p className="text-xs text-muted-foreground">{selectedProfile.email || selectedProfile.id}</p>
                                        <p className="text-sm">Age: {selectedProfile.age || "-"}</p>
                                        <p className="text-sm">Gender: {selectedProfile.gender || "-"}</p>
                                        <p className="text-sm">Blood Group: {selectedProfile.bloodType || "-"}</p>
                                        <p className="text-sm">Primary Concern: {selectedProfile.primaryConcern || "-"}</p>
                                        <p className="text-sm">Allergies: {selectedProfile.allergies?.length ? selectedProfile.allergies.join(", ") : "-"}</p>
                                        <p className="text-sm">Medical Problems: {selectedProfile.chronicConditions?.length ? selectedProfile.chronicConditions.join(", ") : "-"}</p>
                                        <p className="text-sm">Current Medications: {selectedProfile.currentMedications?.length ? selectedProfile.currentMedications.join(", ") : "-"}</p>
                                        <p className="text-sm">Emergency Contact: {selectedProfile.emergencyContactName || selectedProfile.emergencyContactPhone ? `${selectedProfile.emergencyContactName || "-"} ${selectedProfile.emergencyContactPhone ? `(${selectedProfile.emergencyContactPhone})` : ""}` : "-"}</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
