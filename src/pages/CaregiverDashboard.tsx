import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { listenAppointmentsForCaregiver } from "@/services/appointments";
import { listenCaregiverPatients, listenChatsByParticipant } from "@/services/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, Bell, CheckCircle, AlertCircle, Clock, Pill } from "lucide-react";

export default function CaregiverDashboard() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const caregiverId = user?.uid;

    const [patients, setPatients] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [allReminders, setAllReminders] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);

    useEffect(() => {
        if (!caregiverId) return;

        const unPatients = listenCaregiverPatients(caregiverId, setPatients);
        const unAppointments = listenAppointmentsForCaregiver(caregiverId, setAppointments);
        const unChats = listenChatsByParticipant(caregiverId, setChats);

        const unReminders = onSnapshot(
            collection(db, "reminders"),
            (snapshot) => {
                const mapped = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }));
                setAllReminders(mapped);
            },
            (error) => {
                console.error("caregiver reminders listener failed:", error);
                setAllReminders([]);
            }
        );

        return () => {
            unPatients && unPatients();
            unAppointments && unAppointments();
            unChats && unChats();
            unReminders && unReminders();
        };
    }, [caregiverId]);

    const patientIds = useMemo(() => new Set(patients.map((p) => p.id)), [patients]);

    const reminders = useMemo(
        () => allReminders.filter((r: any) => patientIds.has(r.patientId)),
        [allReminders, patientIds]
    );

    const nowSec = Math.floor(Date.now() / 1000);

    const reminderStats = useMemo(() => {
        const pending = reminders.filter((r: any) => r.status === "pending");
        const completed = reminders.filter((r: any) => r.status === "completed");
        const missed = pending.filter((r: any) => {
            const due = r.dueAt?.seconds || 0;
            return due < nowSec;
        });

        return {
            pending: pending.length,
            completed: completed.length,
            missed: missed.length,
        };
    }, [reminders, nowSec]);

    const patientRows = useMemo(() => {
        return patients.map((patient: any) => {
            const patientReminders = reminders.filter((r: any) => r.patientId === patient.id);
            const hasSet = patientReminders.length > 0;
            const pending = patientReminders.filter((r: any) => r.status === "pending").length;
            const missed = patientReminders.filter((r: any) => r.status === "pending" && (r.dueAt?.seconds || 0) < nowSec).length;

            let status: "stable" | "attention" = "stable";
            if (missed > 0) status = "attention";

            return {
                id: patient.id,
                name: patient.name || patient.displayName || patient.email || patient.id,
                status,
                hasSet,
                pending,
                missed,
            };
        });
    }, [patients, reminders, nowSec]);

    const upcomingAppointments = useMemo(() => {
        const now = Date.now();
        return appointments
            .filter((a: any) => a.scheduledAt && a.scheduledAt.getTime() >= now)
            .slice(0, 5);
    }, [appointments]);

    const recentChats = useMemo(() => chats.slice(0, 5), [chats]);

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
                <Logo className="mb-8" />

                <nav className="space-y-2">
                    <Button variant="secondary" className="w-full justify-start gap-3">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/patients")}>
                        <Users className="w-4 h-4" />
                        Patients
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/messages")}>
                        <MessageSquare className="w-4 h-4" />
                        Messages
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/appointments")}>
                        <Calendar className="w-4 h-4" />
                        Schedule
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/reminders")}>
                        <Pill className="w-4 h-4" />
                        Reminders
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/settings")}>
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
                </nav>
            </aside>

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Caregiver Dashboard</h1>
                            <p className="text-muted-foreground">Real patient tracking, reminders, appointments, and messages.</p>
                        </div>
                        <Button size="icon" variant="ghost">
                            <Bell className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tracked Patients</CardTitle></CardHeader>
                            <CardContent><p className="text-3xl font-bold">{patients.length}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Reminders</CardTitle></CardHeader>
                            <CardContent><p className="text-3xl font-bold">{reminderStats.pending}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Missed Reminders</CardTitle></CardHeader>
                            <CardContent><p className="text-3xl font-bold text-destructive">{reminderStats.missed}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Upcoming Appointments</CardTitle></CardHeader>
                            <CardContent><p className="text-3xl font-bold">{upcomingAppointments.length}</p></CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Tracked Patients</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {patientRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No patients found.</p>
                            ) : (
                                patientRows.map((row) => (
                                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                                        <div>
                                            <p className="font-medium">{row.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {row.hasSet ? `Has reminders set (${row.pending} pending)` : "No reminders set yet"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {row.status === "attention" ? (
                                                <Badge className="bg-warning/10 text-warning"><AlertCircle className="w-3 h-3 mr-1" />Needs Attention</Badge>
                                            ) : (
                                                <Badge className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" />Stable</Badge>
                                            )}
                                            <Button size="sm" variant="outline" onClick={() => navigate("/caregiver/reminders")}>Manage</Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Medication Reminders</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="text-sm">Completed</span>
                                    <Badge className="bg-success/10 text-success">{reminderStats.completed}</Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="text-sm">Pending</span>
                                    <Badge className="bg-primary/10 text-primary">{reminderStats.pending}</Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="text-sm">Missed</span>
                                    <Badge variant="destructive">{reminderStats.missed}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Recent Messages</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {recentChats.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No message threads yet.</p>
                                ) : (
                                    recentChats.map((chat: any) => (
                                        <div key={chat.id} className="rounded-lg border p-3">
                                            <p className="font-medium text-sm">Thread: {chat.id}</p>
                                            <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "No messages yet"}</p>
                                        </div>
                                    ))
                                )}
                                <Button className="w-full" variant="outline" onClick={() => navigate("/caregiver/messages")}>Open Messages</Button>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Upcoming Schedule</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {upcomingAppointments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                            ) : (
                                upcomingAppointments.map((appointment: any) => (
                                    <div key={appointment.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{appointment.patientName} with {appointment.doctorName}</p>
                                            <p className="text-xs text-muted-foreground">{appointment.scheduledAt.toLocaleString()}</p>
                                        </div>
                                        <Badge className="bg-primary/10 text-primary"><Clock className="w-3 h-3 mr-1" />Upcoming</Badge>
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
