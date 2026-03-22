import { useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, Trash } from "lucide-react";

import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
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
    );
}
