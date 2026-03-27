import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/firebase";
import { Calendar as CalendarIcon, Clock, Trash } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { format, isSameDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    AppointmentRecord,
    clearPastAppointments,
    createAppointment,
    listenAppointmentsByPatient,
    splitAppointments,
} from "@/services/appointments";

type DoctorOption = {
    id: string;
    name: string;
    specialty?: string;
};

function formatDateTime(date: Date) {
    return `${format(date, "PPP")} • ${format(date, "p")}`;
}

export default function PatientAppointments() {
    const { toast } = useToast();
    const user = auth.currentUser;

    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);
    const [doctorSearch, setDoctorSearch] = useState("");
    const [selectedDoctorId, setSelectedDoctorId] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const [bookingDate, setBookingDate] = useState("");
    const [bookingTime, setBookingTime] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        const preferredDoctorId = localStorage.getItem("patient_selected_doctor_id");
        if (!preferredDoctorId || doctors.length === 0) return;

        const exists = doctors.some((doctor) => doctor.id === preferredDoctorId);
        if (exists) {
            setSelectedDoctorId(preferredDoctorId);
            localStorage.removeItem("patient_selected_doctor_id");
        }
    }, [doctors]);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = listenAppointmentsByPatient(user.uid, setAppointments);
        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        const doctorQuery = query(collection(db, "users"), where("role", "==", "doctor"));
        const unsubscribe = onSnapshot(
            doctorQuery,
            (snapshot) => {
                const list = snapshot.docs.map((d) => {
                    const data = d.data() as any;
                    return {
                        id: d.id,
                        name: data.name || data.displayName || data.email || "Doctor",
                        specialty: data.specialty || "General",
                    } as DoctorOption;
                });
                setDoctors(list);
            },
            () => setDoctors([]),
        );

        return () => unsubscribe();
    }, []);

    const { upcoming, past } = useMemo(() => splitAppointments(appointments), [appointments]);

    const filteredDoctors = useMemo(() => {
        if (!doctorSearch.trim()) return doctors;
        const term = doctorSearch.toLowerCase();
        return doctors.filter(
            (doctor) =>
                doctor.name.toLowerCase().includes(term) ||
                (doctor.specialty ?? "").toLowerCase().includes(term),
        );
    }, [doctorSearch, doctors]);

    const selectedDoctor = useMemo(
        () => doctors.find((doctor) => doctor.id === selectedDoctorId),
        [doctors, selectedDoctorId],
    );

    const appointmentsOnSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        return appointments.filter((item) => isSameDay(item.scheduledAt, selectedDate));
    }, [appointments, selectedDate]);

    const handleBookAppointment = async () => {
        if (!user?.uid) {
            toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
            return;
        }
        if (!selectedDoctor) {
            toast({ title: "Select a doctor", description: "Please choose a doctor first.", variant: "destructive" });
            return;
        }
        if (!bookingDate || !bookingTime || !location.trim()) {
            toast({
                title: "Missing details",
                description: "Date, time, and location are required.",
                variant: "destructive",
            });
            return;
        }

        const scheduledAt = new Date(`${bookingDate}T${bookingTime}`);
        if (Number.isNaN(scheduledAt.getTime())) {
            toast({ title: "Invalid date/time", description: "Enter a valid date and time.", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            await createAppointment({
                patientId: user.uid,
                patientName: user.displayName || user.email || "Patient",
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.name,
                location: location.trim(),
                notes: notes.trim(),
                scheduledAt,
                createdBy: user.uid,
            });

            setBookingDate("");
            setBookingTime("");
            setLocation("");
            setNotes("");
            toast({ title: "Appointment booked", description: "Saved to database successfully." });
        } catch (error) {
            console.error("Failed to book appointment:", error);
            toast({
                title: "Booking failed",
                description: "Could not save appointment. Check Firestore rules and try again.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleClearPast = async () => {
        if (!user?.uid) return;
        setClearing(true);
        try {
            const removedCount = await clearPastAppointments("patient", user.uid);
            toast({ title: "Past appointments cleared", description: `${removedCount} removed.` });
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Appointments</h1>
                    <p className="text-sm text-muted-foreground mt-1">Book and manage appointments saved in Firestore.</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={handleClearPast} disabled={clearing}>
                    <Trash className="w-4 h-4" />
                    {clearing ? "Clearing..." : "Clear Past Appointments"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Book New Appointment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input
                            placeholder="Search doctor by name or specialty"
                            value={doctorSearch}
                            onChange={(e) => setDoctorSearch(e.target.value)}
                        />

                        <select
                            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                        >
                            <option value="">Select doctor</option>
                            {filteredDoctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                    {doctor.name} ({doctor.specialty || "General"})
                                </option>
                            ))}
                        </select>

                        <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                        <Input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
                        <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
                        <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

                        <Button className="w-full gap-2" onClick={handleBookAppointment} disabled={submitting}>
                            <CalendarIcon className="w-4 h-4" />
                            {submitting ? "Booking..." : "Book Appointment"}
                        </Button>
                    </CardContent>
                </Card>

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
                                    <p className="font-semibold">{item.doctorName}</p>
                                    <p className="text-sm text-muted-foreground">{formatDateTime(item.scheduledAt)}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{item.location}</p>
                                    {item.notes ? <p className="text-sm mt-1">{item.notes}</p> : null}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Calendar View</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>
                            {selectedDate ? `Appointments on ${format(selectedDate, "PPP")}` : "Select a date"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {appointmentsOnSelectedDay.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No appointments on this date.</p>
                        ) : (
                            appointmentsOnSelectedDay.map((item) => (
                                <div key={item.id} className="p-4 border rounded-lg flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">{item.doctorName}</p>
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
            </div>

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
                                <p className="font-medium">{item.doctorName}</p>
                                <p className="text-sm text-muted-foreground">{formatDateTime(item.scheduledAt)}</p>
                                <p className="text-sm text-muted-foreground mt-1">{item.location}</p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
