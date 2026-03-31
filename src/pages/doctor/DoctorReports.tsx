import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { createChat, deleteChatMessage, incrementDoctorReportDownload, listenPatientsForDoctor, listenToMessages, sendMessage, uploadChatAttachment } from "@/services/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, CalendarIcon, MessageSquare, BarChart3, Settings, FileText, Download, Paperclip, X, UploadCloud, Trash2 } from "lucide-react";

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

export default function DoctorReports() {
    const navigate = useNavigate();
    const doctorId = auth.currentUser?.uid;
    const { toast } = useToast();

    const [patients, setPatients] = useState<any[]>([]);
    const [patientsLoading, setPatientsLoading] = useState(true);
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [reports, setReports] = useState<ReportMessage[]>([]);
    const [comment, setComment] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const selectedPatient = useMemo(
        () => patients.find((patient) => patient.id === selectedPatientId) || null,
        [patients, selectedPatientId]
    );

    const chatId = doctorId && selectedPatientId
        ? [selectedPatientId, doctorId].sort().join("_")
        : "";

    const isReportMessage = (text?: string) =>
        typeof text === "string" && text.trim().startsWith("[REPORT]");

    const stripReportPrefix = (text?: string) =>
        String(text || "").replace(/^\[REPORT\]\s*/, "").trim();

    useEffect(() => {
        if (!doctorId) {
            setPatientsLoading(false);
            return;
        }

        let mounted = true;
        setPatientsLoading(true);

        const unsubscribe = listenPatientsForDoctor(doctorId, (list) => {
            if (!mounted) return;

            const normalized = list.map((patient: any) => ({
                id: patient.id,
                name: patient.name || patient.displayName || patient.email || patient.id,
                email: patient.email || "",
            }));

            setPatients(normalized);
            const preferredPatientId = localStorage.getItem("doctor_selected_patient_id");
            if (preferredPatientId && normalized.some((patient: any) => patient.id === preferredPatientId)) {
                setSelectedPatientId(preferredPatientId);
                localStorage.removeItem("doctor_selected_patient_id");
            } else if (normalized.length > 0 && !selectedPatientId) {
                setSelectedPatientId(normalized[0].id);
            }

            setPatientsLoading(false);
        });

        return () => {
            mounted = false;
            unsubscribe && unsubscribe();
        };
    }, [doctorId, selectedPatientId]);

    useEffect(() => {
        if (!doctorId || !selectedPatientId || !chatId || !selectedPatient) {
            setReports([]);
            return;
        }

        createChat(chatId, selectedPatientId, doctorId, selectedPatient.name);
        const unsubscribe = listenToMessages(chatId, (msgs) => {
            const mapped = (msgs as ReportMessage[]).filter((message) => isReportMessage(message.text));
            mapped.sort((a, b) => {
                const aSec = a.createdAt?.seconds || 0;
                const bSec = b.createdAt?.seconds || 0;
                return bSec - aSec;
            });
            setReports(mapped);
        });

        return () => unsubscribe();
    }, [chatId, doctorId, selectedPatient, selectedPatientId]);

    const formatDate = (value: any) => {
        const sec = value?.seconds;
        if (!sec) return "-";
        return new Date(sec * 1000).toLocaleString();
    };

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const downloadAttachment = async (attachment: any) => {
        const fileName = attachment?.name || "report";
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
            console.error("doctor report download failed:", error);
            toast({ title: "Download failed", description: "Could not download this file.", variant: "destructive" });
        } finally {
            if (chatId && doctorId) {
                try {
                    await incrementDoctorReportDownload(chatId);
                } catch (error) {
                    console.error("failed to increment report download counter:", error);
                }
            }
        }
    };

    const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;

        const lower = file.name.toLowerCase();
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");

        if (!isImage && !isPdf) {
            event.target.value = "";
            toast({ title: "Invalid file", description: "Only image and PDF files are supported.", variant: "destructive" });
            return;
        }

        setSelectedFile(file);
    };

    const sendReview = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!doctorId || !selectedPatient || !chatId) return;
        if (!comment.trim() && !selectedFile) {
            toast({ title: "Empty review", description: "Add a comment or attach a file before sending.", variant: "destructive" });
            return;
        }

        try {
            setSending(true);
            await createChat(chatId, selectedPatient.id, doctorId, selectedPatient.name);

            let attachment;
            if (selectedFile) {
                attachment = await uploadChatAttachment(chatId, doctorId, selectedFile);
            }

            const reportText = comment.trim()
                ? `[REPORT] Doctor Review: ${comment.trim()}`
                : `[REPORT] Doctor sent a reviewed file`;

            await sendMessage(chatId, doctorId, reportText, attachment);
            setComment("");
            setSelectedFile(null);
            if (fileRef.current) fileRef.current.value = "";
            toast({ title: "Review sent", description: "Report review sent to patient." });
        } catch (error) {
            console.error("doctor report send failed:", error);
            const message = error instanceof Error ? error.message : "Could not send report review.";
            toast({ title: "Send failed", description: message, variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const onDeleteReport = async (messageId: string) => {
        if (!chatId || !doctorId) return;
        const shouldDelete = window.confirm("Delete this report entry?");
        if (!shouldDelete) return;

        try {
            await deleteChatMessage(chatId, messageId);
            toast({ title: "Deleted", description: "Report entry removed." });
        } catch (error: any) {
            console.error("doctor delete report failed:", error);
            toast({
                title: "Delete failed",
                description: error?.message || "Could not delete this report entry.",
                variant: "destructive",
            });
        }
    };

    const patientSentCount = reports.filter((report) => report.senderId !== doctorId).length;
    const doctorReviewedCount = reports.filter((report) => report.senderId === doctorId).length;

    return (
        <div className="h-screen bg-background flex overflow-hidden">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor")}>
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="sidebar-label">Dashboard</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
                        <Users className="w-4 h-4" />
                        <span className="sidebar-label">Patients</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/appointments")}>
                        <CalendarIcon className="w-4 h-4" />
                        <span className="sidebar-label">Appointments</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/messages")}>
                        <MessageSquare className="w-4 h-4" />
                        <span className="sidebar-label">Messages</span>
                    </Button>
                    <Button variant="secondary" className="sidebar-item w-full justify-start gap-3">
                        <FileText className="w-4 h-4" />
                        <span className="sidebar-label">Reports</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/analytics")}>
                        <BarChart3 className="w-4 h-4" />
                        <span className="sidebar-label">Analytics</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/settings")}>
                        <Settings className="w-4 h-4" />
                        <span className="sidebar-label">Settings</span>
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

            <main className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Patient Reports</h1>
                        <p className="text-muted-foreground">Review patient reports, download files, and send your comments or reviewed report back.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-5 flex flex-col items-center justify-center">
                            <span className="font-semibold">Selected Patient Reports</span>
                            <span className="text-3xl font-bold mt-2">{reports.length}</span>
                        </Card>
                        <Card className="p-5 flex flex-col items-center justify-center">
                            <span className="font-semibold">Submitted By Patient</span>
                            <span className="text-3xl font-bold mt-2">{patientSentCount}</span>
                        </Card>
                        <Card className="p-5 flex flex-col items-center justify-center">
                            <span className="font-semibold">Your Reviews</span>
                            <span className="text-3xl font-bold mt-2">{doctorReviewedCount}</span>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[520px]">
                        <Card className="lg:col-span-1 p-4 flex flex-col min-h-0">
                            <h2 className="font-semibold mb-3">Patients</h2>
                            <div className="space-y-2 overflow-y-auto min-h-0 overscroll-contain">
                                {patientsLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading patients...</p>
                                ) : patients.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No patients found.</p>
                                ) : (
                                    patients.map((patient) => (
                                        <Button
                                            key={patient.id}
                                            variant={selectedPatientId === patient.id ? "secondary" : "ghost"}
                                            className="w-full justify-start h-auto py-3"
                                            onClick={() => setSelectedPatientId(patient.id)}
                                        >
                                            <div className="min-w-0 text-left">
                                                <p className="font-medium truncate">{patient.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{patient.email || patient.id}</p>
                                            </div>
                                        </Button>
                                    ))
                                )}
                            </div>
                        </Card>

                        <div className="lg:col-span-3 grid grid-rows-[1fr_auto] gap-6 min-h-0">
                            <Card className="p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden">
                                <div className="mb-3">
                                    <h2 className="text-lg font-semibold">Report Timeline</h2>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {selectedPatient ? `Showing report exchange with ${selectedPatient.name}` : "Select a patient to review reports."}
                                    </p>
                                </div>

                                <div className="overflow-auto min-h-0 overscroll-contain space-y-3">
                                    {reports.length === 0 ? (
                                        <div className="rounded-md border px-3 py-4 text-sm text-muted-foreground">
                                            No report activity for this patient yet.
                                        </div>
                                    ) : (
                                        reports.map((report) => (
                                            <div key={report.id} className="rounded-lg border p-3 space-y-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="font-medium text-sm break-words">{stripReportPrefix(report.text) || "Report update"}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{formatDate(report.createdAt)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={report.senderId === doctorId ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}>
                                                            {report.senderId === doctorId ? "Doctor Review" : "Patient Report"}
                                                        </Badge>
                                                        {report.senderId === doctorId && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => onDeleteReport(report.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-1" />
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {report.attachment && (
                                                    <div className="rounded-md border px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium">{report.attachment.name}</p>
                                                            <p className="text-xs text-muted-foreground">{formatFileSize(report.attachment.size)}</p>
                                                        </div>
                                                        <Button size="sm" variant="outline" onClick={() => downloadAttachment(report.attachment)}>
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Download
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>

                            <Card className="p-4 sm:p-5">
                                <div className="mb-4">
                                    <h2 className="text-lg font-semibold">Send Review Back To Patient</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Add your analysis comment and optionally attach a reviewed file.</p>
                                </div>

                                <form className="space-y-3" onSubmit={sendReview}>
                                    <Textarea
                                        value={comment}
                                        onChange={(event) => setComment(event.target.value)}
                                        placeholder="Write what is wrong, what is normal, or what the patient should do next..."
                                        disabled={!selectedPatient || sending}
                                    />

                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*,.pdf,application/pdf"
                                        className="hidden"
                                        onChange={onPickFile}
                                    />

                                    {selectedFile && (
                                        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                            <span className="truncate">{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                    setSelectedFile(null);
                                                    if (fileRef.current) fileRef.current.value = "";
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="gap-2 w-full sm:w-auto"
                                            onClick={() => fileRef.current?.click()}
                                            disabled={!selectedPatient || sending}
                                        >
                                            <Paperclip className="w-4 h-4" />
                                            Attach Reviewed File
                                        </Button>

                                        <Button
                                            type="submit"
                                            className="gap-2 w-full sm:w-auto"
                                            disabled={(!comment.trim() && !selectedFile) || !selectedPatient || sending}
                                        >
                                            <UploadCloud className="w-4 h-4" />
                                            {sending ? "Sending..." : "Send Review"}
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}