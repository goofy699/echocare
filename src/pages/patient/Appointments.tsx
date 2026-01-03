import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Calendar, Clock, Edit, Trash, ChevronRight } from "lucide-react";

const SAMPLE_APPOINTMENTS = [
    {
        id: "1",
        doctor: "Dr. Evelyn Reed",
        specialty: "Cardiology",
        date: "2026-01-12",
        time: "10:30 AM",
        location: "City Hospital — Room 402",
        status: "upcoming",
    },
    {
        id: "2",
        doctor: "Dr. Ben Carter",
        specialty: "Dermatology",
        date: "2025-12-05",
        time: "02:00 PM",
        location: "SkinCare Clinic — Suite 12",
        status: "past",
    },
];

export default function PatientAppointments() {
    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Appointments</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your upcoming and past visits.
                    </p>
                </div>
                <Button className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Book Appointment
                </Button>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* APPOINTMENTS LIST */}
                <Card className="lg:col-span-2 bg-card border border-border rounded-lg">
                    <CardHeader>
                        <CardTitle>Upcoming & Past Appointments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* FILTERS */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div className="w-full sm:w-64">
                                <Input placeholder="Search by doctor or specialty" />
                            </div>
                            <div className="w-44">
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue>All</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="upcoming">Upcoming</SelectItem>
                                        <SelectItem value="past">Past</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* APPOINTMENTS */}
                        <div className="space-y-3">
                            {SAMPLE_APPOINTMENTS.map((a) => (
                                <div
                                    key={a.id}
                                    className="p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-background"
                                >
                                    <div>
                                        <h4 className="font-semibold">{a.doctor}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {a.specialty} • {a.date} • {a.time}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {a.location}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                        <div className="text-sm text-muted-foreground hidden sm:block">
                                            {a.status === "upcoming" ? "Upcoming" : "Completed"}
                                        </div>
                                        <Button variant="ghost" size="icon" title="Reschedule">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" title="Cancel">
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                        <Button variant="outline" className="flex items-center gap-2">
                                            <span>Details</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* QUICK ACTIONS */}
                <Card className="bg-card border border-border rounded-lg">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button className="w-full justify-start gap-2">
                            <Calendar className="w-4 h-4" />
                            Book New Appointment
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2">
                            <Clock className="w-4 h-4" />
                            View Calendar
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <Trash className="w-4 h-4" />
                            Clear Past Appointments
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
