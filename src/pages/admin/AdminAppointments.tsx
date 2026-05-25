import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "./AdminLayout";
import { asDate, formatDateTime } from "./adminUtils";

export default function AdminAppointments() {
    const [appointments, setAppointments] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "appointments"), (snap) => {
            const mapped = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            mapped.sort((a: any, b: any) => {
                const aTime = asDate(a.scheduledAt)?.getTime() || 0;
                const bTime = asDate(b.scheduledAt)?.getTime() || 0;
                return bTime - aTime;
            });
            setAppointments(mapped);
        });
        return () => unsub();
    }, []);

    const stats = useMemo(() => {
        const pending = appointments.filter((a) => a.status === "pending").length;
        const confirmed = appointments.filter((a) => a.status === "confirmed").length;
        const cancelled = appointments.filter((a) => a.status === "cancelled").length;
        return { pending, confirmed, cancelled };
    }, [appointments]);

    return (
        <AdminLayout title="Admin Appointments" subtitle="See appointment activity across patients, doctors, and caregivers.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.pending}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Confirmed</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.confirmed}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cancelled</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.cancelled}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-lg sm:text-xl">All Appointments</CardTitle></CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                    {appointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No appointments found.</p>
                    ) : appointments.map((item) => (
                        <div key={item.id} className="rounded-md border p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-accent transition">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.patientName || item.patientId} with {item.doctorName || item.doctorId}</p>
                                <p className="text-xs text-muted-foreground truncate">{item.location || "-"}</p>
                                <p className="text-xs text-muted-foreground">Scheduled: {formatDateTime(item.scheduledAt)}</p>
                            </div>
                            <div className="flex items-center gap-2 justify-between sm:justify-end">
                                <Badge className="text-xs">{item.status || "pending"}</Badge>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
