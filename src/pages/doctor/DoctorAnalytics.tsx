import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, CalendarIcon, MessageSquare, BarChart3, Settings, FileText, Activity, Clock, Eye, TrendingUp } from "lucide-react";

type ReportMessage = {
    id: string;
    senderId: string;
    text?: string;
    createdAt?: any;
    attachment?: {
        name: string;
        url: string;
        dataBase64?: string;
        contentType: string;
        size: number;
        kind: "image" | "pdf";
    };
};

type DoctorChat = {
    id: string;
    patientId: string;
    doctorId: string;
    reportDownloadsByDoctor?: number;
};

type WeekStat = {
    label: string;
    patientReports: number;
    doctorReviews: number;
    followUps: number;
};

function startOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7; // monday as week start
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - diff);
    return d;
}

function weekLabel(weekStart: Date) {
    const month = weekStart.toLocaleString("default", { month: "short" });
    return `${month} ${weekStart.getDate()}`;
}

function hoursBetween(aSec: number, bSec: number) {
    if (!aSec || !bSec || bSec <= aSec) return null;
    return (bSec - aSec) / 3600;
}

function formatDurationHours(value: number | null) {
    if (value == null || Number.isNaN(value)) return "-";
    if (value < 24) return `${value.toFixed(1)}h`;
    return `${(value / 24).toFixed(1)}d`;
}

export default function DoctorAnalytics() {
    const navigate = useNavigate();
    const doctorId = auth.currentUser?.uid;
    const doctorName = auth.currentUser?.displayName || "Doctor";

    const [loading, setLoading] = useState(true);
    const [chats, setChats] = useState<DoctorChat[]>([]);
    const [messagesByChat, setMessagesByChat] = useState<Record<string, ReportMessage[]>>({});

    const isReportMessage = (text?: string) => typeof text === "string" && text.trim().startsWith("[REPORT]");

    useEffect(() => {
        if (!doctorId) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "chats"), where("doctorId", "==", doctorId));

        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                const chatDocs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })) as DoctorChat[];
                setChats(chatDocs);

                const byChat: Record<string, ReportMessage[]> = {};
                await Promise.all(
                    chatDocs.map(async (chat) => {
                        try {
                            const msgsQ = query(collection(db, "chats", chat.id, "messages"), orderBy("createdAt", "asc"));
                            const msgsSnap = await getDocs(msgsQ);
                            byChat[chat.id] = msgsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })) as ReportMessage[];
                        } catch (error) {
                            console.error("failed loading analytics messages for chat", chat.id, error);
                            byChat[chat.id] = [];
                        }
                    })
                );

                setMessagesByChat(byChat);
                setLoading(false);
            },
            (error) => {
                console.error("doctor analytics chat listener failed:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [doctorId]);

    const computed = useMemo(() => {
        const allReportMessages = Object.entries(messagesByChat).flatMap(([chatId, messages]) =>
            messages
                .filter((m) => isReportMessage(m.text))
                .map((m) => ({ ...m, chatId }))
        );

        const patientReports = allReportMessages.filter((m) => m.senderId !== doctorId);
        const doctorReviews = allReportMessages.filter((m) => m.senderId === doctorId);

        const totalDownloads = chats.reduce((sum, chat) => sum + Number(chat.reportDownloadsByDoctor || 0), 0);

        const reviewDurations: number[] = [];
        Object.entries(messagesByChat).forEach(([chatId, messages]) => {
            const reportMessages = messages.filter((m) => isReportMessage(m.text));
            const patientInChat = reportMessages.filter((m) => m.senderId !== doctorId);
            const doctorInChat = reportMessages.filter((m) => m.senderId === doctorId);

            patientInChat.forEach((patientMsg) => {
                const pSec = patientMsg.createdAt?.seconds || 0;
                const response = doctorInChat.find((d) => (d.createdAt?.seconds || 0) > pSec);
                if (response) {
                    const dSec = response.createdAt?.seconds || 0;
                    const hours = hoursBetween(pSec, dSec);
                    if (hours != null) reviewDurations.push(hours);
                }
            });
        });

        const avgReviewHours =
            reviewDurations.length > 0
                ? reviewDurations.reduce((sum, value) => sum + value, 0) / reviewDurations.length
                : null;

        const respondedCount = patientReports.filter((patientMsg) => {
            const responses = doctorReviews.filter(
                (doctorMsg) =>
                    (doctorMsg as any).chatId === (patientMsg as any).chatId &&
                    (doctorMsg.createdAt?.seconds || 0) > (patientMsg.createdAt?.seconds || 0)
            );
            return responses.length > 0;
        }).length;

        const responseRate = patientReports.length > 0 ? (respondedCount / patientReports.length) * 100 : 0;

        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        const weekAgoSec = Math.floor(weekAgo.getTime() / 1000);

        const activePatientsThisWeek = new Set(
            patientReports
                .filter((message) => (message.createdAt?.seconds || 0) >= weekAgoSec)
                .map((message: any) => {
                    const chat = chats.find((c) => c.id === message.chatId);
                    return chat?.patientId;
                })
                .filter(Boolean)
        ).size;

        const sixWeekStats: WeekStat[] = [];
        const thisWeekStart = startOfWeek(new Date());
        for (let i = 5; i >= 0; i -= 1) {
            const start = new Date(thisWeekStart);
            start.setDate(thisWeekStart.getDate() - i * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            const startSec = Math.floor(start.getTime() / 1000);
            const endSec = Math.floor(end.getTime() / 1000);

            const inWeek = allReportMessages.filter((m) => {
                const sec = m.createdAt?.seconds || 0;
                return sec >= startSec && sec < endSec;
            });

            sixWeekStats.push({
                label: weekLabel(start),
                patientReports: inWeek.filter((m) => m.senderId !== doctorId).length,
                doctorReviews: inWeek.filter((m) => m.senderId === doctorId).length,
                followUps: inWeek.filter((m) => m.senderId === doctorId && String(m.text || "").toLowerCase().includes("review")).length,
            });
        }

        return {
            totalPatientReports: patientReports.length,
            totalDoctorReviews: doctorReviews.length,
            totalDownloads,
            responseRate,
            avgReviewHours,
            activePatientsThisWeek,
            sixWeekStats,
        };
    }, [chats, doctorId, messagesByChat]);

    const trendMax = useMemo(
        () =>
            Math.max(
                1,
                ...computed.sixWeekStats.map((item) => Math.max(item.patientReports, item.doctorReviews, item.followUps))
            ),
        [computed.sixWeekStats]
    );

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor")}>
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
                        <Users className="w-4 h-4" />
                        Patients
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/appointments")}>
                        <CalendarIcon className="w-4 h-4" />
                        Appointments
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/messages")}>
                        <MessageSquare className="w-4 h-4" />
                        Messages
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/reports")}>
                        <FileText className="w-4 h-4" />
                        Reports
                    </Button>
                    <Button variant="secondary" className="w-full justify-start gap-3">
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/profile")}>
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

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Real report analytics for {doctorName} based on patient uploads and doctor review actions.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Response Time
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{loading ? "..." : formatDurationHours(computed.avgReviewHours)}</div>
                                <p className="text-sm text-muted-foreground mt-2">Average from patient report to first doctor review.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    Reports Viewed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{loading ? "..." : computed.totalDownloads}</div>
                                <p className="text-sm text-muted-foreground mt-2">Count increases when you download a report file.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Avg Review Time
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{loading ? "..." : formatDurationHours(computed.avgReviewHours)}</div>
                                <p className="text-sm text-muted-foreground mt-2">Based on reports you sent back to patients.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Patient Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{loading ? "..." : computed.activePatientsThisWeek}</div>
                                <p className="text-sm text-muted-foreground mt-2">Patients who submitted reports in last 7 days.</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Report Review Trend</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {computed.sixWeekStats.map((item) => (
                                    <div key={`review-${item.label}`} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{item.label}</span>
                                            <span>Patient {item.patientReports} • Doctor {item.doctorReviews}</span>
                                        </div>
                                        <div className="flex h-2 rounded bg-muted overflow-hidden">
                                            <div
                                                className="bg-primary/80"
                                                style={{ width: `${(item.patientReports / trendMax) * 100}%` }}
                                            />
                                            <div
                                                className="bg-success/80"
                                                style={{ width: `${(item.doctorReviews / trendMax) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground">Blue = patient report uploads, Green = your review replies.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Patient Follow-up Trend</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {computed.sixWeekStats.map((item) => (
                                    <div key={`followup-${item.label}`} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{item.label}</span>
                                            <span>Follow-ups {item.followUps}</span>
                                        </div>
                                        <div className="h-2 rounded bg-muted overflow-hidden">
                                            <div
                                                className="h-full bg-accent"
                                                style={{ width: `${(item.followUps / trendMax) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground">Shows weekly doctor follow-up comments in report threads.</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Report Workflow Health</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-lg border p-4">
                                <p className="text-sm text-muted-foreground">Patient Reports</p>
                                <p className="text-2xl font-bold mt-1">{computed.totalPatientReports}</p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <p className="text-sm text-muted-foreground">Doctor Reviews</p>
                                <p className="text-2xl font-bold mt-1">{computed.totalDoctorReviews}</p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <p className="text-sm text-muted-foreground">Review Response Rate</p>
                                <p className="text-2xl font-bold mt-1">{computed.responseRate.toFixed(0)}%</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
