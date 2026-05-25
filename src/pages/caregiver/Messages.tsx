import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { createChat, listenToMessages, listenUsersByRole, sendMessage, uploadChatAttachment, markMessagesSeen, listenCaregiverPatients } from "@/services/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, Pill, Paperclip, Send, X, FileText, LogOut, Menu } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function CaregiverMessages() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const caregiverId = user?.uid;

    const [mode, setMode] = useState<"patients" | "doctors">("patients");
    const [patients, setPatients] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [active, setActive] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [message, setMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const initials = (value?: string) => {
        const text = (value || "").trim();
        if (!text) return "U";
        const parts = text.split(/\s+/).slice(0, 2);
        return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
    };

    const displayName = (item: any) => item?.name || item?.displayName || item?.email || item?.id || "Unknown";

    const displaySub = (item: any) => {
        if (mode === "doctors") {
            const status = item?.availability === "available" ? "On shift" : "Off shift";
            return status;
        }
        return item?.email || "Patient";
    };

    const isReportMessage = (text?: string) => typeof text === "string" && text.trim().startsWith("[REPORT]");

    useEffect(() => {
        if (!caregiverId) return;
        const unPatients = listenCaregiverPatients(caregiverId, setPatients);
        const unDoctors = listenUsersByRole("doctor", setDoctors);
        return () => {
            unPatients && unPatients();
            unDoctors && unDoctors();
        };
    }, [caregiverId]);

    const assignedDoctorIds = useMemo(() => {
        const ids = new Set<string>();
        patients.forEach((p) => {
            if (p.assignedDoctorId) ids.add(p.assignedDoctorId);
            if (Array.isArray(p.assignedDoctors)) p.assignedDoctors.forEach((d: string) => ids.add(d));
            if (p.doctorId) ids.add(p.doctorId);
        });
        return Array.from(ids);
    }, [patients]);

    const filteredDoctors = useMemo(() => {
        if (assignedDoctorIds.length === 0) return [] as any[];
        return doctors.filter((d) => assignedDoctorIds.includes(d.id));
    }, [doctors, assignedDoctorIds]);

    const contacts = mode === "patients" ? patients : filteredDoctors;

    useEffect(() => {
        if (!active && contacts.length > 0) {
            setActive(contacts[0]);
        }
    }, [active, contacts]);

    useEffect(() => {
        if (active && !contacts.find((c) => c.id === active.id)) {
            setActive(contacts[0] || null);
        }
    }, [contacts, active]);

    const chatId = caregiverId && active?.id ? [caregiverId, active.id].sort().join("_") : "";

    useEffect(() => {
        if (!caregiverId || !active || !chatId) {
            setMessages([]);
            return;
        }

        const patientIdForChat = mode === "patients" ? active.id : caregiverId;
        const doctorIdForChat = mode === "doctors" ? active.id : caregiverId;
        const patientNameForChat = mode === "patients"
            ? displayName(active)
            : (user?.displayName || user?.email || caregiverId);

        createChat(chatId, patientIdForChat, doctorIdForChat, patientNameForChat);
        const unsubscribe = listenToMessages(chatId, (msgs) => {
            const cleaned = (msgs || []).filter((m: any) => !isReportMessage(m?.text));
            setMessages(cleaned);
            markMessagesSeen(chatId, caregiverId).catch(() => undefined);
        });
        return () => unsubscribe();
    }, [active, caregiverId, chatId, user, mode]);

    const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;
        const lower = file.name.toLowerCase();
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
        if (!isImage && !isPdf) {
            event.target.value = "";
            return;
        }
        setSelectedFile(file);
    };

    const getPrimaryDoctorId = (patient: any) => {
        if (!patient) return null;
        if (patient.assignedDoctorId) return patient.assignedDoctorId;
        if (patient.doctorId) return patient.doctorId;
        if (Array.isArray(patient.assignedDoctors) && patient.assignedDoctors.length > 0) return patient.assignedDoctors[0];
        return null;
    };

    const parseMapFromText = (text?: string) => {
        if (typeof text !== "string") return null;
        const regex = /https?:\/\/maps\.google\.com\/(?:\?q=|maps\?q=)?([-.\d]+),([-.\d]+)/i;
        const match = text.match(regex);
        if (!match) return null;
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        const url = match[0];
        return { lat, lng, url };
    };

    const send = async () => {
        if ((!message.trim() && !selectedFile) || !caregiverId || !chatId || !active) return;
        try {
            setSending(true);
            let attachment;
            if (selectedFile) attachment = await uploadChatAttachment(chatId, caregiverId, selectedFile);
            await sendMessage(chatId, caregiverId, message, attachment);

            if (mode === "patients") {
                const doctorId = getPrimaryDoctorId(active);
                if (doctorId) {
                    const doctorChatId = [active.id, doctorId].sort().join("_");
                    const textForDoctor = message ? `Caregiver note: ${message}` : "Caregiver shared an update.";
                    await createChat(doctorChatId, active.id, doctorId, displayName(active));
                    await sendMessage(doctorChatId, caregiverId, textForDoctor, undefined, { senderRole: "caregiver" });
                }
            }
            setMessage("");
            setSelectedFile(null);
            if (fileRef.current) fileRef.current.value = "";
        } finally {
            setSending(false);
        }
    };

    const downloadAttachment = async (attachment: any) => {
        if (!attachment) return;
        const fileName = attachment?.name || "attachment";
        if (attachment?.dataBase64) {
            const link = document.createElement("a");
            link.href = String(attachment.dataBase64);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        const response = await fetch(String(attachment.url || ""));
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    };

    const label = useMemo(() => displayName(active) || "Select contact", [active]);

    const NavLinks = () => (
        <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver")}><LayoutDashboard className="w-4 h-4" />Dashboard</Button>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/patients")}><Users className="w-4 h-4" />Patients</Button>
            <Button variant="secondary" className="w-full justify-start gap-3"><MessageSquare className="w-4 h-4" />Messages</Button>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/appointments")}><Calendar className="w-4 h-4" />Schedule</Button>
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
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 h-[80vh] min-h-0">
                        <Card className="lg:col-span-1 p-4 flex flex-col min-h-0">
                            <div className="flex gap-2 mb-3">
                                <Button size="sm" variant={mode === "patients" ? "secondary" : "outline"} onClick={() => { setMode("patients"); setActive(null); }}>Patient</Button>
                                <Button size="sm" variant={mode === "doctors" ? "secondary" : "outline"} onClick={() => { setMode("doctors"); setActive(null); }}>Doctor</Button>
                            </div>
                            <div className="space-y-2 overflow-y-auto min-h-0">
                                {contacts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {mode === "patients" ? "No assigned patients." : "No linked doctors for your patients."}
                                    </p>
                                ) : contacts.map((item: any) => (
                                    <Button key={item.id} variant={active?.id === item.id ? "secondary" : "ghost"} className="w-full justify-start h-auto py-2" onClick={() => setActive(item)}>
                                        <Avatar className="h-8 w-8 mr-3">
                                            <AvatarImage src={item.photoURL || undefined} alt={displayName(item)} />
                                            <AvatarFallback>{initials(displayName(item))}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 text-left">
                                            <p className="font-medium truncate">{displayName(item)}</p>
                                            <p className="text-xs text-muted-foreground truncate">{displaySub(item)}</p>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </Card>

                        <Card className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
                            <CardHeader>
                                <CardTitle>
                                    {active ? (
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={active.photoURL || undefined} alt={label} />
                                                <AvatarFallback>{initials(label)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-base font-semibold">{label}</p>
                                                <p className="text-xs text-muted-foreground font-normal">{displaySub(active)}</p>
                                            </div>
                                        </div>
                                    ) : "Select contact"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0">
                                {messages.map((m: any) => {
                                    const createdAt: Date | null = m.createdAt?.toDate
                                        ? m.createdAt.toDate()
                                        : m.createdAt
                                            ? new Date(m.createdAt)
                                            : null;
                                    const timeLabel = createdAt ? format(createdAt, "p") : "Sending…";
                                    const isMine = m.senderId === caregiverId;
                                    const seenBy = Array.isArray(m.seenBy) ? m.seenBy : [];
                                    const counterpartId = active?.id;
                                    const seen = isMine && counterpartId ? seenBy.includes(counterpartId) : false;
                                    const statusLabel = isMine ? (seen ? `Seen · ${timeLabel}` : `Sent · ${timeLabel}`) : timeLabel;
                                    const mapInfo = parseMapFromText(m.text);

                                    return (
                                        <div key={m.id} className="space-y-1">
                                            <div
                                                className={`max-w-[70%] p-3 rounded-lg text-sm ${isMine
                                                    ? "ml-auto bg-primary text-primary-foreground"
                                                    : "bg-muted"
                                                    }`}
                                            >
                                                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                                                {mapInfo && (
                                                    <div className="mt-3 space-y-2">
                                                        <div className="overflow-hidden rounded-md border bg-background/70">
                                                            <iframe
                                                                title="SOS location map"
                                                                src={`https://www.google.com/maps?q=${mapInfo.lat},${mapInfo.lng}&z=15&output=embed`}
                                                                loading="lazy"
                                                                className="h-48 w-full"
                                                                allowFullScreen
                                                            />
                                                        </div>
                                                        <a
                                                            href={mapInfo.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-2 text-xs font-medium underline"
                                                        >
                                                            Open full map
                                                        </a>
                                                    </div>
                                                )}
                                                {m.attachment && (
                                                    <div className={m.text ? "mt-2" : ""}>
                                                        {m.attachment.kind === "image" ? (
                                                            <a href={m.attachment.url} target="_blank" rel="noreferrer" className="block">
                                                                <img
                                                                    src={m.attachment.url}
                                                                    alt={m.attachment.name || "attachment"}
                                                                    className="max-h-48 rounded-md border"
                                                                />
                                                            </a>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadAttachment(m.attachment)}
                                                                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-background/60"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                                <span className="truncate max-w-[180px]">{m.attachment.name || "PDF file"}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-[11px] text-muted-foreground ${isMine ? "text-right" : "text-left"}`}>
                                                {statusLabel}
                                            </p>
                                        </div>
                                    );
                                })}
                            </CardContent>
                            <div className="border-t p-3 space-y-2">
                                {selectedFile && (
                                    <div className="rounded-md border px-3 py-2 text-sm flex items-center justify-between">
                                        <span className="truncate">{selectedFile.name}</span>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedFile(null)}><X className="w-4 h-4" /></Button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input ref={fileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={onPickFile} />
                                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={!active || sending}><Paperclip className="w-4 h-4" /></Button>
                                    <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." disabled={!active || sending} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} />
                                    <Button onClick={send} disabled={(!message.trim() && !selectedFile) || !active || sending}><Send className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
