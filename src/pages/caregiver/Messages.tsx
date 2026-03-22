import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { createChat, listenToMessages, listenUsersByRole, sendMessage, uploadChatAttachment } from "@/services/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, Pill, Paperclip, Send, X, FileText } from "lucide-react";

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

    useEffect(() => {
        const unPatients = listenUsersByRole("patient", setPatients);
        const unDoctors = listenUsersByRole("doctor", setDoctors);
        return () => {
            unPatients && unPatients();
            unDoctors && unDoctors();
        };
    }, []);

    const contacts = mode === "patients" ? patients : doctors;

    useEffect(() => {
        if (!active && contacts.length > 0) {
            setActive(contacts[0]);
        }
    }, [active, contacts]);

    const chatId = caregiverId && active?.id ? [caregiverId, active.id].sort().join("_") : "";

    useEffect(() => {
        if (!caregiverId || !active || !chatId) {
            setMessages([]);
            return;
        }

        createChat(chatId, caregiverId, active.id, user?.displayName || user?.email || caregiverId);
        const unsubscribe = listenToMessages(chatId, setMessages);
        return () => unsubscribe();
    }, [active, caregiverId, chatId, user]);

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

    const send = async () => {
        if ((!message.trim() && !selectedFile) || !caregiverId || !chatId || !active) return;
        try {
            setSending(true);
            let attachment;
            if (selectedFile) attachment = await uploadChatAttachment(chatId, caregiverId, selectedFile);
            await sendMessage(chatId, caregiverId, message, attachment);
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

    const label = useMemo(() => active?.name || active?.displayName || active?.email || "Select contact", [active]);

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver")}><LayoutDashboard className="w-4 h-4" />Dashboard</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/patients")}><Users className="w-4 h-4" />Patients</Button>
                    <Button variant="secondary" className="w-full justify-start gap-3"><MessageSquare className="w-4 h-4" />Messages</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/appointments")}><Calendar className="w-4 h-4" />Schedule</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/reminders")}><Pill className="w-4 h-4" />Reminders</Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/caregiver/settings")}><Settings className="w-4 h-4" />Settings</Button>
                </nav>
            </aside>

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 h-[80vh] min-h-0">
                    <Card className="lg:col-span-1 p-4 flex flex-col min-h-0">
                        <div className="flex gap-2 mb-3">
                            <Button size="sm" variant={mode === "patients" ? "secondary" : "outline"} onClick={() => { setMode("patients"); setActive(null); }}>Patients</Button>
                            <Button size="sm" variant={mode === "doctors" ? "secondary" : "outline"} onClick={() => { setMode("doctors"); setActive(null); }}>Doctors</Button>
                        </div>
                        <div className="space-y-2 overflow-y-auto min-h-0">
                            {contacts.map((item: any) => (
                                <Button key={item.id} variant={active?.id === item.id ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActive(item)}>
                                    {item.name || item.displayName || item.email || item.id}
                                </Button>
                            ))}
                        </div>
                    </Card>

                    <Card className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
                        <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
                        <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0">
                            {messages.map((m: any) => (
                                <div key={m.id} className={`max-w-[75%] p-3 rounded-lg text-sm ${m.senderId === caregiverId ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                                    {m.attachment && (
                                        <div className={m.text ? "mt-2" : ""}>
                                            {m.attachment.kind === "image" ? (
                                                <a href={m.attachment.url} target="_blank" rel="noreferrer"><img src={m.attachment.url} alt={m.attachment.name || "attachment"} className="max-h-40 rounded border" /></a>
                                            ) : (
                                                <button type="button" onClick={() => downloadAttachment(m.attachment)} className="inline-flex items-center gap-1 underline">
                                                    <FileText className="w-4 h-4" /> {m.attachment.name || "PDF"}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
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
    );
}
