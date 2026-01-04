import { useEffect, useState } from "react";
import { useUserRole } from "@/lib/useUserRole"; // your existing hook
import { auth } from "@/firebase";
import { sendMessage, listenToMessages, createChat, listenDoctorChats, listPatientsForDoctor, listenPatientsForDoctor, fetchPatientsForDoctorViaFunction } from "@/services/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DoctorMessages() {
    const { role, loading } = useUserRole();
    const doctorId = auth.currentUser?.uid;

    const [chats, setChats] = useState<any[]>([]); // list of chats (patients)
    const [patients, setPatients] = useState<any[]>([]); // list of patients from users collection
    const [patientsLoading, setPatientsLoading] = useState(false);
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");

    // Load all chats for this doctor and merge friendly names from patients list when available
    useEffect(() => {
        if (!doctorId) return;

        const unsubscribe = listenDoctorChats(doctorId, (chatList) => {
            const enriched = chatList.map((c) => {
                const p = patients.find((x) => x.id === c.patientId);
                const nameFromPatients = p?.name;
                let patientName = c.patientName as string | undefined;
                const looksLikeId = (s: string | undefined) => typeof s === "string" && /^[A-Za-z0-9_-]{10,}$/.test(s);
                if ((!patientName || looksLikeId(patientName)) && nameFromPatients) {
                    patientName = nameFromPatients;
                }
                return { ...c, patientName };
            });

            setChats(enriched);
            // Auto-select first chat if none selected yet
            if (!activeChat && enriched.length > 0) setActiveChat(enriched[0]);
        });

        return () => unsubscribe && unsubscribe();
    }, [doctorId, patients, activeChat]);

    // Real-time patients list for this doctor (prefers assigned patients)
    useEffect(() => {
        if (!doctorId) return;
        let mounted = true;
        setPatientsLoading(true);

        // Try server-backed fetch first (handles strict rules)
        fetchPatientsForDoctorViaFunction(doctorId).then((list) => {
            if (!mounted) return;
            const normalized = list.map((u: any) => ({ id: u.id, name: u.name || u.displayName || u.email || u.id }));
            setPatients(normalized);
            setPatientsLoading(false);
        }).catch((err) => {
            console.error("fetchPatientsViaFunction error:", err);
            // Fallback to client listener if available (may still be blocked if rules are strict)
            const unsubscribe = listenPatientsForDoctor(doctorId, (list) => {
                if (!mounted) return;
                const normalized = list.map((u: any) => ({ id: u.id, name: u.name || u.displayName || u.email || u.id }));
                setPatients(normalized);
                setPatientsLoading(false);
            });

            // attach cleanup
            return () => unsubscribe && unsubscribe();
        });

        return () => { mounted = false };
    }, [doctorId]);

    // If patients exist and there's no active chat yet, pick first patient and ensure chat exists
    useEffect(() => {
        if (!doctorId) return;
        if (activeChat) return;
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
            setActiveChat({ id: chatId, patientId: patient.id, doctorId, patientName: patient.name });
        })();
    }, [doctorId, patients, chats, activeChat]);

    const refreshPatients = async () => {
        if (!doctorId) return;
        setPatientsLoading(true);
        try {
            const list = await fetchPatientsForDoctorViaFunction(doctorId);
            const normalized = list.map((u: any) => ({ id: u.id, name: u.name || u.displayName || u.email || u.id }));
            setPatients(normalized);
        } catch (e) {
            console.error("refreshPatients error:", e);
        } finally {
            setPatientsLoading(false);
        }
    };

    // Listen to active chat messages
    useEffect(() => {
        if (!activeChat) return;

        const unsubscribe = listenToMessages(activeChat.id, setMessages);
        return () => unsubscribe && unsubscribe();
    }, [activeChat]);

    const handleSend = async () => {
        if (!newMessage.trim() || !activeChat || !doctorId) return;

        await sendMessage(activeChat.id, doctorId, newMessage);
        setNewMessage("");
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="h-[80vh] grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
            {/* Chat list */}
            <Card className="lg:col-span-1 p-4 space-y-2">
                <h2 className="font-semibold mb-2">Patients</h2>
                {patientsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading patients…</p>
                ) : patients.length === 0 ? (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">No patients found.</p>
                        <Button size="sm" onClick={refreshPatients}>Refresh</Button>
                    </div>
                ) : (
                    patients.map((patient) => {
                        const chat = chats.find((c) => c.patientId === patient.id);
                        const label = (chat && (chat.patientName || patient.name)) || patient.name || patient.id;
                        return (
                            <Button
                                key={patient.id}
                                variant={activeChat?.patientId === patient.id ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={async () => {
                                    if (chat) {
                                        setActiveChat(chat);
                                    } else if (doctorId) {
                                        const chatId = [patient.id, doctorId].sort().join("_");
                                        await createChat(chatId, patient.id, doctorId, patient.name);
                                        // set a temporary active chat object; listener will pick it up
                                        setActiveChat({ id: chatId, patientId: patient.id, doctorId, patientName: patient.name });
                                    }
                                }}
                            >
                                {label}
                            </Button>
                        );
                    })
                )}
            </Card>

            {/* Active chat */}
            <Card className="lg:col-span-3 flex flex-col">
                <CardHeader>
                    <CardTitle>
                        {activeChat ? activeChat.patientName || activeChat.patientId : "Select a patient"}
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`max-w-[70%] p-3 rounded-lg text-sm ${m.senderId === doctorId ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                        >
                            {m.text}
                        </div>
                    ))}
                </CardContent>

                <div className="border-t p-3 flex gap-2">
                    <Input
                        placeholder="Type a message…"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <Button onClick={handleSend}>Send</Button>
                </div>
            </Card>
        </div>
    );
}


