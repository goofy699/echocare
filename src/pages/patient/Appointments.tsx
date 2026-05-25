import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/firebase";
import { Calendar as CalendarIcon, Clock, Trash } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { format, isSameDay } from "date-fns";
import { languageTools } from "@/lib/languagetools";

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

function getAssignedDoctorIds(profile: any): string[] {
    if (!profile) return [];

    const ids = [
        profile.assignedDoctorId,
        profile.doctorId,
        ...(Array.isArray(profile.assignedDoctors) ? profile.assignedDoctors : []),
    ].filter(Boolean);

    return Array.from(new Set(ids));
}

export default function PatientAppointments() {
    const { toast } = useToast();
    const user = auth.currentUser;
    const [language, setLanguage] = useState(languageTools.getLanguage());

    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);
    const [patientProfile, setPatientProfile] = useState<any | null>(null);

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
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
            setPatientProfile(snap.exists() ? snap.data() : null);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = listenAppointmentsByPatient(user.uid, setAppointments);
        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        const assignedDoctorIds = getAssignedDoctorIds(patientProfile);

        if (assignedDoctorIds.length === 0) {
            setDoctors([]);
            setSelectedDoctorId("");
            return;
        }

        const unsubscribers = assignedDoctorIds.map((doctorId) =>
            onSnapshot(doc(db, "users", doctorId), (snap) => {
                setDoctors((prev) => {
                    const withoutCurrent = prev.filter((doctor) => doctor.id !== doctorId);

                    if (!snap.exists()) {
                        return withoutCurrent;
                    }

                    const data = snap.data() as any;

                    if (data.role !== "doctor") {
                        return withoutCurrent;
                    }

                    const doctor: DoctorOption = {
                        id: snap.id,
                        name: data.name || data.displayName || data.email || "Doctor",
                        specialty: data.specialty || data.specialization || "General",
                    };

                    const nextDoctors = [...withoutCurrent, doctor];

                    setSelectedDoctorId((current) => {
                        if (current && nextDoctors.some((item) => item.id === current)) {
                            return current;
                        }

                        return nextDoctors[0]?.id || "";
                    });

                    return nextDoctors;
                });
            })
        );

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, [patientProfile]);

    useEffect(() => {
        const preferredDoctorId = localStorage.getItem("patient_selected_doctor_id");

        if (!preferredDoctorId || doctors.length === 0) return;

        const exists = doctors.some((doctor) => doctor.id === preferredDoctorId);

        if (exists) {
            setSelectedDoctorId(preferredDoctorId);
        }

        localStorage.removeItem("patient_selected_doctor_id");
    }, [doctors]);

    const { upcoming, past } = useMemo(() => splitAppointments(appointments), [appointments]);

    const filteredDoctors = useMemo(() => {
        if (!doctorSearch.trim()) return doctors;

        const term = doctorSearch.toLowerCase();

        return doctors.filter(
            (doctor) =>
                doctor.name.toLowerCase().includes(term) ||
                (doctor.specialty ?? "").toLowerCase().includes(term)
        );
    }, [doctorSearch, doctors]);

    const selectedDoctor = useMemo(
        () => doctors.find((doctor) => doctor.id === selectedDoctorId),
        [doctors, selectedDoctorId]
    );

    const appointmentsOnSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        return appointments.filter((item) => isSameDay(item.scheduledAt, selectedDate));
    }, [appointments, selectedDate]);

    const handleLanguageToggle = () => {
        const newLang = languageTools.toggleLanguage();
        setLanguage(newLang);
    };

    const handleBookAppointment = async () => {
        if (!user?.uid) {
            toast({
                title: "Not signed in",
                description: "Please sign in again.",
                variant: "destructive",
            });
            return;
        }

        if (!selectedDoctor) {
            toast({
                title: "No assigned doctor",
                description: "Please contact admin to assign your doctor first.",
                variant: "destructive",
            });
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
            toast({
                title: "Invalid date/time",
                description: "Enter a valid date and time.",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        try {
            await createAppointment({
                patientId: user.uid,
                patientName: user.displayName || user.email || "Patient",
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.name,
                caregiverId: patientProfile?.assignedCaregiverId || patientProfile?.caregiverId || null,
                caregiverName: patientProfile?.assignedCaregiverName || null,
                location: location.trim(),
                notes: notes.trim(),
                scheduledAt,
                createdBy: user.uid,
            });

            setBookingDate("");
            setBookingTime("");
            setLocation("");
            setNotes("");

            toast({
                title: "Appointment booked",
                description: "Saved to database successfully.",
            });
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

            toast({
                title: "Past appointments cleared",
                description: `${removedCount} removed.`,
            });
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
                    <p className="text-sm text-muted-foreground mt-1">
                        Book and manage appointments with your assigned doctor.
                    </p>
                </div>

                <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleClearPast}
                    disabled={clearing}
                >
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
                        {doctors.length === 0 ? (
                            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                No doctor assigned yet. Please contact admin to assign your doctor.
                            </div>
                        ) : (
                            <>
                                <Input
                                    placeholder="Search assigned doctor"
                                    value={doctorSearch}
                                    onChange={(e) => setDoctorSearch(e.target.value)}
                                />

                                <select
                                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                                    value={selectedDoctorId}
                                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                                >
                                    <option value="">Select assigned doctor</option>
                                    {filteredDoctors.map((doctor) => (
                                        <option key={doctor.id} value={doctor.id}>
                                            {doctor.name} ({doctor.specialty || "General"})
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}

                        <Input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            disabled={doctors.length === 0}
                        />

                        <Input
                            type="time"
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            disabled={doctors.length === 0}
                        />

                        <Input
                            placeholder="Location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            disabled={doctors.length === 0}
                        />

                        <Input
                            placeholder="Notes (optional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={doctors.length === 0}
                        />

                        <Button
                            className="w-full gap-2"
                            onClick={handleBookAppointment}
                            disabled={submitting || doctors.length === 0}
                        >
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
                            <p className="text-sm text-muted-foreground">
                                No upcoming appointments.
                            </p>
                        ) : (
                            upcoming.map((item) => (
                                <div key={item.id} className="p-4 border rounded-lg bg-background">
                                    <p className="font-semibold">{item.doctorName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDateTime(item.scheduledAt)}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {item.location}
                                    </p>
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
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>
                            {selectedDate
                                ? `Appointments on ${format(selectedDate, "PPP")}`
                                : "Appointments"}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        {appointmentsOnSelectedDay.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No appointments on this day.
                            </p>
                        ) : (
                            appointmentsOnSelectedDay.map((item) => (
                                <div key={item.id} className="p-4 border rounded-lg bg-background">
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold">{item.doctorName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDateTime(item.scheduledAt)}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {item.location}
                                            </p>
                                            {item.notes ? <p className="text-sm mt-1">{item.notes}</p> : null}
                                        </div>
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
                        <p className="text-sm text-muted-foreground">
                            No past appointments.
                        </p>
                    ) : (
                        past.map((item) => (
                            <div key={item.id} className="p-4 border rounded-lg bg-background opacity-80">
                                <p className="font-semibold">{item.doctorName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {formatDateTime(item.scheduledAt)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {item.location}
                                </p>
                                {item.notes ? <p className="text-sm mt-1">{item.notes}</p> : null}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}