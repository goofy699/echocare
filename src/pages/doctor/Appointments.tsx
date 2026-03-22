import { useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, Trash, LayoutDashboard, Users, MessageSquare, BarChart3, Settings, CheckCircle, XCircle, Clock3, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import {
    AppointmentRecord,
    AppointmentStatus,
    clearPastAppointments,
    listenAppointmentsByDoctor,
    splitAppointments,
    updateAppointmentStatus,
} from "@/services/appointments";

function formatDateTime(date: Date) {
    return `${format(date, "PPP")} • ${format(date, "p")}`;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
    if (status === "confirmed")
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Confirmed</Badge>;
    if (status === "cancelled")
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Cancelled</Badge>;
    return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pending</Badge>;
}

export default function DoctorAppointments() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const user = auth.currentUser;

    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [clearing, setClearing] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = listenAppointmentsByDoctor(user.uid, setAppointments);
        return () => unsubscribe();
    }, [user?.uid]);

    const { upcoming, past } = useMemo(() => splitAppointments(appointments), [appointments]);

    const appointmentsOnSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        return appointments.filter((item) => isSameDay(item.scheduledAt, selectedDate));
    }, [appointments, selectedDate]);

    const handleStatusChange = async (appointmentId: string, status: AppointmentStatus) => {
        setUpdating(appointmentId);
        try {
            await updateAppointmentStatus(appointmentId, status);
            toast({
                title: `Appointment ${status}`,
                description: `Successfully marked as ${status}.`,
            });
        } catch (error) {
            console.error("Failed to update status:", error);
            toast({
                title: "Update failed",
                description: "Could not update appointment status. Try again.",
                variant: "destructive",
            });
        } finally {
            setUpdating(null);
        }
    };

    const handleClearPast = async () => {
        if (!user?.uid) return;
        setClearing(true);
        try {
            const removed = await clearPastAppointments("doctor", user.uid);
            toast({ title: "Past appointments cleared", description: `${removed} removed.` });
        } catch (error) {
            console.error("Failed to clear past appointments:", error);
            toast({ title: "Could not clear past appointments", description: "Please try again.", variant: "destructive" });
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor")}>
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
                        <Users className="w-4 h-4" />
                        Patients
                    </Button>
                    <Button variant="secondary" className="w-full justify-start gap-3">
                        <CalendarIcon className="w-4 h-4" />
                        Appointments
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/messages")}>
                        <MessageSquare className="w-4 h-4" />
                        Messages
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/reports")}>
                        <FileText className="w-4 h-4" />
                        Reports
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/analytics")}>
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/profile")}>
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
                </nav>
                <div className="mt-auto pt-8">
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-3"
                        onClick={() => {
                            auth.signOut();
                            navigate("/auth");
                        }}
                    >
                        <span className="text-sm">🚪</span>
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Appointments</h1>
                            <p className="text-sm text-muted-foreground mt-1">Manage patient appointment requests.</p>
                        </div>
                        <Button variant="outline" className="gap-2" onClick={handleClearPast} disabled={clearing}>
                            <Trash className="w-4 h-4" />
                            {clearing ? "Clearing..." : "Clear Past"}
                        </Button>
                    </div>

                    {/* Upcoming Appointments with actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Upcoming Appointments</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {upcoming.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                                ) : (
                                    upcoming.map((item) => (
                                        <div key={item.id} className="p-4 border rounded-lg bg-background space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold">{item.patientName}</p>
                                                    <p className="text-sm text-muted-foreground">{formatDateTime(item.scheduledAt)}</p>
                                                    <p className="text-sm text-muted-foreground">{item.location}</p>
                                                    {item.notes && <p className="text-sm mt-1">{item.notes}</p>}
                                                </div>
                                                <StatusBadge status={item.status} />
                                            </div>
                                            {/* Action Buttons */}
                                            <div className="flex gap-2 pt-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1 text-success border-success/40 hover:bg-success/10"
                                                    disabled={updating === item.id || item.status === "confirmed"}
                                                    onClick={() => handleStatusChange(item.id, "confirmed")}
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1 text-warning border-warning/40 hover:bg-warning/10"
                                                    disabled={updating === item.id || item.status === "pending"}
                                                    onClick={() => handleStatusChange(item.id, "pending")}
                                                >
                                                    <Clock3 className="w-3.5 h-3.5" />
                                                    Pending
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                                                    disabled={updating === item.id || item.status === "cancelled"}
                                                    onClick={() => handleStatusChange(item.id, "cancelled")}
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Calendar</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Selected Day Schedule */}
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <span className="inline-flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4" />
                                    {selectedDate ? `Schedule on ${format(selectedDate, "PPP")}` : "Select date"}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {appointmentsOnSelectedDay.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No appointments on this date.</p>
                            ) : (
                                appointmentsOnSelectedDay.map((item) => (
                                    <div key={item.id} className="p-4 border rounded-lg flex justify-between items-center gap-3">
                                        <div>
                                            <p className="font-medium">{item.patientName}</p>
                                            <p className="text-sm text-muted-foreground">{item.location}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={item.status} />
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Clock className="w-4 h-4" />
                                                {format(item.scheduledAt, "p")}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Past Appointments */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Past Appointments</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {past.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No past appointments.</p>
                            ) : (
                                past.map((item) => (
                                    <div key={item.id} className="p-4 border rounded-lg bg-background flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{item.patientName}</p>
                                            <p className="text-sm text-muted-foreground">{formatDateTime(item.scheduledAt)}</p>
                                            <p className="text-sm text-muted-foreground">{item.location}</p>
                                        </div>
                                        <StatusBadge status={item.status} />
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
