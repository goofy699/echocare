import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Pill,
    Calendar,
    Clock,
    Bell,
    Plus,
    Check,
    X,
    Phone,
    Utensils,
    Activity,
    User,
    AlertCircle
} from "lucide-react";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

interface Reminder {
    id: string;
    type: "medication" | "appointment" | "task" | "meal" | "activity";
    title: string;
    description: string;
    time: string;
    status: "upcoming" | "completed" | "missed";
    date: string;
    priority: "high" | "medium" | "low";
}

const SAMPLE_REMINDERS: Reminder[] = [
    {
        id: "1",
        type: "medication",
        title: "Aricept 10mg",
        description: "Take with breakfast and a full glass of water",
        time: "08:00 AM",
        date: "2026-01-11",
        status: "completed",
        priority: "high",
    },
    {
        id: "2",
        type: "medication",
        title: "Namenda 10mg",
        description: "Take with lunch",
        time: "12:30 PM",
        date: "2026-01-11",
        status: "upcoming",
        priority: "high",
    },
    {
        id: "3",
        type: "appointment",
        title: "Dr. Evelyn Reed - Cardiology",
        description: "City Hospital, Room 402. Bring medical records.",
        time: "10:30 AM",
        date: "2026-01-12",
        status: "upcoming",
        priority: "high",
    },
    {
        id: "4",
        type: "medication",
        title: "Vitamin B12",
        description: "Take with dinner",
        time: "06:00 PM",
        date: "2026-01-11",
        status: "upcoming",
        priority: "medium",
    },
    {
        id: "5",
        type: "task",
        title: "Call Sarah (Daughter)",
        description: "Weekly check-in call",
        time: "03:00 PM",
        date: "2026-01-11",
        status: "upcoming",
        priority: "medium",
    },
    {
        id: "6",
        type: "meal",
        title: "Lunch Time",
        description: "Remember to eat a healthy lunch",
        time: "12:00 PM",
        date: "2026-01-11",
        status: "completed",
        priority: "medium",
    },
    {
        id: "7",
        type: "activity",
        title: "Afternoon Walk",
        description: "30-minute walk in the park (weather permitting)",
        time: "04:00 PM",
        date: "2026-01-11",
        status: "upcoming",
        priority: "low",
    },
    {
        id: "8",
        type: "task",
        title: "Physical Therapy Session",
        description: "Bring exercise mat and water bottle",
        time: "02:00 PM",
        date: "2026-01-11",
        status: "upcoming",
        priority: "high",
    },
];

const getReminderIcon = (type: Reminder["type"]) => {
    switch (type) {
        case "medication":
            return Pill;
        case "appointment":
            return Calendar;
        case "task":
            return Bell;
        case "meal":
            return Utensils;
        case "activity":
            return Activity;
        default:
            return Bell;
    }
};

const getPriorityColor = (priority: Reminder["priority"]) => {
    switch (priority) {
        case "high":
            return "bg-red-500/10 text-red-500 border-red-500/20";
        case "medium":
            return "bg-amber-500/10 text-amber-500 border-amber-500/20";
        case "low":
            return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
};

const getStatusBadge = (status: Reminder["status"]) => {
    switch (status) {
        case "completed":
            return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Completed</Badge>;
        case "missed":
            return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Missed</Badge>;
        case "upcoming":
            return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Upcoming</Badge>;
    }
};

export default function PatientReminders() {
    const [reminders, setReminders] = useState<Reminder[]>(SAMPLE_REMINDERS);
    const [filter, setFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredReminders = reminders.filter((reminder) => {
        const matchesFilter = filter === "all" || reminder.type === filter;
        const matchesSearch = reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reminder.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const upcomingCount = reminders.filter(r => r.status === "upcoming").length;
    const completedToday = reminders.filter(r => r.status === "completed" && r.date === "2026-01-11").length;
    const missedCount = reminders.filter(r => r.status === "missed").length;

    const handleMarkComplete = (id: string) => {
        setReminders(reminders.map(r =>
            r.id === id ? { ...r, status: "completed" as const } : r
        ));
    };

    const handleMarkMissed = (id: string) => {
        setReminders(reminders.map(r =>
            r.id === id ? { ...r, status: "missed" as const } : r
        ));
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Reminders</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Stay on top of your health schedule
                    </p>
                </div>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Reminder
                </Button>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{upcomingCount}</p>
                                <p className="text-sm text-muted-foreground">Upcoming</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Check className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{completedToday}</p>
                                <p className="text-sm text-muted-foreground">Completed Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{missedCount}</p>
                                <p className="text-sm text-muted-foreground">Missed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* FILTERS */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                            placeholder="Search reminders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1"
                        />
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Reminders</SelectItem>
                                <SelectItem value="medication">Medications</SelectItem>
                                <SelectItem value="appointment">Appointments</SelectItem>
                                <SelectItem value="task">Tasks</SelectItem>
                                <SelectItem value="meal">Meals</SelectItem>
                                <SelectItem value="activity">Activities</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* REMINDERS LIST */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Reminders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {filteredReminders.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">No reminders found</p>
                        </div>
                    ) : (
                        filteredReminders.map((reminder) => {
                            const Icon = getReminderIcon(reminder.type);
                            return (
                                <div
                                    key={reminder.id}
                                    className={`p-4 border rounded-lg ${reminder.status === "completed"
                                            ? "bg-green-500/5 border-green-500/20"
                                            : reminder.status === "missed"
                                                ? "bg-red-500/5 border-red-500/20"
                                                : "bg-background hover:bg-secondary/50"
                                        } transition-colors`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getPriorityColor(reminder.priority)}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="font-semibold text-sm sm:text-base">
                                                    {reminder.title}
                                                </h4>
                                                {getStatusBadge(reminder.status)}
                                            </div>

                                            <p className="text-sm text-muted-foreground mb-2">
                                                {reminder.description}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {reminder.time}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(reminder.date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    {reminder.type}
                                                </Badge>
                                            </div>
                                        </div>

                                        {reminder.status === "upcoming" && (
                                            <div className="flex gap-1 flex-shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleMarkComplete(reminder.id)}
                                                    className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                                    title="Mark as complete"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleMarkMissed(reminder.id)}
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                    title="Mark as missed"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>

            {/* HELPFUL TIPS */}
            <Card className="mt-6 bg-blue-500/5 border-blue-500/20">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Bell className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Reminder Tips</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Set alarms on your phone for important medications</li>
                                <li>• Keep a physical calendar visible in your home</li>
                                <li>• Ask family members to help remind you</li>
                                <li>• Use our AI Assistant for instant reminder checks</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
