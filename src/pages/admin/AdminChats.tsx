import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminLayout from "./AdminLayout";
import { formatDateTime } from "./adminUtils";

export default function AdminChats() {
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChatId, setSelectedChatId] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [userMap, setUserMap] = useState<Record<string, any>>({});

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "chats"), (snap) => {
            const mapped = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            mapped.sort((a: any, b: any) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
            setChats(mapped);
            if (!selectedChatId && mapped.length > 0) setSelectedChatId(mapped[0].id);
        });
        return () => unsub();
    }, [selectedChatId]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            const nextMap: Record<string, any> = {};
            snap.docs.forEach((d) => {
                nextMap[d.id] = d.data() as any;
            });
            setUserMap(nextMap);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!selectedChatId) {
            setMessages([]);
            return;
        }

        let mounted = true;
        (async () => {
            try {
                const snap = await getDocs(query(collection(db, "chats", selectedChatId, "messages"), orderBy("createdAt", "asc")));
                if (!mounted) return;
                setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
            } catch (error) {
                console.error("admin chat monitor load failed:", error);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [selectedChatId]);

    const selected = useMemo(() => chats.find((chat) => chat.id === selectedChatId) || null, [chats, selectedChatId]);

    const displayUser = (uid?: string) => {
        if (!uid) return "Unknown user";
        const u = userMap[uid];
        if (!u) return uid;
        return u.name || u.displayName || u.email || uid;
    };

    const roleOf = (uid?: string) => {
        if (!uid) return "";
        const role = userMap[uid]?.role;
        return role ? String(role) : "";
    };

    const threadLabel = (chat: any) => {
        const participants = (Array.isArray(chat.participants) ? chat.participants : [chat.patientId, chat.doctorId]).filter(Boolean);
        if (participants.length === 0) return chat.id;
        return participants.map((uid: string) => displayUser(uid)).join(" vs ");
    };

    return (
        <AdminLayout title="Admin Chat Monitor" subtitle="Privacy audit view of user chat text and attachments.">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-4 h-auto lg:h-[75vh] lg:min-h-0">
                <Card className="lg:col-span-1 p-3 flex flex-col min-h-0 lg:max-h-full">
                    <CardTitle className="text-base mb-3">Threads</CardTitle>
                    <div className="space-y-2 overflow-y-auto min-h-0 max-h-96 lg:max-h-none">
                        {chats.map((chat) => (
                            <Button key={chat.id} variant={chat.id === selectedChatId ? "secondary" : "ghost"} className="w-full justify-start h-auto py-2 px-2" onClick={() => setSelectedChatId(chat.id)}>
                                <div className="text-left min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{threadLabel(chat)}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">Thread ID: {chat.id}</p>
                                    <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "No messages"}</p>
                                </div>
                            </Button>
                        ))}
                    </div>
                </Card>

                <Card className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{selected ? threadLabel(selected) : "Select thread"}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2 sm:space-y-3 overflow-y-auto min-h-0 max-h-96 lg:max-h-none">
                        {messages.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No messages in this thread.</p>
                        ) : messages.map((message) => (
                            <div key={message.id} className="rounded-md border p-2 sm:p-3 text-sm hover:bg-accent transition">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
                                    <p className="font-medium text-xs sm:text-sm truncate">Sender: {displayUser(message.senderId)}{roleOf(message.senderId) ? ` (${roleOf(message.senderId)})` : ""}</p>
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(message.createdAt)}</p>
                                </div>
                                {message.text ? <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.text}</p> : null}
                                {message.attachment ? (
                                    <p className="text-xs text-muted-foreground mt-2">Attachment: {message.attachment.name || "file"}</p>
                                ) : null}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
