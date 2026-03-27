import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CalendarIcon, MessageSquare, BarChart3, Settings, Search, Mail, Phone, Calendar, Clock, MapPin, FileText } from "lucide-react";

import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { fetchPatientsForDoctorViaFunction, listenPatientsForDoctor } from "../../services/chat";
import { listenAppointmentsByDoctor } from "@/services/appointments";

interface Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    age?: number;
    gender?: string;
    bloodType?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
    primaryConcern?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    lastVisit?: Date;
    nextAppointment?: Date;
    status?: "active" | "inactive";
}

export default function DoctorPatients() {
    const navigate = useNavigate();
    const doctorId = auth.currentUser?.uid;

    const [patients, setPatients] = useState<Patient[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    useEffect(() => {
        if (!doctorId) return;

        setLoading(true);

        // Fetch patients
        fetchPatientsForDoctorViaFunction(doctorId)
            .then((list) => {
                const normalized = list.map((u: any) => ({
                    id: u.id,
                    name: u.name || u.displayName || u.email || "Unknown Patient",
                    email: u.email,
                    phone: u.phone,
                    age: u.age,
                    gender: u.gender,
                    bloodType: u.bloodType,
                    allergies: u.allergies || u.patientProfile?.allergies || [],
                    chronicConditions: u.chronicConditions || u.patientProfile?.chronicConditions || [],
                    currentMedications: u.currentMedications || u.patientProfile?.currentMedications || [],
                    primaryConcern: u.primaryConcern || u.patientProfile?.primaryConcern || "",
                    emergencyContactName: u.emergencyContactName || u.patientProfile?.emergencyContactName || "",
                    emergencyContactPhone: u.emergencyContactPhone || u.patientProfile?.emergencyContactPhone || "",
                    status: u.status || "active",
                }));
                setPatients(normalized);
                setLoading(false);
            })
            .catch((err) => {
                console.error("fetchPatientsViaFunction error:", err);
                // Fallback to listener
                const unsubscribe = listenPatientsForDoctor(doctorId, (list) => {
                    const normalized = list.map((u: any) => ({
                        id: u.id,
                        name: u.name || u.displayName || u.email || "Unknown Patient",
                        email: u.email,
                        phone: u.phone,
                        age: u.age,
                        gender: u.gender,
                        bloodType: u.bloodType,
                        allergies: u.allergies || u.patientProfile?.allergies || [],
                        chronicConditions: u.chronicConditions || u.patientProfile?.chronicConditions || [],
                        currentMedications: u.currentMedications || u.patientProfile?.currentMedications || [],
                        primaryConcern: u.primaryConcern || u.patientProfile?.primaryConcern || "",
                        emergencyContactName: u.emergencyContactName || u.patientProfile?.emergencyContactName || "",
                        emergencyContactPhone: u.emergencyContactPhone || u.patientProfile?.emergencyContactPhone || "",
                        status: u.status || "active",
                    }));
                    setPatients(normalized);
                    setLoading(false);
                });

                return () => unsubscribe && unsubscribe();
            });

        // Fetch appointments to show last/next visit
        const unsubscribeAppts = listenAppointmentsByDoctor(doctorId, setAppointments);

        return () => {
            unsubscribeAppts && unsubscribeAppts();
        };
    }, [doctorId]);

    // Enrich patients with appointment data
    const enrichedPatients = patients.map((patient) => {
        const patientAppts = appointments
            .filter((a) => a.patientId === patient.id)
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

        const now = new Date();
        const pastAppts = patientAppts.filter((a) => a.scheduledAt < now);
        const futureAppts = patientAppts.filter((a) => a.scheduledAt >= now);

        return {
            ...patient,
            lastVisit: pastAppts.length > 0 ? pastAppts[pastAppts.length - 1].scheduledAt : undefined,
            nextAppointment: futureAppts.length > 0 ? futureAppts[0].scheduledAt : undefined,
        };
    });

    const filteredPatients = enrichedPatients.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activePatients = filteredPatients.filter((p) => p.status === "active");
    const inactivePatients = filteredPatients.filter((p) => p.status === "inactive");

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => navigate("/doctor")}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Button>
                    <Button
                        variant="secondary"
                        className="w-full justify-start gap-3"
                    >
                        <Users className="w-4 h-4" />
                        Patients
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => navigate("/doctor/appointments")}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Appointments
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => navigate("/doctor/messages")}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Messages
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => navigate("/doctor/reports")}
                    >
                        <FileText className="w-4 h-4" />
                        Reports
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => navigate("/doctor/analytics")}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => navigate("/doctor/profile")}
                    >
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
                <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Patients</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage and view your patient information
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-3 py-1">
                                {activePatients.length} Active
                            </Badge>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search patients by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Patient Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Patients
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{patients.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Active Patients
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-success">{activePatients.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Appointments Today
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-primary">
                                    {appointments.filter((a) => {
                                        const today = new Date();
                                        return (
                                            a.scheduledAt.toDateString() === today.toDateString() &&
                                            a.status !== "cancelled"
                                        );
                                    }).length}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Patient List */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* List View */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Active Patients</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {loading ? (
                                    <p className="text-sm text-muted-foreground">Loading patients...</p>
                                ) : activePatients.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No active patients found.</p>
                                ) : (
                                    activePatients.map((patient) => (
                                        <div
                                            key={patient.id}
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedPatient?.id === patient.id
                                                ? "border-primary bg-primary/5"
                                                : "hover:border-primary/50"
                                                }`}
                                            onClick={() => setSelectedPatient(patient)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold">{patient.name}</p>
                                                        {patient.age && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {patient.age}y
                                                            </Badge>
                                                        )}
                                                        {patient.gender && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {patient.gender}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        {patient.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="w-3 h-3" />
                                                                {patient.email}
                                                            </span>
                                                        )}
                                                        {patient.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3" />
                                                                {patient.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {patient.nextAppointment && (
                                                        <div className="flex items-center gap-1 text-xs text-primary mt-2">
                                                            <Calendar className="w-3 h-3" />
                                                            Next: {patient.nextAppointment.toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate("/doctor/messages");
                                                    }}
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Patient Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Patient Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selectedPatient ? (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-lg">{selectedPatient.name}</h3>
                                            <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t">
                                            {selectedPatient.phone && (
                                                <div className="flex items-center gap-3">
                                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">{selectedPatient.phone}</span>
                                                </div>
                                            )}
                                            {selectedPatient.age && (
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">{selectedPatient.age} years old</span>
                                                </div>
                                            )}
                                            {selectedPatient.bloodType && (
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">Blood Type: {selectedPatient.bloodType}</span>
                                                </div>
                                            )}
                                            {selectedPatient.primaryConcern && (
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">Primary Concern: {selectedPatient.primaryConcern}</span>
                                                </div>
                                            )}
                                            {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium">Allergies</p>
                                                    <p className="text-sm text-muted-foreground">{selectedPatient.allergies.join(", ")}</p>
                                                </div>
                                            )}
                                            {selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium">Medical Problems</p>
                                                    <p className="text-sm text-muted-foreground">{selectedPatient.chronicConditions.join(", ")}</p>
                                                </div>
                                            )}
                                            {selectedPatient.currentMedications && selectedPatient.currentMedications.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium">Current Medications</p>
                                                    <p className="text-sm text-muted-foreground">{selectedPatient.currentMedications.join(", ")}</p>
                                                </div>
                                            )}
                                            {(selectedPatient.emergencyContactName || selectedPatient.emergencyContactPhone) && (
                                                <div>
                                                    <p className="text-sm font-medium">Emergency Contact</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedPatient.emergencyContactName || "-"}
                                                        {selectedPatient.emergencyContactPhone ? ` (${selectedPatient.emergencyContactPhone})` : ""}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedPatient.lastVisit && (
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">
                                                        Last visit: {selectedPatient.lastVisit.toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedPatient.nextAppointment && (
                                                <div className="flex items-center gap-3">
                                                    <CalendarIcon className="w-4 h-4 text-primary" />
                                                    <span className="text-sm font-medium text-primary">
                                                        Next: {selectedPatient.nextAppointment.toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 space-y-2">
                                            <Button
                                                className="w-full gap-2"
                                                onClick={() => navigate("/doctor/messages")}
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Send Message
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full gap-2"
                                                onClick={() => navigate("/doctor/appointments")}
                                            >
                                                <CalendarIcon className="w-4 h-4" />
                                                View Appointments
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        Select a patient to view details
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}