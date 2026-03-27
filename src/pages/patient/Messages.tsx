import { useState, useEffect, useRef } from "react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Paperclip, X, FileText } from "lucide-react";
import {
    createChat,
    sendMessage as sendMessageToDb,
    listenToMessages,
    listenDoctors,
    fetchDoctorsViaFunction,
    uploadChatAttachment,
} from "../../services/chat";
import { useToast } from "@/hooks/use-toast";

export default function PatientMessages() {
    const user = auth.currentUser;
    const [contacts, setContacts] = useState<any[]>([]);
    const [doctorsLoading, setDoctorsLoading] = useState(false);
    const [activeContact, setActiveContact] = useState<any | null>(null);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const isReportMessage = (text?: string) =>
        typeof text === "string" && text.trim().startsWith("[REPORT]");

    const pickPreferredDoctor = (list: any[]) => {
        const preferredDoctorId = localStorage.getItem("patient_selected_doctor_id");
        if (!preferredDoctorId) {
            if (list.length > 0 && !activeContact) setActiveContact(list[0]);
            return;
        }

        const preferred = list.find((doctor) => doctor.id === preferredDoctorId);
        if (preferred) {
            setActiveContact(preferred);
            localStorage.removeItem("patient_selected_doctor_id");
            return;
        }

        if (list.length > 0 && !activeContact) setActiveContact(list[0]);
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
            console.error("Attachment download failed:", error);
        }
    };

    // Load doctors on mount
    useEffect(() => {
        let mounted = true;
        setDoctorsLoading(true);

        const loadDoctors = async () => {
            try {
                const list = await fetchDoctorsViaFunction(); // fetch via HTTP callable
                if (!mounted) return;
                const normalized = list.map((d: any) => ({
                    id: d.id,
                    name: d.name || d.displayName || d.email,
                    role: d.role || "doctor",
                    availability: d.availability || "available",
                    phone: d.phone || "",
                    specialization: d.specialization || "",
                    hospital: d.hospital || "",
                }));
                setContacts(normalized);
                pickPreferredDoctor(normalized);
            } catch (err) {
                console.error("fetchDoctorsViaFunction error:", err);
                // fallback to real-time listener
                const unsubscribe = listenDoctors((list) => {
                    if (!mounted) return;
                    const normalized = list.map((d: any) => ({
                        id: d.id,
                        name: d.name || d.displayName || d.email,
                        role: d.role || "doctor",
                        availability: d.availability || "available",
                        phone: d.phone || "",
                        specialization: d.specialization || "",
                        hospital: d.hospital || "",
                    }));
                    setContacts(normalized);
                    pickPreferredDoctor(normalized);
                });
                return () => unsubscribe && unsubscribe();
            } finally {
                setDoctorsLoading(false);
            }
        };

        loadDoctors();

        return () => { mounted = false };
    }, []);

    const refreshDoctors = async () => {
        setDoctorsLoading(true);
        try {
            const list = await fetchDoctorsViaFunction();
            const normalized = list.map((d: any) => ({
                id: d.id,
                name: d.name || d.displayName || d.email,
                role: d.role || "doctor",
                availability: d.availability || "available",
                phone: d.phone || "",
                specialization: d.specialization || "",
                hospital: d.hospital || "",
            }));
            setContacts(normalized);
        } catch (err) {
            console.error("refreshDoctors error:", err);
        } finally {
            setDoctorsLoading(false);
        }
    };

    // Generate unique chat ID
    const chatId = user && activeContact
        ? [user.uid, activeContact.id].sort().join("_")
        : "";

    // Listen to messages
    useEffect(() => {
        if (!chatId || !user || !activeContact) return;

        createChat(chatId, user.uid, activeContact.id, user.displayName || user.email || user.uid); // ensure chat exists (persist patient name)
        const unsubscribe = listenToMessages(chatId, (msgs) => {
            setMessages((msgs || []).filter((m: any) => !isReportMessage(m?.text)));
        });
        return () => unsubscribe();
    }, [chatId, activeContact, user]);

    const { toast } = useToast();

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;

        const lowerName = file.name.toLowerCase();
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");

        if (!isImage && !isPdf) {
            toast({ title: "Invalid file", description: "Only images and PDF files are allowed.", variant: "destructive" });
            event.target.value = "";
            return;
        }

        setSelectedFile(file);
    };

    const sendMessage = async () => {
        if (!message.trim() && !selectedFile) {
            toast({ title: "Empty message", description: "Type a message or attach a file before sending.", variant: "destructive" });
            return;
        }
        if (!user) {
            toast({ title: "Not signed in", description: "Please sign in to send messages.", variant: "destructive" });
            return;
        }
        if (!chatId) {
            toast({ title: "No active chat", description: "Select a doctor first.", variant: "destructive" });
            return;
        }

        try {
            setSending(true);

            let attachment;
            if (selectedFile) {
                attachment = await uploadChatAttachment(chatId, user.uid, selectedFile);
            }

            await sendMessageToDb(chatId, user.uid, message, attachment);
            setMessage("");
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            toast({ title: "Message sent", description: "Your message was delivered.", variant: "default" });
        } catch (err) {
            console.error("sendMessageToDb error:", err);
            toast({ title: "Send failed", description: "Could not send message. Try again.", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="h-[80vh] overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* CONTACT LIST */}
            <Card className="lg:col-span-1 p-4 flex flex-col min-h-0">
                <h2 className="font-semibold mb-2">Messages</h2>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
                    {doctorsLoading ? (
                        <p className="text-sm text-muted-foreground">Loading doctors…</p>
                    ) : contacts.length === 0 ? (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">No doctors found.</p>
                            <Button size="sm" onClick={refreshDoctors}>Refresh</Button>
                        </div>
                    ) : (
                        contacts.map((c) => (
                            <Button
                                key={c.id}
                                variant={activeContact?.id === c.id ? "secondary" : "ghost"}
                                className="w-full justify-start h-auto py-3"
                                onClick={() => setActiveContact(c)}
                            >
                                <div className="min-w-0 text-left">
                                    <p className="font-medium truncate">{c.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {c.specialization || "General Medicine"}
                                    </p>
                                </div>
                                <span className={`ml-auto text-xs ${c.availability === "available" ? "text-green-600" : "text-slate-500"}`}>
                                    {c.availability === "available" ? "Available" : "Unavailable"}
                                </span>
                            </Button>
                        ))
                    )}
                </div>
            </Card>

            {/* CHAT AREA */}
            <Card className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
                <div className="border-b p-4">
                    <p className="font-semibold">{activeContact?.name || "Select a contact"}</p>
                    {activeContact && (
                        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                            <p>{activeContact.specialization || "General Medicine"}</p>
                            {activeContact.phone && <p>Phone: {activeContact.phone}</p>}
                            {activeContact.hospital && <p>{activeContact.hospital}</p>}
                        </div>
                    )}
                </div>

                {/* MESSAGES */}
                <div className="flex-1 min-h-0 p-4 space-y-3 overflow-y-auto overscroll-contain">
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`max-w-[70%] p-3 rounded-lg text-sm ${m.senderId === user?.uid
                                ? "ml-auto bg-primary text-primary-foreground"
                                : "bg-muted"
                                }`}
                        >
                            {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
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
                    ))}
                </div>

                {/* INPUT */}
                <div className="border-t p-3 flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        className="hidden"
                        onChange={onPickFile}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!user || sending}
                    >
                        <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input
                        placeholder="Type a message…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        disabled={sending || !user}
                    />
                    <Button onClick={sendMessage} disabled={(!message.trim() && !selectedFile) || !user || sending}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                {selectedFile && (
                    <div className="px-3 pb-3">
                        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <span className="truncate">{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                    setSelectedFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
