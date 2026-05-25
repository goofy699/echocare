import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "./AdminLayout";
import { asDate, formatDateTime, safeName } from "./adminUtils";

export default function AdminSystemLogs() {
    const [users, setUsers] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [reminders, setReminders] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);

    useEffect(() => {
        const unUsers = onSnapshot(collection(db, "users"), (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
        const unAppointments = onSnapshot(collection(db, "appointments"), (snap) => setAppointments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
        const unReminders = onSnapshot(collection(db, "reminders"), (snap) => setReminders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
        const unChats = onSnapshot(collection(db, "chats"), (snap) => setChats(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));

        return () => {
            unUsers();
            unAppointments();
            unReminders();
            unChats();
        };
    }, []);

    const logs = useMemo(() => {
        const entries: { text: string; at: Date }[] = [];

        users.forEach((user) => {
            const created = asDate(user.createdAt);
            if (created) entries.push({ text: `User registered: ${safeName(user)} (${user.role || "unknown"})`, at: created });
            const updated = asDate(user.updatedAt);
            if (updated) entries.push({ text: `User updated: ${safeName(user)}`, at: updated });
        });

        appointments.forEach((appointment) => {
            const updated = asDate(appointment.updatedAt || appointment.createdAt || appointment.scheduledAt);
            if (!updated) return;
            entries.push({ text: `Appointment ${appointment.status || "pending"}: ${appointment.patientName || appointment.patientId} -> ${appointment.doctorName || appointment.doctorId}`, at: updated });
        });

        reminders.forEach((reminder) => {
            const updated = asDate(reminder.updatedAt || reminder.createdAt || reminder.dueAt);
            if (!updated) return;
            entries.push({ text: `Reminder ${reminder.status || "pending"}: ${reminder.title || "Untitled"}`, at: updated });
        });

        chats.forEach((chat) => {
            const updated = asDate(chat.updatedAt);
            if (!updated) return;
            entries.push({ text: `Chat touched: ${chat.id} (${chat.lastMessage || "No preview"})`, at: updated });
        });

        return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 100);
    }, [appointments, chats, reminders, users]);

    return (
        <AdminLayout title="System Logs" subtitle="Cross-module event timeline for admin operations and audits.">
            <Card>
                <CardHeader><CardTitle className="text-lg sm:text-xl">Recent Events</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No log events found.</p>
                    ) : logs.map((log, index) => (
                        <div key={`${log.text}-${index}`} className="rounded-md border p-2 sm:p-3 hover:bg-accent transition">
                            <p className="text-xs sm:text-sm break-words">{log.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDateTime(log.at)}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
