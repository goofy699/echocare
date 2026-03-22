import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { createReminder, deleteReminder, listenRemindersByPatient, markReminderCompleted, cancelReminder } from "@/services/reminders";
import { listenCaregiverPatients } from "@/services/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, Pill, CheckCircle, XCircle, Trash2 } from "lucide-react";

export default function CaregiverReminders() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const user = auth.currentUser;
    const caregiverId = user?.uid;

    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [reminders, setReminders] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("medication");
    const [priority, setPriority] = useState("medium");
    const [dueAt, setDueAt] = useState("");

    useEffect(() => {
        if (!caregiverId) return;
        const unsubscribe = listenCaregiverPatients(caregiverId, (list) => {
            setPatients(list);
            if (list.length > 0 && !selectedPatientId) setSelectedPatientId(list[0].id);
        });
        return () => unsubscribe && unsubscribe();
    }, [caregiverId, selectedPatientId]);

    useEffect(() => {
        if (!selectedPatientId) {
            setReminders([]);
            return;
        }
        const unsubscribe = listenRemindersByPatient(selectedPatientId, setReminders);
        return () => unsubscribe();
    }, [selectedPatientId]);

    const selectedPatient = useMemo(() => patients.find((p: any) => p.id === selectedPatientId), [patients, selectedPatientId]);

    const create = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!caregiverId || !selectedPatientId) return;
        if (!title.trim() || !dueAt) {
            toast({ title: "Missing fields", description: "Title and due time are required.", variant: "destructive" });
            return;
        }

        try {
            setSaving(true);
            await createReminder({
                patientId: selectedPatientId,
                title: title.trim(),
                description: description.trim(),
                type: type as any,
                priority: priority as any,
                dueAt: new Date(dueAt),
                createdBy: caregiverId,
            });
            setTitle("");
            setDescription("");
            setDueAt("");
            toast({ title: "Reminder set", description: "Reminder created for patient." });
        } catch (error: any) {
            console.error("create caregiver reminder failed:", error);
            toast({ title: "Create failed", description: error?.message || "Could not create reminder.", variant: "destructive" });
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
                    <Button variant="secondary" className="w-full justify-start gap-3"><Pill className="w-4 h-4" />Reminders</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/settings")}><Settings className="w-4 h-4" />Settings</Button>
                </nav>
            </aside>

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Medication & Task Reminders</h1>
                        <p className="text-sm text-muted-foreground mt-1">Set reminders for patients and track if they have set reminders already.</p>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Set Reminder</CardTitle></CardHeader>
                        <CardContent>
                            <form className="space-y-3" onSubmit={create}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
                                        <option value="">Select patient</option>
                                        {patients.map((patient: any) => <option key={patient.id} value={patient.id}>{patient.name || patient.displayName || patient.email || patient.id}</option>)}
                                    </select>
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder title" />
                                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                                        <option value="medication">Medication</option>
                                        <option value="appointment">Appointment</option>
                                        <option value="task">Task</option>
                                        <option value="meal">Meal</option>
                                        <option value="activity">Activity</option>
                                    </select>
                                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                    <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="sm:col-span-2" />
                                </div>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional note" />
                                <Button type="submit" disabled={saving || !selectedPatientId || !title || !dueAt}>{saving ? "Saving..." : "Set Reminder"}</Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{selectedPatient ? `Reminders for ${selectedPatient.name || selectedPatient.displayName || selectedPatient.email || selectedPatient.id}` : "Patient Reminders"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {reminders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No reminders set for this patient.</p>
                            ) : (
                                reminders.map((reminder: any) => (
                                    <div key={reminder.id} className="rounded-lg border p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="font-medium">{reminder.title}</p>
                                                <p className="text-xs text-muted-foreground">{reminder.dueAt?.toDate ? reminder.dueAt.toDate().toLocaleString() : "-"}</p>
                                            </div>
                                            <Badge variant={reminder.status === "completed" ? "default" : reminder.status === "canceled" ? "destructive" : "secondary"}>{reminder.status}</Badge>
                                        </div>
                                        {reminder.description && <p className="text-sm text-muted-foreground mt-2">{reminder.description}</p>}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <Button size="sm" variant="outline" onClick={() => markReminderCompleted(reminder.id)}><CheckCircle className="w-4 h-4 mr-1" />Complete</Button>
                                            <Button size="sm" variant="outline" onClick={() => cancelReminder(reminder.id)}><XCircle className="w-4 h-4 mr-1" />Cancel</Button>
                                            <Button size="sm" variant="destructive" onClick={() => deleteReminder(reminder.id)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
