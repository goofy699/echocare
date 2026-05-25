import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, Trash, LayoutDashboard, Users, MessageSquare, Settings, Pill, LogOut, Menu } from "lucide-react";

import { auth } from "@/firebase";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    AppointmentRecord,
    clearPastAppointments,
    listenAppointmentsForCaregiver,
    splitAppointments,
} from "@/services/appointments";

function formatDateTime(date: Date) {
    return `${format(date, "PPP")} • ${format(date, "p")}`;
}

export default function CaregiverAppointments() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const user = auth.currentUser;

    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = listenAppointmentsForCaregiver(user.uid, setAppointments);
        return () => unsubscribe();
    }, [user?.uid]);

    const { upcoming, past } = useMemo(() => splitAppointments(appointments), [appointments]);

    const appointmentsOnSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        return appointments.filter((item) => isSameDay(item.scheduledAt, selectedDate));
    }, [appointments, selectedDate]);

    const handleClearPast = async () => {
        if (!user?.uid) return;
        setClearing(true);
        try {
            const removed = await clearPastAppointments("caregiver", user.uid);
            toast({ title: "Past appointments cleared", description: `${removed} removed.` });
        } catch (error) {
            console.error("Failed to clear past appointments:", error);
            toast({
                title: "Could not clear past appointments",
                description: "Please try again.",
                variant: "destructive",
            });
        } finally {
            setClearing(false);
        }
    };

    const NavLinks = () => (
        <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver")}><LayoutDashboard className="w-4 h-4" />Dashboard</Button>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/patients")}><Users className="w-4 h-4" />Patients</Button>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/messages")}><MessageSquare className="w-4 h-4" />Messages</Button>
            <Button variant="secondary" className="w-full justify-start gap-3"><CalendarIcon className="w-4 h-4" />Schedule</Button>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/reminders")}><Pill className="w-4 h-4" />Reminders</Button>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/settings")}><Settings className="w-4 h-4" />Settings</Button>
            <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={async () => {
                    sessionStorage.removeItem("echocare_logged_in");
                    await auth.signOut();
                    navigate("/auth", { replace: true });
                }}
            >
                <LogOut className="w-4 h-4" />
                Logout
            </Button>
        </nav>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* MOBILE HEADER */}
            <header className="border-b border-border bg-card sticky top-0 z-40 lg:hidden">
                <div className="flex items-center gap-4 h-16 px-4">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="ghost">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left">
                            <SheetHeader>
                                <SheetTitle>
                                    <Logo />
                                </SheetTitle>
                            </SheetHeader>
                            <NavLinks />
                        </SheetContent>
                    </Sheet>
                    <Logo className="h-8" />
                </div>
            </header>

            <div className="flex flex-1 min-h-0">
                {/* DESKTOP SIDEBAR */}
                <aside className="w-64 bg-card border-r border-border p-6 hidden lg:flex flex-col overflow-hidden">
                    <Logo className="mb-8" />
                    <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
                        <NavLinks />
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold">Caregiver Appointments</h1>
                                <p className="text-sm text-muted-foreground mt-1">Shared appointment calendar from database.</p>
                            </div>
                            <Button variant="outline" className="gap-2" onClick={handleClearPast} disabled={clearing}>
                                <Trash className="w-4 h-4" />
                                {clearing ? "Clearing..." : "Clear Past"}
                            </Button>
                        </div>

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
                                            <div key={item.id} className="p-4 border rounded-lg bg-background">
                                                <p className="font-semibold">{item.patientName} with {item.doctorName}</p>
                                                <p className="text-sm text-muted-foreground">{formatDateTime(item.scheduledAt)}</p>
                                                <p className="text-sm text-muted-foreground mt-1">{item.location}</p>
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
                                                <p className="font-medium">{item.patientName} • {item.doctorName}</p>
                                                <p className="text-sm text-muted-foreground">{item.location}</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="w-4 h-4" />
                                                {format(item.scheduledAt, "p")}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Past Appointments</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {past.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No past appointments.</p>
                                ) : (
                                    past.map((item) => (
                                        <div key={item.id} className="p-4 border rounded-lg bg-background">
                                            <p className="font-medium">{item.patientName} • {item.doctorName}</p>
                                            <p className="text-sm text-muted-foreground">{formatDateTime(item.scheduledAt)}</p>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
