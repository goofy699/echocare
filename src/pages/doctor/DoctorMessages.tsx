import { useEffect, useState } from "react";
import { useUserRole } from "@/lib/useUserRole";
import { auth } from "@/firebase";
import {
    sendMessage as sendMessageToDb,
    listenToMessages,
    createChat,
    listenDoctorChats,
    listenPatientsForDoctor,
    uploadChatAttachment,
} from "../../services/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CalendarIcon, MessageSquare, BarChart3, Settings, Paperclip, X, FileText, Send } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function DoctorMessages() {
    const { role, loading } = useUserRole();
    const doctorId = auth.currentUser?.uid;
    const navigate = useNavigate();

    const [chats, setChats] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [patientsLoading, setPatientsLoading] = useState(false);
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);

    const isReportMessage = (text?: string) =>
        typeof text === "string" && text.trim().startsWith("[REPORT]");

    const getPreferredPatientId = () => localStorage.getItem("doctor_selected_patient_id");

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

    // ...existing code...

    useEffect(() => {
        if (!doctorId) return;

        const unsubscribe = listenDoctorChats(doctorId, (chatList) => {
            const enriched = chatList.map((c) => {
                const p = patients.find((x) => x.id === c.patientId);
                const nameFromPatients = p?.name;
                let patientName = c.patientName as string | undefined;
                const looksLikeId = (s: string | undefined) =>
                    typeof s === "string" && /^[A-Za-z0-9_-]{10,}$/.test(s);
                if ((!patientName || looksLikeId(patientName)) && nameFromPatients) {
                    patientName = nameFromPatients;
                }
                return { ...c, patientName };
            });

            setChats(enriched);
            if (!activeChat && enriched.length > 0) setActiveChat(enriched[0]);
        });

        return () => unsubscribe && unsubscribe();
    }, [doctorId, patients, activeChat]);

    useEffect(() => {
        if (!doctorId) return;
        let mounted = true;
        setPatientsLoading(true);

        const unsubscribe = listenPatientsForDoctor(doctorId, (list) => {
            if (!mounted) return;
            const normalized = list.map((u: any) => ({
                id: u.id,
                name: u.name || u.displayName || u.email || u.id,
            }));
            setPatients(normalized);
            setPatientsLoading(false);
        });

        return () => {
            mounted = false;
            unsubscribe && unsubscribe();
        };
    }, [doctorId]);

    useEffect(() => {
        if (!doctorId) return;

        const preferredPatientId = getPreferredPatientId();
        if (!preferredPatientId) return;

        const preferredPatient = patients.find((patient) => patient.id === preferredPatientId);
        if (!preferredPatient) return;

        const existingChat = chats.find((chat) => chat.patientId === preferredPatientId);
        if (existingChat) {
            setActiveChat(existingChat);
            localStorage.removeItem("doctor_selected_patient_id");
            return;
        }

        (async () => {
            const chatId = [preferredPatient.id, doctorId].sort().join("_");
            try {
                await createChat(chatId, preferredPatient.id, doctorId, preferredPatient.name);
                setActiveChat({
                    id: chatId,
                    patientId: preferredPatient.id,
                    doctorId,
                    patientName: preferredPatient.name,
                });
                localStorage.removeItem("doctor_selected_patient_id");
            } catch (error) {
                console.error("Error creating preferred patient chat:", error);
            }
        })();
    }, [doctorId, patients, chats]);

    useEffect(() => {
        if (!doctorId) return;
        if (activeChat) return;
        if (getPreferredPatientId()) return;
        if (patients.length === 0) return;

        const patient = patients[0];
        const existingChat = chats.find((c) => c.patientId === patient.id);
        if (existingChat) {
            setActiveChat(existingChat);
            return;
        }

        (async () => {
            const chatId = [patient.id, doctorId].sort().join("_");
            try {
                await createChat(chatId, patient.id, doctorId, patient.name);
            } catch (e) {
                console.error("Error creating chat for auto-select:", e);
            }
            setActiveChat({
                id: chatId,
                patientId: patient.id,
                doctorId,
                patientName: patient.name,
            });
        })();
    }, [doctorId, patients, chats, activeChat]);

    useEffect(() => {
        if (!activeChat) return;

        const unsubscribe = listenToMessages(activeChat.id, (msgs) => {
            setMessages((msgs || []).filter((m: any) => !isReportMessage(m?.text)));
        });
        return () => unsubscribe && unsubscribe();
    }, [activeChat]);

    const handleSend = async () => {
        if ((!newMessage.trim() && !selectedFile) || !activeChat || !doctorId) return;

        try {
            setSending(true);
            let attachment;
            if (selectedFile) {
                attachment = await uploadChatAttachment(activeChat.id, doctorId, selectedFile);
            }

            await sendMessageToDb(activeChat.id, doctorId, newMessage, attachment);
            setNewMessage("");
            setSelectedFile(null);
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setSending(false);
        }
    };

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;

        const lowerName = file.name.toLowerCase();
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");

        if (!isImage && !isPdf) {
            event.target.value = "";
            return;
        }

        setSelectedFile(file);
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="h-screen bg-background flex overflow-hidden">
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
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => navigate("/doctor/patients")}
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
                        variant="secondary"
                        className="w-full justify-start gap-3"
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
            <main className="flex-1 overflow-hidden">
                <div className="max-w-6xl h-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 min-h-0">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Messages</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Chat with your patients securely.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                        {/* Patient List */}
                        <Card className="lg:col-span-1 p-4 flex flex-col min-h-0">
                            <h2 className="font-semibold mb-2">Patients</h2>
                            <div className="space-y-2 overflow-y-auto min-h-0">
                                {patientsLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading patients…</p>
                                ) : patients.length === 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">No patients found.</p>
                                    </div>
                                ) : (
                                    patients.map((patient) => {
                                        const chat = chats.find((c) => c.patientId === patient.id);
                                        const label =
                                            (chat && (chat.patientName || patient.name)) ||
                                            patient.name ||
                                            patient.id;

                                        return (
                                            <Button
                                                key={patient.id}
                                                variant={
                                                    activeChat?.patientId === patient.id ? "secondary" : "ghost"
                                                }
                                                className="w-full justify-start"
                                                onClick={async () => {
                                                    if (chat) {
                                                        setActiveChat(chat);
                                                    } else if (doctorId) {
                                                        const chatId = [patient.id, doctorId].sort().join("_");
                                                        await createChat(chatId, patient.id, doctorId, patient.name);
                                                        setActiveChat({
                                                            id: chatId,
                                                            patientId: patient.id,
                                                            doctorId,
                                                            patientName: patient.name,
                                                        });
                                                    }
                                                }}
                                            >
                                                {label}
                                            </Button>
                                        );
                                    })
                                )}
                            </div>
                        </Card>

                        {/* Active chat */}
                        <Card className="lg:col-span-2 flex flex-col min-h-0">
                            <CardHeader>
                                <CardTitle>
                                    {activeChat
                                        ? activeChat.patientName || activeChat.patientId
                                        : "Select a patient"}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`max-w-[70%] p-3 rounded-lg text-sm ${m.senderId === doctorId
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
                            </CardContent>

                            <div className="border-t p-3 space-y-2">
                                {selectedFile && (
                                    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                        <span className="truncate">{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => setSelectedFile(null)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <input
                                        id="doctor-chat-attachment"
                                        type="file"
                                        accept="image/*,.pdf,application/pdf"
                                        className="hidden"
                                        onChange={onFileChange}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById("doctor-chat-attachment")?.click()}
                                        disabled={sending || !activeChat}
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </Button>
                                    <Input
                                        placeholder="Type a message…"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                        disabled={sending || !activeChat}
                                    />
                                    <Button onClick={handleSend} disabled={(!newMessage.trim() && !selectedFile) || sending || !activeChat}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}