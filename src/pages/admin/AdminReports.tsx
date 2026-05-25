import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "./AdminLayout";
import { formatDateTime } from "./adminUtils";

export default function AdminReports() {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const chatsSnap = await getDocs(collection(db, "chats"));
                const collected: any[] = [];

                for (const chatDoc of chatsSnap.docs) {
                    const chatId = chatDoc.id;
                    const messagesSnap = await getDocs(query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "desc")));
                    messagesSnap.docs.forEach((msgDoc) => {
                        const data = msgDoc.data() as any;
                        const text = String(data.text || "");
                        if (!text.trim().startsWith("[REPORT]")) return;
                        collected.push({
                            id: msgDoc.id,
                            chatId,
                            senderId: data.senderId,
                            text,
                            createdAt: data.createdAt,
                            attachment: data.attachment,
                        });
                    });
                }

                collected.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                if (mounted) setReports(collected);
            } catch (error) {
                console.error("admin reports load failed:", error);
            }
        };

        load();

        // Reload when chats change
        const unsub = onSnapshot(collection(db, "chats"), () => {
            load();
        });

        return () => {
            mounted = false;
            unsub();
        };
    }, []);

    const stats = useMemo(() => {
        const patient = reports.filter((r) => !String(r.text || "").toLowerCase().includes("doctor review")).length;
        const reviewed = reports.filter((r) => String(r.text || "").toLowerCase().includes("doctor review")).length;
        return { patient, reviewed };
    }, [reports]);

    return (
        <AdminLayout title="Admin Reports" subtitle="Review report traffic between patients and doctors.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Patient Reports</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.patient}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Doctor Reviews</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.reviewed}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-lg sm:text-xl">Report Timeline</CardTitle></CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                    {reports.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No report messages found.</p>
                    ) : reports.map((report) => (
                        <div key={`${report.chatId}-${report.id}`} className="rounded-md border p-2 sm:p-3 hover:bg-accent transition">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between mb-2">
                                <p className="font-medium text-sm break-words flex-1">{String(report.text || "").replace(/^\[REPORT\]\s*/, "") || "Report"}</p>
                                <Badge className="text-xs w-fit">{report.attachment ? "file" : "text"}</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground truncate">Chat: {report.chatId}</p>
                                <p className="text-xs text-muted-foreground truncate">Sender: {report.senderId}</p>
                                <p className="text-xs text-muted-foreground">At: {formatDateTime(report.createdAt)}</p>
                                {report.attachment ? <p className="text-xs text-muted-foreground truncate">File: {report.attachment.name || "attachment"}</p> : null}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
