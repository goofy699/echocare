import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Pill, MessageSquare } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { asDate, formatDateTime, safeName } from "./adminUtils";

export default function AdminOverview() {
    const [adminName, setAdminName] = useState(auth.currentUser?.displayName || auth.currentUser?.email || "Admin");
    const [users, setUsers] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [reminders, setReminders] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);

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

        return () => {
            unUsers();
            unAppointments();
            unReminders();
            unChats();
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
