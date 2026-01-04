import { useState, useEffect } from "react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";
import {
    createChat,
    sendMessage as sendMessageToDb,
    listenToMessages,
    listenDoctors,
    fetchDoctorsViaFunction
} from "@/services/chat";
import { useToast } from "@/hooks/use-toast";

export default function PatientMessages() {
    const user = auth.currentUser;
    const [contacts, setContacts] = useState<any[]>([]);
    const [doctorsLoading, setDoctorsLoading] = useState(false);
    const [activeContact, setActiveContact] = useState<any | null>(null);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);

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
                    role: d.role || "doctor"
                }));
                setContacts(normalized);
                if (normalized.length > 0 && !activeContact) setActiveContact(normalized[0]);
            } catch (err) {
                console.error("fetchDoctorsViaFunction error:", err);
                // fallback to real-time listener
                const unsubscribe = listenDoctors((list) => {
                    if (!mounted) return;
                    const normalized = list.map((d: any) => ({
                        id: d.id,
                        name: d.name || d.displayName || d.email,
                        role: d.role || "doctor"
                    }));
                    setContacts(normalized);
                    if (normalized.length > 0 && !activeContact) setActiveContact(normalized[0]);
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
                role: d.role || "doctor"
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
        const unsubscribe = listenToMessages(chatId, (msgs) => setMessages(msgs));
        return () => unsubscribe();
    }, [chatId, activeContact, user]);

    const { toast } = useToast();

    const sendMessage = async () => {
        if (!message.trim()) {
            toast({ title: "Empty message", description: "Type a message before sending.", variant: "destructive" });
            return;
        }
        if (!user) {
            toast({ title: "Not signed in", description: "Please sign in to send messages.", variant: "destructive" });
            return;
        }

        try {
            await sendMessageToDb(chatId, user.uid, message);
            setMessage("");
            toast({ title: "Message sent", description: "Your message was delivered.", variant: "default" });
        } catch (err) {
            console.error("sendMessageToDb error:", err);
            toast({ title: "Send failed", description: "Could not send message. Try again.", variant: "destructive" });
        }
    };

    return (
        <div className="h-[80vh] grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* CONTACT LIST */}
            <Card className="lg:col-span-1 p-4 space-y-2">
                <h2 className="font-semibold mb-2">Messages</h2>
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
                            className="w-full justify-start"
                            onClick={() => setActiveContact(c)}
                        >
                            {c.name}
                            <span className="ml-auto text-xs text-muted-foreground">{c.role}</span>
                        </Button>
                    ))
                )}
            </Card>

            {/* CHAT AREA */}
            <Card className="lg:col-span-3 flex flex-col">
                <div className="border-b p-4 font-semibold">{activeContact?.name || "Select a contact"}</div>

                {/* MESSAGES */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`max-w-[70%] p-3 rounded-lg text-sm ${m.senderId === user?.uid
                                ? "ml-auto bg-primary text-primary-foreground"
                                : "bg-muted"
                                }`}
                        >
                            {m.text}
                        </div>
                    ))}
                </div>

                {/* INPUT */}
                <div className="border-t p-3 flex gap-2">
                    <Input
                        placeholder="Type a message…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button onClick={sendMessage} disabled={!message.trim() || !user}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}
