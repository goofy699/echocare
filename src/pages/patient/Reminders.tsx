import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
    Activity,
    AlertCircle,
    Bell,
    Calendar,
    Check,
    Clock,
    Pill,
    Plus,
    Trash2,
    Utensils,
    X,
} from "lucide-react";

import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    ReminderPriority,
    ReminderRecord,
    ReminderType,
    cancelReminder,
    createReminder,
    deleteReminder,
    getReminderBuckets,
    listenRemindersByPatient,
    markReminderCompleted,
} from "@/services/reminders";

type ReminderView = "all" | "upcoming" | "completedToday" | "missed";

const reminderTypes: ReminderType[] = ["medication", "appointment", "task", "meal", "activity"];

function getReminderIcon(type: ReminderType) {
    switch (type) {
        case "medication":
            return Pill;
        case "appointment":
            return Calendar;
        case "meal":
            return Utensils;
        case "activity":
            return Activity;
        case "task":
        default:
            return Bell;
    }
}

function getPriorityColor(priority: ReminderPriority) {
    switch (priority) {
        case "high":
            return "bg-red-500/10 text-red-500 border-red-500/20";
        case "medium":
            return "bg-amber-500/10 text-amber-500 border-amber-500/20";
        case "low":
        default:
            return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
}

function getStatusBadge(reminder: ReminderRecord, now: Date, graceMs: number) {
    const isMissed =
        reminder.status === "pending" && now.getTime() - reminder.dueAt.getTime() > graceMs;

    if (reminder.status === "completed") {
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Completed</Badge>;
    }

    if (reminder.status === "canceled") {
        return <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20">Canceled</Badge>;
    }

    if (isMissed) {
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">Missed</Badge>;
    }

    return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Upcoming</Badge>;
}

function matchesSearch(item: ReminderRecord, query: string) {
    const term = query.toLowerCase();
    return (
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.type.toLowerCase().includes(term)
    );
}

function toDateTimeLocalValue(date: Date) {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
        date.getHours(),
    )}:${pad(date.getMinutes())}`;
}

export default function PatientReminders() {
    const { toast } = useToast();
    const user = auth.currentUser;
    const graceMs = 5 * 60 * 1000; // five-minute grace window

    const [reminders, setReminders] = useState<ReminderRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [view, setView] = useState<ReminderView>("all");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [reminderType, setReminderType] = useState<ReminderType>("medication");
    const [priority, setPriority] = useState<ReminderPriority>("medium");
    const [dueAt, setDueAt] = useState<string>(toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)));
    const [saving, setSaving] = useState(false);

    const now = new Date();

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = listenRemindersByPatient(user.uid, setReminders);
        return () => unsubscribe();
    }, [user?.uid]);

    const effectiveNow = new Date(now.getTime() - graceMs);
    const buckets = useMemo(() => getReminderBuckets(reminders, effectiveNow), [effectiveNow, reminders]);

    const listByView = useMemo(() => {
        if (view === "upcoming") return buckets.upcoming;
        if (view === "completedToday") return buckets.completedToday;
        if (view === "missed") return buckets.missed;
        return reminders;
    }, [buckets.completedToday, buckets.missed, buckets.upcoming, reminders, view]);

    const filteredReminders = useMemo(() => {
        return listByView.filter((item) => {
            const typeMatch = typeFilter === "all" || item.type === typeFilter;
            const searchMatch = !searchQuery.trim() || matchesSearch(item, searchQuery.trim());
            return typeMatch && searchMatch;
        });
    }, [listByView, searchQuery, typeFilter]);

    const handleCreateReminder = async () => {
        if (!user?.uid) {
            toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
            return;
        }

        if (!title.trim()) {
            toast({ title: "Title is required", description: "Enter reminder title.", variant: "destructive" });
            return;
        }

        const dueDate = new Date(dueAt);
        if (Number.isNaN(dueDate.getTime())) {
            toast({ title: "Invalid date", description: "Choose a valid due date and time.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            await createReminder({
                patientId: user.uid,
                title: title.trim(),
                description: description.trim(),
                type: reminderType,
                priority,
                dueAt: dueDate,
                createdBy: user.uid,
            });

            setTitle("");
            setDescription("");
            setReminderType("medication");
            setPriority("medium");
            setDueAt(toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)));

            toast({ title: "Reminder saved", description: "Saved to database successfully." });
        } catch (error) {
            console.error("createReminder error", error);
            toast({
                title: "Save failed",
                description: "Could not save reminder. Check Firestore rules and try again.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async (id: string) => {
        try {
            await markReminderCompleted(id);
            toast({ title: "Reminder completed" });
        } catch (error) {
            console.error("markReminderCompleted error", error);
            toast({ title: "Action failed", description: "Could not mark as complete.", variant: "destructive" });
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await cancelReminder(id);
            toast({ title: "Reminder canceled" });
        } catch (error) {
            console.error("cancelReminder error", error);
            toast({ title: "Action failed", description: "Could not cancel reminder.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteReminder(id);
            toast({ title: "Reminder deleted" });
        } catch (error) {
            console.error("deleteReminder error", error);
            toast({ title: "Delete failed", description: "Could not delete reminder.", variant: "destructive" });
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 overflow-x-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Reminders</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage medication, appointments, meals, tasks, and activities from one place.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Reminder</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Input
                        placeholder="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />

                    <Select value={reminderType} onValueChange={(value) => setReminderType(value as ReminderType)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {reminderTypes.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {value.charAt(0).toUpperCase() + value.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={priority} onValueChange={(value) => setPriority(value as ReminderPriority)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button className="gap-2 w-full sm:w-auto" onClick={handleCreateReminder} disabled={saving}>
                        <Plus className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Reminder"}
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{buckets.upcoming.length}</p>
                            <p className="text-sm text-muted-foreground">Upcoming</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{buckets.completedToday.length}</p>
                            <p className="text-sm text-muted-foreground">Completed Today</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{buckets.missed.length}</p>
                            <p className="text-sm text-muted-foreground">Missed</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                            placeholder="Search reminders by title, type, or description"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1"
                        />

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-56">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {reminderTypes.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {value.charAt(0).toUpperCase() + value.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Tabs value={view} onValueChange={(value) => setView(value as ReminderView)}>
                        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-1">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                            <TabsTrigger value="completedToday">
                                <span className="sm:hidden">Completed</span>
                                <span className="hidden sm:inline">Completed Today</span>
                            </TabsTrigger>
                            <TabsTrigger value="missed">Missed</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Reminders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {filteredReminders.length === 0 ? (
                        <div className="text-center py-10">
                            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No reminders found for this filter.</p>
                        </div>
                    ) : (
                        filteredReminders.map((reminder) => {
                            const Icon = getReminderIcon(reminder.type);
                            const missed = reminder.status === "pending" && now.getTime() - reminder.dueAt.getTime() > graceMs;
                            const canTakeAction = reminder.status === "pending" && !missed;

                            return (
                                <div key={reminder.id} className="p-3 sm:p-4 border rounded-lg bg-background">
                                    <div className="flex flex-col sm:flex-row items-start gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getPriorityColor(
                                                reminder.priority,
                                            )}`}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                <h4 className="font-semibold">{reminder.title}</h4>
                                                {getStatusBadge(reminder, now, graceMs)}
                                            </div>

                                            {reminder.description ? (
                                                <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                                            ) : null}

                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(reminder.dueAt, "p")}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(reminder.dueAt, "PPP")}
                                                </span>
                                                <Badge variant="outline" className="capitalize">
                                                    {reminder.type}
                                                </Badge>
                                            </div>
                                        </div>

                                        {canTakeAction ? (
                                            <div className="flex gap-1 self-end sm:self-auto">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                                    onClick={() => handleComplete(reminder.id)}
                                                    title="Mark as complete"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                                    onClick={() => handleCancel(reminder.id)}
                                                    title="Mark as missed"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : missed ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(reminder.id)}
                                                title="Delete reminder"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        ) : reminder.status === "canceled" || reminder.status === "completed" ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(reminder.id)}
                                                title="Delete reminder"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
