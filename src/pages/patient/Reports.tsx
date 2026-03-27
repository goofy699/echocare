import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Download, Trash2 } from "lucide-react";
import {
    createChat,
    deleteChatMessage,
    fetchDoctorsViaFunction,
    listenToMessages,
    sendMessage,
    uploadChatAttachment,
} from "@/services/chat";

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

export default function Reports() {
    const user = auth.currentUser;
    const { toast } = useToast();

    const [doctors, setDoctors] = useState<any[]>([]);
    const [doctorsLoading, setDoctorsLoading] = useState(false);
    const [selectedDoctorId, setSelectedDoctorId] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [reports, setReports] = useState<ReportMessage[]>([]);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const selectedDoctor = useMemo(
        () => doctors.find((d) => d.id === selectedDoctorId) || null,
        [doctors, selectedDoctorId]
    );

    const chatId = user?.uid && selectedDoctorId
        ? [user.uid, selectedDoctorId].sort().join("_")
        : "";

    const isReportMessage = (text?: string) =>
        typeof text === "string" && text.trim().startsWith("[REPORT]");

    const stripReportPrefix = (text?: string) =>
        String(text || "").replace(/^\[REPORT\]\s*/, "").trim();

    useEffect(() => {
        let mounted = true;

        const loadDoctors = async () => {
            setDoctorsLoading(true);
            try {
                const list = await fetchDoctorsViaFunction();
                if (!mounted) return;

                const normalized = list
                    .filter((d: any) => (d.role ? d.role === "doctor" : true))
                    .map((d: any) => ({
                        id: d.id,
                        name: d.name || d.displayName || d.email || d.id,
                        specialization: d.specialization || "General Medicine",
                    }));

                setDoctors(normalized);

                const preferredDoctorId = localStorage.getItem("patient_selected_doctor_id");
                if (preferredDoctorId && normalized.some((d: any) => d.id === preferredDoctorId)) {
                    setSelectedDoctorId(preferredDoctorId);
                } else if (normalized.length > 0) {
                    setSelectedDoctorId(normalized[0].id);
                }
            } catch (error) {
                console.error("load doctors for reports failed:", error);
            } finally {
                if (mounted) setDoctorsLoading(false);
            }
        };

        loadDoctors();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!user || !chatId || !selectedDoctorId) {
            setReports([]);
            return;
        }

        // Reuse chat stream: report entries are report-tagged chat messages from both patient and doctor.
        const unsubscribe = listenToMessages(chatId, (msgs) => {
            const mapped = (msgs as ReportMessage[]).filter((m) => isReportMessage(m.text));
            mapped.sort((a, b) => {
                const aSec = a.createdAt?.seconds || 0;
                const bSec = b.createdAt?.seconds || 0;
                return bSec - aSec;
            });
            setReports(mapped);
        });

        return () => unsubscribe();
    }, [chatId, selectedDoctorId, user]);

    const formatDate = (value: any) => {
        const sec = value?.seconds;
        if (!sec) return "-";
        return new Date(sec * 1000).toLocaleDateString();
    };

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;

        const lower = file.name.toLowerCase();
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");

        if (!isImage && !isPdf) {
            toast({
                title: "Invalid file",
                description: "Only image and PDF files are supported.",
                variant: "destructive",
            });
            event.target.value = "";
            return;
        }

        setSelectedFile(file);
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
            console.error("download report failed:", error);
            toast({ title: "Download failed", description: "Could not download this report.", variant: "destructive" });
        }
    };

    const onUpload = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!user) {
            toast({ title: "Not signed in", description: "Please sign in first.", variant: "destructive" });
            return;
        }

        if (!selectedDoctorId) {
            toast({ title: "Select doctor", description: "Choose a doctor before sending the report.", variant: "destructive" });
            return;
        }

        if (!selectedFile || !chatId) {
            toast({ title: "No file selected", description: "Choose a PDF or image file to upload.", variant: "destructive" });
            return;
        }

        try {
            setUploading(true);

            // Ensure chat exists, then reuse the exact chat attachment upload path.
            await createChat(chatId, user.uid, selectedDoctorId, user.displayName || user.email || user.uid);
            const attachment = await uploadChatAttachment(chatId, user.uid, selectedFile);
            const title = selectedFile.name.replace(/\.[^/.]+$/, "") || "Medical Report";

            await sendMessage(chatId, user.uid, `[REPORT] ${title}`, attachment);

            toast({
                title: "Report sent",
                description: `Your report was sent to ${selectedDoctor?.name || "the selected doctor"}.`,
            });

            setSelectedFile(null);
            if (fileRef.current) fileRef.current.value = "";
        } catch (error: any) {
            console.error("report upload failed:", error);
            toast({
                title: "Upload failed",
                description: error?.message || "Could not upload and send this report.",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const onDeleteReport = async (messageId: string) => {
        if (!chatId || !user) return;
        const shouldDelete = window.confirm("Delete this report entry?");
        if (!shouldDelete) return;

        try {
            await deleteChatMessage(chatId, messageId);
            toast({ title: "Deleted", description: "Report entry removed." });
        } catch (error: any) {
            console.error("delete report failed:", error);
            toast({
                title: "Delete failed",
                description: error?.message || "Could not delete this report entry.",
                variant: "destructive",
            });
        }
    };

    const reviewedCount = reports.filter((report) => report.senderId !== user?.uid).length;
    const pendingCount = reports.filter((report) => report.senderId === user?.uid).length;

    return (
        <div className="h-full min-h-0 overflow-hidden">
            <div className="h-full min-h-0 max-w-5xl mx-auto grid grid-rows-[auto_auto_1fr_auto] gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Medical Reports</h1>
                    <p className="text-muted-foreground">Upload a report and send it to a specific doctor.</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="shadow-md p-5 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="font-semibold">Total Reports</span>
                        </div>
                        <span className="text-3xl font-bold">{reports.length}</span>
                    </Card>
                    <Card className="shadow-md p-5 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-success" />
                            <span className="font-semibold">Reviewed</span>
                        </div>
                        <span className="text-3xl font-bold">{reviewedCount}</span>
                    </Card>
                    <Card className="shadow-md p-5 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-warning" />
                            <span className="font-semibold">Pending</span>
                        </div>
                        <span className="text-3xl font-bold">{pendingCount}</span>
                    </Card>
                </div>

                <Card className="shadow-md p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden">
                    <div className="mb-3">
                        <span className="text-lg font-semibold">Recent Reports</span>
                        <p className="text-xs text-muted-foreground mt-1">
                            Showing reports sent to {selectedDoctor?.name || "selected doctor"} via chat channel.
                        </p>
                    </div>
                    <div className="overflow-auto min-h-0 overscroll-contain">
                        <table className="min-w-full text-sm hidden md:table">
                            <thead>
                                <tr className="bg-muted/30">
                                    <th className="px-4 py-2 text-left">Report</th>
                                    <th className="px-4 py-2 text-left">Date</th>
                                    <th className="px-4 py-2 text-left">Doctor</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-left">File</th>
                                    <th className="px-4 py-2 text-left">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.length === 0 ? (
                                    <tr>
                                        <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                                            No reports uploaded yet for this doctor.
                                        </td>
                                    </tr>
                                ) : (
                                    reports.map((r) => (
                                        <tr key={r.id} className="border-b">
                                            <td className="px-4 py-2 font-medium">
                                                {stripReportPrefix(r.text) || "Medical Report"}
                                            </td>
                                            <td className="px-4 py-2">{formatDate(r.createdAt)}</td>
                                            <td className="px-4 py-2">{selectedDoctor?.name || selectedDoctorId}</td>
                                            <td className="px-4 py-2">
                                                <Badge className={r.senderId === user?.uid ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}>
                                                    {r.senderId === user?.uid ? "Pending" : "Reviewed"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2">
                                                {r.attachment ? (
                                                    <span className="text-primary underline flex items-center gap-1">
                                                        <FileText className="w-4 h-4" /> {r.attachment?.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">Comment only</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    {r.attachment ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => downloadAttachment(r.attachment)}
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Download
                                                        </Button>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">No file</span>
                                                    )}
                                                    {r.senderId === user?.uid && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => onDeleteReport(r.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-1" />
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        <div className="md:hidden space-y-3">
                            {reports.length === 0 ? (
                                <div className="rounded-md border px-3 py-4 text-sm text-muted-foreground">
                                    No reports uploaded yet for this doctor.
                                </div>
                            ) : (
                                reports.map((r) => (
                                    <div key={r.id} className="rounded-lg border p-3 space-y-2">
                                        <p className="font-medium text-sm break-words">
                                            {stripReportPrefix(r.text) || "Medical Report"}
                                        </p>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <p>Date: {formatDate(r.createdAt)}</p>
                                            <p className="truncate">Doctor: {selectedDoctor?.name || selectedDoctorId}</p>
                                        </div>
                                        <Badge className={r.senderId === user?.uid ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}>
                                            {r.senderId === user?.uid ? "Pending" : "Reviewed"}
                                        </Badge>
                                        {r.attachment ? (
                                            <>
                                                <p className="text-xs text-primary underline break-all inline-flex items-center gap-1">
                                                    <FileText className="w-4 h-4" /> {r.attachment?.name}
                                                </p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full"
                                                        onClick={() => downloadAttachment(r.attachment)}
                                                    >
                                                        <Download className="w-4 h-4 mr-1" />
                                                        Download
                                                    </Button>
                                                    {r.senderId === user?.uid && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="w-full"
                                                            onClick={() => onDeleteReport(r.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-1" />
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs text-muted-foreground">Doctor sent a comment without file.</p>
                                                {r.senderId === user?.uid && (
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="w-full"
                                                        onClick={() => onDeleteReport(r.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        Delete
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="shadow-md p-4 sm:p-5">
                    <div className="mb-4">
                        <span className="text-lg font-semibold">Upload New Report</span>
                    </div>

                    <form className="flex flex-col gap-3" onSubmit={onUpload}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                disabled={doctorsLoading || uploading}
                            >
                                <option value="">Select doctor</option>
                                {doctors.map((doctor) => (
                                    <option key={doctor.id} value={doctor.id}>
                                        {doctor.name} ({doctor.specialization})
                                    </option>
                                ))}
                            </select>

                            <Input
                                ref={fileRef}
                                type="file"
                                accept="image/*,.pdf,application/pdf"
                                onChange={onPickFile}
                                disabled={uploading}
                            />
                        </div>

                        {selectedFile && (
                            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                <span className="truncate">
                                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                                </span>
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

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                className="bg-primary text-primary-foreground gap-2 w-full sm:w-auto"
                                disabled={uploading || !selectedDoctorId || !selectedFile}
                            >
                                <UploadCloud className="w-4 h-4" />
                                {uploading ? "Uploading..." : "Upload & Send"}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
