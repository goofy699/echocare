import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { listenAppointmentsForCaregiver } from "@/services/appointments";
import { createChat, listenCaregiverPatients, listenChatsByParticipant, listenToMessages, listenUsersByRole, sendMessage, uploadChatAttachment } from "@/services/chat";
import { listenSosAlertsForCaregiver, SosAlert } from "@/services/sos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, Bell, CheckCircle, AlertCircle, Clock, Pill, LogOut, Bot, X, Paperclip } from "lucide-react";

export default function CaregiverDashboard() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const caregiverId = user?.uid;
    const [caregiverName, setCaregiverName] = useState(user?.displayName || user?.email || "Caregiver");

    const [patients, setPatients] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [allReminders, setAllReminders] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
    const [showAlertsPanel, setShowAlertsPanel] = useState(false);

    const [showMiniChat, setShowMiniChat] = useState(false);
    const [showAiDummy, setShowAiDummy] = useState(false);
    const [miniRole, setMiniRole] = useState<"patient" | "doctor">("patient");
    const [miniActiveContact, setMiniActiveContact] = useState<any | null>(null);
    const [miniMessages, setMiniMessages] = useState<any[]>([]);
    const [miniMessage, setMiniMessage] = useState("");
    const [miniSending, setMiniSending] = useState(false);
    const [miniSelectedFile, setMiniSelectedFile] = useState<File | null>(null);
    const miniFileInputRef = useRef<HTMLInputElement | null>(null);

    const initials = (value?: string) => {
        const text = (value || "").trim();
        if (!text) return "U";
        const parts = text.split(/\s+/).slice(0, 2);
        return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
    };

    const contactName = (c: any) => c?.name || c?.displayName || c?.email || c?.id || "Unknown";

    useEffect(() => {
        if (!caregiverId) return;

        const unUser = onSnapshot(doc(db, "users", caregiverId), (snap) => {
            const data = snap.data() as any;
            setCaregiverName(data?.name || data?.displayName || user?.displayName || user?.email || "Caregiver");
        });

        const unPatients = listenCaregiverPatients(caregiverId, setPatients);
        const unDoctors = listenUsersByRole("doctor", setDoctors);
        const unAppointments = listenAppointmentsForCaregiver(caregiverId, setAppointments);
        const unChats = listenChatsByParticipant(caregiverId, setChats);
        const unSos = listenSosAlertsForCaregiver(caregiverId, setSosAlerts);

        const unReminders = onSnapshot(
            collection(db, "reminders"),
            (snapshot) => {
                const mapped = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }));
                setAllReminders(mapped);
            },
            (error) => {
                console.error("caregiver reminders listener failed:", error);
                setAllReminders([]);
            }
        );

        return () => {
            unUser && unUser();
            unPatients && unPatients();
            unDoctors && unDoctors();
            unAppointments && unAppointments();
            unChats && unChats();
            unReminders && unReminders();
            unSos && unSos();
        };
    }, [caregiverId, user?.displayName, user?.email]);

    const isReportMessage = (text?: string) => typeof text === "string" && text.trim().startsWith("[REPORT]");

    const miniContacts = miniRole === "patient" ? patients : doctors;

    const activeAlerts = useMemo(() => sosAlerts.filter((a) => (a.status || "active") === "active"), [sosAlerts]);

    useEffect(() => {
        if (!miniActiveContact && miniContacts.length > 0) {
            setMiniActiveContact(miniContacts[0]);
        }
    }, [miniContacts, miniActiveContact]);

    const miniChatId = caregiverId && miniActiveContact?.id ? [caregiverId, miniActiveContact.id].sort().join("_") : "";

    useEffect(() => {
        if (!showMiniChat || !caregiverId || !miniActiveContact || !miniChatId) {
            setMiniMessages([]);
            return;
        }

        const patientIdForChat = miniRole === "patient" ? miniActiveContact.id : caregiverId;
        const doctorIdForChat = miniRole === "doctor" ? miniActiveContact.id : caregiverId;
        const patientNameForChat = miniRole === "patient"
            ? contactName(miniActiveContact)
            : (user?.displayName || user?.email || caregiverId);

        createChat(miniChatId, patientIdForChat, doctorIdForChat, patientNameForChat);
        const unsubscribe = listenToMessages(miniChatId, (msgs) => {
            setMiniMessages((msgs || []).filter((m: any) => !isReportMessage(m?.text)));
        });
        return () => unsubscribe();
    }, [showMiniChat, caregiverId, miniActiveContact, miniChatId, miniRole, user?.displayName, user?.email]);

    const onMiniFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;

        const lower = file.name.toLowerCase();
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
        if (!isImage && !isPdf) {
            event.target.value = "";
            return;
        }

        if (miniFileInputRef.current) miniFileInputRef.current.value = "";
        setMiniSelectedFile(file);
    };

    const sendMiniMessage = async () => {
        if ((!miniMessage.trim() && !miniSelectedFile) || !caregiverId || !miniActiveContact || !miniChatId) return;

        try {
            setMiniSending(true);
            let attachment;
            if (miniSelectedFile) {
                attachment = await uploadChatAttachment(miniChatId, caregiverId, miniSelectedFile);
            }
            await sendMessage(miniChatId, caregiverId, miniMessage, attachment);
            setMiniMessage("");
            setMiniSelectedFile(null);
            if (miniFileInputRef.current) miniFileInputRef.current.value = "";
        } catch (error) {
            console.error("caregiver mini chat send failed:", error);
        } finally {
            setMiniSending(false);
        }
    };

    const downloadAttachment = async (attachment: any) => {
        const fileName = attachment?.name || "document.pdf";
        try {
            if (attachment?.dataBase64) {
                const link = document.createElement("a");
                link.href = String(attachment.dataBase64);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }

            const url = String(attachment?.url || "");
            if (!url) throw new Error("No attachment URL");

            const response = await fetch(url);
            if (!response.ok) throw new Error(`download failed: ${response.status}`);
            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error("caregiver mini attachment download failed:", error);
        }
    };

    const patientIds = useMemo(() => new Set(patients.map((p) => p.id)), [patients]);

    const reminders = useMemo(
        () => allReminders.filter((r: any) => patientIds.has(r.patientId)),
        [allReminders, patientIds]
    );

    const nowSec = Math.floor(Date.now() / 1000);

    const reminderStats = useMemo(() => {
        const pending = reminders.filter((r: any) => r.status === "pending");
        const completed = reminders.filter((r: any) => r.status === "completed");
        const missed = pending.filter((r: any) => {
            const due = r.dueAt?.seconds || 0;
            return due < nowSec;
        });

        return {
            pending: pending.length,
            completed: completed.length,
            missed: missed.length,
        };
    }, [reminders, nowSec]);

    const patientRows = useMemo(() => {
        return patients.map((patient: any) => {
            const patientReminders = reminders.filter((r: any) => r.patientId === patient.id);
            const hasSet = patientReminders.length > 0;
            const pending = patientReminders.filter((r: any) => r.status === "pending").length;
            const missed = patientReminders.filter((r: any) => r.status === "pending" && (r.dueAt?.seconds || 0) < nowSec).length;

            let status: "stable" | "attention" = "stable";
            if (missed > 0) status = "attention";

            return {
                id: patient.id,
                name: patient.name || patient.displayName || patient.email || patient.id,
                status,
                hasSet,
                pending,
                missed,
            };
        });
    }, [patients, reminders, nowSec]);

    const upcomingAppointments = useMemo(() => {
        const now = Date.now();
        return appointments
            .filter((a: any) => a.scheduledAt && a.scheduledAt.getTime() >= now)
            .slice(0, 5);
    }, [appointments]);

    const recentChats = useMemo(() => chats.slice(0, 5), [chats]);

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
                <Logo className="mb-8" />

                <nav className="space-y-2">
                    <Button variant="secondary" className="w-full justify-start gap-3">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/patients")}>
                        <Users className="w-4 h-4" />
                        Patients
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/messages")}>
                        <MessageSquare className="w-4 h-4" />
                        Messages
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/appointments")}>
                        <Calendar className="w-4 h-4" />
                        Schedule
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/reminders")}>
                        <Pill className="w-4 h-4" />
                        Reminders
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/settings")}>
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
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
            </aside>

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Welcome Back, {caregiverName}!</h1>
                            <p className="text-muted-foreground">Real patient tracking, reminders, appointments, and messages.</p>
                        </div>
                        <Button size="icon" variant="ghost" className="relative" onClick={() => setShowAlertsPanel((v) => !v)}>
                            <Bell className="w-5 h-5" />
                            {activeAlerts.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-destructive text-[11px] text-destructive-foreground flex items-center justify-center px-1 leading-none">
                                    {activeAlerts.length}
                                </span>
                            )}
                        </Button>
                    </div>

                    {showAlertsPanel && (
                        <Card className="border-destructive/30">
                            <CardHeader><CardTitle>Live SOS Alerts</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {activeAlerts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No active SOS alerts.</p>
                                ) : (
                                    activeAlerts.map((alert) => (
                                        <div key={alert.id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{alert.patientName || "Patient"}</p>
                                                <p className="text-xs text-muted-foreground">{Number(alert.lat || 0).toFixed(4)}, {Number(alert.lng || 0).toFixed(4)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    Open Map
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tracked Patients</CardTitle></CardHeader>
                            <CardContent><p className="text-3xl font-bold">{patients.length}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Reminders</CardTitle></CardHeader>
                            <CardContent><p className="text-3xl font-bold">{reminderStats.pending}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Missed Reminders</CardTitle></CardHeader>
                            <CardContent><p className="text-3xl font-bold text-destructive">{reminderStats.missed}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Upcoming Appointments</CardTitle></CardHeader>
                            <CardContent><p className="text-3xl font-bold">{upcomingAppointments.length}</p></CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Tracked Patients</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {patientRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No patients found.</p>
                            ) : (
                                patientRows.map((row) => (
                                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                                        <div>
                                            <p className="font-medium">{row.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {row.hasSet ? `Has reminders set (${row.pending} pending)` : "No reminders set yet"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {row.status === "attention" ? (
                                                <Badge className="bg-warning/10 text-warning"><AlertCircle className="w-3 h-3 mr-1" />Needs Attention</Badge>
                                            ) : (
                                                <Badge className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" />Stable</Badge>
                                            )}
                                            <Button size="sm" variant="outline" onClick={() => navigate("/caregiver/reminders")}>Manage</Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Medication Reminders</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="text-sm">Completed</span>
                                    <Badge className="bg-success/10 text-success">{reminderStats.completed}</Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="text-sm">Pending</span>
                                    <Badge className="bg-primary/10 text-primary">{reminderStats.pending}</Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="text-sm">Missed</span>
                                    <Badge variant="destructive">{reminderStats.missed}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Recent Messages</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {recentChats.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No message threads yet.</p>
                                ) : (
                                    recentChats.map((chat: any) => (
                                        <div key={chat.id} className="rounded-lg border p-3">
                                            <p className="font-medium text-sm">Thread: {chat.id}</p>
                                            <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "No messages yet"}</p>
                                        </div>
                                    ))
                                )}
                                <Button className="w-full" variant="outline" onClick={() => navigate("/caregiver/messages")}>Open Messages</Button>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Upcoming Schedule</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {upcomingAppointments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                            ) : (
                                upcomingAppointments.map((appointment: any) => (
                                    <div key={appointment.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{appointment.patientName} with {appointment.doctorName}</p>
                                            <p className="text-xs text-muted-foreground">{appointment.scheduledAt.toLocaleString()}</p>
                                        </div>
                                        <Badge className="bg-primary/10 text-primary"><Clock className="w-3 h-3 mr-1" />Upcoming</Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
                <Button
                    className="w-12 h-12 rounded-full shadow-lg bg-accent"
                    onClick={() => {
                        setShowAiDummy(false);
                        setShowMiniChat((prev) => !prev);
                    }}
                >
                    <MessageSquare className="w-6 h-6" />
                </Button>
                <Button
                    variant="outline"
                    className="w-12 h-12 rounded-full shadow-lg bg-white"
                    onClick={() => {
                        setShowMiniChat(false);
                        setShowAiDummy((prev) => !prev);
                    }}
                >
                    <Bot className="w-6 h-6" />
                </Button>
            </div>

            {showMiniChat && (
                <div className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-[min(96vw,560px)] z-50">
                    <Card className="shadow-large border-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base">Quick Chat</CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        {miniActiveContact ? `with ${contactName(miniActiveContact)}` : "No contact selected"}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowMiniChat(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={miniRole === "patient" ? "secondary" : "outline"}
                                    onClick={() => {
                                        setMiniRole("patient");
                                        setMiniActiveContact(null);
                                    }}
                                >
                                    Patient
                                </Button>
                                <Button
                                    size="sm"
                                    variant={miniRole === "doctor" ? "secondary" : "outline"}
                                    onClick={() => {
                                        setMiniRole("doctor");
                                        setMiniActiveContact(null);
                                    }}
                                >
                                    Doctor
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                <div className="sm:col-span-2 rounded-md border p-2 h-28 sm:h-[300px] overflow-y-auto space-y-2">
                                    {miniContacts.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No contacts found.</p>
                                    ) : (
                                        miniContacts.map((item: any) => (
                                            <Button
                                                key={item.id}
                                                variant={miniActiveContact?.id === item.id ? "secondary" : "ghost"}
                                                className="w-full justify-start h-auto py-2"
                                                onClick={() => setMiniActiveContact(item)}
                                            >
                                                <Avatar className="h-8 w-8 mr-2">
                                                    <AvatarImage src={item.photoURL || undefined} alt={contactName(item)} />
                                                    <AvatarFallback>{initials(contactName(item))}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 text-left">
                                                    <p className="text-xs font-medium truncate">{contactName(item)}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">{item.email || (miniRole === "patient" ? "Patient" : "Doctor")}</p>
                                                </div>
                                            </Button>
                                        ))
                                    )}
                                </div>

                                <div className="sm:col-span-3 h-[220px] sm:h-[300px] overflow-y-auto space-y-2 rounded-md border p-2 bg-muted/20">
                                    {miniMessages.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Start a quick conversation.</p>
                                    ) : (
                                        miniMessages.map((m: any) => (
                                            <div
                                                key={m.id}
                                                className={`max-w-[88%] p-2 rounded-md text-xs ${m.senderId === caregiverId ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
                                            >
                                                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                                                {m.attachment && (
                                                    <div className={m.text ? "mt-2" : ""}>
                                                        {m.attachment.kind === "image" ? (
                                                            <a href={m.attachment.url} target="_blank" rel="noreferrer" className="block">
                                                                <img src={m.attachment.url} alt={m.attachment.name || "attachment"} className="max-h-28 rounded border" />
                                                            </a>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadAttachment(m.attachment)}
                                                                className="underline underline-offset-2"
                                                            >
                                                                {m.attachment.name || "PDF file"}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {miniSelectedFile && (
                                <div className="rounded-md border px-2 py-1.5 text-xs flex items-center justify-between gap-2">
                                    <span className="truncate">{miniSelectedFile.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => {
                                            setMiniSelectedFile(null);
                                            if (miniFileInputRef.current) miniFileInputRef.current.value = "";
                                        }}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    ref={miniFileInputRef}
                                    type="file"
                                    accept="image/*,.pdf,application/pdf"
                                    className="hidden"
                                    onChange={onMiniFileChange}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => miniFileInputRef.current?.click()}
                                    disabled={!miniActiveContact || miniSending}
                                >
                                    <Paperclip className="w-4 h-4" />
                                </Button>
                                <Input
                                    placeholder="Type message..."
                                    value={miniMessage}
                                    onChange={(e) => setMiniMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMiniMessage()}
                                    disabled={!miniActiveContact || miniSending}
                                />
                                <Button onClick={sendMiniMessage} disabled={(!miniMessage.trim() && !miniSelectedFile) || !miniActiveContact || miniSending}>
                                    Send
                                </Button>
                            </div>

                            <Button variant="ghost" className="w-full" onClick={() => navigate("/caregiver/messages")}>
                                Open Full Chat
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showAiDummy && (
                <div className="fixed bottom-24 right-6 w-[min(92vw,340px)] z-50">
                    <Card className="shadow-large border-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Bot className="w-4 h-4" />
                                    AI Assistant
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAiDummy(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                AI chatbot integration is coming soon. This button is active and ready for your future AI service.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
