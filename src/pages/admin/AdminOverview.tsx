import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Pill, MessageSquare } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { asDate, formatDateTime, safeName } from "./adminUtils";

type ShiftUser = {
    id: string;
    name: string;
    role: string;
    availability?: string;
    shiftStatus?: string;
    currentShiftStartedAt?: Date | null;
};

export default function AdminOverview() {
    const [adminName, setAdminName] = useState(auth.currentUser?.displayName || auth.currentUser?.email || "Admin");
    const [users, setUsers] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [reminders, setReminders] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [doctorShifts, setDoctorShifts] = useState<any[]>([]);
    const [caregiverShifts, setCaregiverShifts] = useState<any[]>([]);

    useEffect(() => {
        const unUsers = onSnapshot(collection(db, "users"), (snap) => {
            setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));

            const currentUid = auth.currentUser?.uid;
            if (!currentUid) return;

            const currentUser = snap.docs.find((docSnap) => docSnap.id === currentUid)?.data() as any;
            if (currentUser) {
                setAdminName(currentUser.name || currentUser.displayName || auth.currentUser?.displayName || auth.currentUser?.email || "Admin");
            }
        });
        const unAppointments = onSnapshot(collection(db, "appointments"), (snap) => {
            setAppointments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });
        const unReminders = onSnapshot(collection(db, "reminders"), (snap) => {
            setReminders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });
        const unChats = onSnapshot(collection(db, "chats"), (snap) => {
            setChats(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });

        const doctorShiftQuery = query(collection(db, "doctorShifts"), orderBy("startAt", "desc"), limit(30));
        const caregiverShiftQuery = query(collection(db, "caregiverShifts"), orderBy("startAt", "desc"), limit(30));
        const unDoctorShifts = onSnapshot(doctorShiftQuery, (snap) => {
            setDoctorShifts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });
        const unCaregiverShifts = onSnapshot(caregiverShiftQuery, (snap) => {
            setCaregiverShifts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });

        return () => {
            unUsers();
            unAppointments();
            unReminders();
            unChats();
            unDoctorShifts();
            unCaregiverShifts();
        };
    }, []);

    const roleStats = useMemo(() => {
        const byRole = { patient: 0, doctor: 0, caregiver: 0, admin: 0, unknown: 0 } as Record<string, number>;
        users.forEach((user) => {
            const role = String(user.role || "unknown");
            if (byRole[role] == null) byRole.unknown += 1;
            else byRole[role] += 1;
        });
        return byRole;
    }, [users]);

    const recentActivity = useMemo(() => {
        const events: { text: string; at: Date }[] = [];

        users.forEach((user) => {
            const at = asDate(user.createdAt);
            if (!at) return;
            events.push({ text: `User created: ${safeName(user)} (${user.role || "unknown"})`, at });
        });

        appointments.forEach((item) => {
            const at = asDate(item.updatedAt || item.createdAt || item.scheduledAt);
            if (!at) return;
            events.push({ text: `Appointment ${item.status || "pending"}: ${item.patientName || item.patientId} with ${item.doctorName || item.doctorId}`, at });
        });

        reminders.forEach((item) => {
            const at = asDate(item.updatedAt || item.createdAt || item.dueAt);
            if (!at) return;
            events.push({ text: `Reminder ${item.status || "pending"}: ${item.title || "Untitled"}`, at });
        });

        chats.forEach((item) => {
            const at = asDate(item.updatedAt);
            if (!at) return;
            events.push({ text: `Chat update: ${item.lastMessage || "No preview"}`, at });
        });

        return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 12);
    }, [appointments, chats, reminders, users]);

    const shiftUsers = useMemo(() => {
        // Build quick lookups of the latest shift doc per role to override stale user fields
        const latestBy = (items: any[], idKey: "doctorId" | "caregiverId") => {
            const map = new Map<string, any>();
            items.forEach((s) => {
                const uid = s[idKey];
                if (!uid) return;
                const existing = map.get(uid);
                const startAt = asDate(s.startAt)?.getTime() || 0;
                const existingStart = existing?.startAtMs || 0;
                if (!existing || startAt > existingStart) {
                    map.set(uid, {
                        status: s.status || "open",
                        availability: s.status === "open" ? "available" : "unavailable",
                        startAt,
                        startAtMs: startAt,
                    });
                }
            });
            return map;
        };

        const latestDoctorShift = latestBy(doctorShifts, "doctorId");
        const latestCaregiverShift = latestBy(caregiverShifts, "caregiverId");

        const toShiftUser = (u: any): ShiftUser => {
            const role = (u.role || "unknown").toLowerCase();
            const latest = role === "doctor" ? latestDoctorShift.get(u.id) : latestCaregiverShift.get(u.id);
            const currentShiftStartedAt = latest?.startAt ? new Date(latest.startAt) : asDate(u.currentShiftStartedAt);
            const shiftStatus = latest ? (latest.status === "open" ? "on-duty" : "off-duty") : (u.shiftStatus || "off-duty");
            const availability = latest ? latest.availability : (u.availability || "unavailable");

            return {
                id: u.id,
                name: safeName(u),
                role: u.role || "unknown",
                availability,
                shiftStatus,
                currentShiftStartedAt,
            };
        };

        const doctors = users.filter((u) => (u.role || "").toLowerCase() === "doctor").map(toShiftUser);
        const caregivers = users
            .filter((u) => {
                const role = (u.role || "").toLowerCase();
                return role === "caregiver" || role === "caretaker" || role.includes("care");
            })
            .map(toShiftUser);
        return { doctors, caregivers };
    }, [users, doctorShifts, caregiverShifts]);

    const recentShifts = useMemo(() => {
        const nameForId = (id: string | undefined, role: string) => {
            const found = users.find((u) => u.id === id);
            return safeName(found || { name: role });
        };

        const mapped = [
            ...doctorShifts.map((s) => ({ ...s, role: "doctor", userName: nameForId(s.doctorId, "Doctor") })),
            ...caregiverShifts.map((s) => ({ ...s, role: "caregiver", userName: nameForId(s.caregiverId, "Caregiver") })),
        ];

        return mapped
            .map((s) => ({
                id: s.id,
                role: s.role,
                userName: s.userName,
                status: s.status || "open",
                startAt: asDate(s.startAt),
                endAt: asDate(s.endAt),
            }))
            .filter((s) => s.startAt)
            .sort((a, b) => (b.startAt?.getTime() || 0) - (a.startAt?.getTime() || 0))
            .slice(0, 15);
    }, [caregiverShifts, doctorShifts, users]);

    return (
        <AdminLayout title={`Welcome Back, ${adminName}!`} subtitle="Real-time platform metrics across patient, doctor, and caregiver workflows.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between"><p className="text-3xl font-bold">{users.length}</p><Users className="w-5 h-5 text-primary" /></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Appointments</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between"><p className="text-3xl font-bold">{appointments.length}</p><Calendar className="w-5 h-5 text-primary" /></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reminders</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between"><p className="text-3xl font-bold">{reminders.length}</p><Pill className="w-5 h-5 text-primary" /></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Chats</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between"><p className="text-3xl font-bold">{chats.length}</p><MessageSquare className="w-5 h-5 text-primary" /></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>User Role Distribution</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Badge>Patients: {roleStats.patient}</Badge>
                    <Badge>Doctors: {roleStats.doctor}</Badge>
                    <Badge>Caregivers: {roleStats.caregiver}</Badge>
                    <Badge>Admins: {roleStats.admin}</Badge>
                    <Badge variant="outline">Unknown: {roleStats.unknown}</Badge>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Doctor Shifts</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {shiftUsers.doctors.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No doctors found.</p>
                        ) : shiftUsers.doctors.map((docUser) => (
                            <div key={docUser.id} className="flex items-center justify-between rounded-md border p-3">
                                <div>
                                    <p className="font-medium">{docUser.name}</p>
                                    <p className="text-xs text-muted-foreground">{docUser.availability === "available" ? "Online" : "Offline"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={docUser.shiftStatus === "on-duty" ? "default" : "outline"}>
                                        {docUser.shiftStatus === "on-duty" ? "Clocked in" : "Clocked out"}
                                    </Badge>
                                    {docUser.currentShiftStartedAt && (
                                        <span className="text-xs text-muted-foreground">
                                            since {formatDateTime(docUser.currentShiftStartedAt)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Caregiver Shifts</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {shiftUsers.caregivers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No caregivers found.</p>
                        ) : shiftUsers.caregivers.map((cgUser) => (
                            <div key={cgUser.id} className="flex items-center justify-between rounded-md border p-3">
                                <div>
                                    <p className="font-medium">{cgUser.name}</p>
                                    <p className="text-xs text-muted-foreground">{cgUser.availability === "available" ? "Online" : "Offline"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={cgUser.shiftStatus === "on-duty" ? "default" : "outline"}>
                                        {cgUser.shiftStatus === "on-duty" ? "Clocked in" : "Clocked out"}
                                    </Badge>
                                    {cgUser.currentShiftStartedAt && (
                                        <span className="text-xs text-muted-foreground">
                                            since {formatDateTime(cgUser.currentShiftStartedAt)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Recent Shifts</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {recentShifts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No shift records yet.</p>
                    ) : (
                        recentShifts.map((shift) => (
                            <div key={shift.id} className="flex items-center justify-between rounded-md border p-3">
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{shift.userName}</span>
                                    <span className="text-xs text-muted-foreground capitalize">{shift.role}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {shift.startAt ? `Started ${formatDateTime(shift.startAt)}` : "Start unknown"}
                                        {shift.endAt ? ` • Ended ${formatDateTime(shift.endAt)}` : shift.status === "open" ? " • Ongoing" : ""}
                                    </span>
                                </div>
                                <Badge variant={shift.status === "open" ? "outline" : "secondary"}>{shift.status === "open" ? "Open" : "Closed"}</Badge>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {recentActivity.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity found.</p>
                    ) : recentActivity.map((event, index) => (
                        <div key={`${event.text}-${index}`} className="rounded-md border p-3 text-sm">
                            <p>{event.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDateTime(event.at)}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
