import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { auth, db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, X, FileText, AlertCircle } from "lucide-react";
import { languageTools } from "@/lib/languagetools";
import {
    createChat,
    sendMessage as sendMessageToDb,
    listenToMessages,
    listenDoctors,
    fetchDoctorsViaFunction,
    uploadChatAttachment,
    markMessagesSeen,
} from "../../services/chat";
import { useToast } from "@/hooks/use-toast";
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createSosAlert } from "../../services/sos";

export default function PatientMessages() {
    const user = auth.currentUser;
    const [language, setLanguage] = useState(languageTools.getLanguage());
    const [contacts, setContacts] = useState<any[]>([]);
    const [doctorsLoading, setDoctorsLoading] = useState(false);
    const [activeContact, setActiveContact] = useState<any | null>(null);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [sendingSos, setSendingSos] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [patientProfile, setPatientProfile] = useState<any | null>(null);
    const [caregiverProfile, setCaregiverProfile] = useState<any | null>(null);

    const initials = (value?: string) => {
        const text = (value || "").trim();
        if (!text) return "D";
        const parts = text.split(/\s+/).slice(0, 2);
        return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "D";
    };

    const isReportMessage = (text?: string) =>
        typeof text === "string" && text.trim().startsWith("[REPORT]");

    const pickPreferredDoctor = (list: any[]) => {
        const preferredDoctorId = localStorage.getItem("patient_selected_doctor_id");
        const allowedDoctorIds = getAllowedDoctorIds();

        const visibleList = allowedDoctorIds.length > 0
            ? list.filter((d) => allowedDoctorIds.includes(d.id))
            : list;

        if (!preferredDoctorId) {
            if (visibleList.length > 0 && !activeContact) setActiveContact(visibleList[0]);
            return;
        }

        const preferred = visibleList.find((doctor) => doctor.id === preferredDoctorId);
        if (preferred) {
            setActiveContact(preferred);
            localStorage.removeItem("patient_selected_doctor_id");
            return;
        }

        if (visibleList.length > 0 && !activeContact) setActiveContact(visibleList[0]);
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

    const getAllowedDoctorIds = () => {
        const ids: string[] = [];
        const profile = patientProfile || {};
        if (profile.assignedDoctorId) ids.push(profile.assignedDoctorId);
        if (profile.doctorId) ids.push(profile.doctorId);
        if (Array.isArray(profile.assignedDoctors)) ids.push(...profile.assignedDoctors);
        return Array.from(new Set(ids));
    };

    const parseMapFromText = (text?: string) => {
        if (typeof text !== "string") return null;
        const regex = /https?:\/\/maps\.google\.com\/(?:\?q=|maps\?q=)?([-.\d]+),([-.\d]+)/i;
        const match = text.match(regex);
        if (!match) return null;
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        const url = match[0];
        return { lat, lng, url };
    };

    const visibleContacts = useMemo(() => {
        const allowed = getAllowedDoctorIds();
        if (allowed.length === 0) return contacts;
        return contacts.filter((c) => c.role === "caregiver" || allowed.includes(c.id));
    }, [contacts, patientProfile]);

    const caregiverContact = useMemo(() => {
        if (!caregiverProfile) return null;
        const id = caregiverProfile.id || caregiverProfile.uid || caregiverProfile.caregiverId;
        if (!id) return null;
        return {
            id,
            name: caregiverProfile.name || caregiverProfile.displayName || caregiverProfile.email || "Caregiver",
            role: "caregiver",
            availability: caregiverProfile.availability || "available",
            phone: caregiverProfile.phone || "",
            specialization: "Caregiver",
            hospital: caregiverProfile.organization || "",
            photoURL: caregiverProfile.photoURL || "",
            email: caregiverProfile.email || "",
        } as any;
    }, [caregiverProfile]);

    const combinedContacts = useMemo(() => {
        const doctorsOnly = visibleContacts.filter((c) => c.role !== "caregiver");
        return caregiverContact ? [caregiverContact, ...doctorsOnly] : doctorsOnly;
    }, [visibleContacts, caregiverContact]);

    useEffect(() => {
        if (activeContact && !combinedContacts.find((c) => c.id === activeContact.id)) {
            setActiveContact(combinedContacts[0] || null);
        }
    }, [combinedContacts, activeContact]);

    // Load doctors and patient profile
    useEffect(() => {
        if (!user?.uid) return;

        const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
            setPatientProfile(snap.data() || null);
        });

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
                    photoURL: d.photoURL || "",
                    email: d.email || "",
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
                        photoURL: d.photoURL || "",
                        email: d.email || "",
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

        return () => { mounted = false; unsubProfile(); };
    }, [user?.uid]);

    const handleLanguageToggle = () => {
        const newLang = languageTools.toggleLanguage();
        setLanguage(newLang);
    };

    // Load caregiver profile if assigned
    useEffect(() => {
        const caregiverId = patientProfile?.assignedCaregiverId || patientProfile?.caregiverId;
        if (!caregiverId) {
            setCaregiverProfile(null);
            return;
        }

        let active = true;
        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", caregiverId));
                if (!active) return;
                if (snap.exists()) {
                    setCaregiverProfile({ id: snap.id, ...snap.data() });
                } else {
                    setCaregiverProfile(null);
                }
            } catch (err) {
                console.error("Failed to load caregiver profile", err);
                if (active) setCaregiverProfile(null);
            }
        })();

        return () => { active = false; };
    }, [patientProfile]);

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
                photoURL: d.photoURL || "",
                email: d.email || "",
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
            const cleaned = (msgs || []).filter((m: any) => !isReportMessage(m?.text));
            setMessages(cleaned);
            markMessagesSeen(chatId, user.uid).catch(() => undefined);
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
            toast({ title: "No active chat", description: "Select your assigned doctor first.", variant: "destructive" });
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

    const sendSos = async () => {
        // Only allow SOS if chatting with caregiver
        if (!activeContact || activeContact.role !== "caregiver") {
            toast({ title: "Not available", description: "SOS is only available with your caregiver.", variant: "destructive" });
            return;
        }

        if (!user) {
            toast({ title: "Not signed in", description: "Please sign in to send SOS.", variant: "destructive" });
            return;
        }

        setSendingSos(true);
        try {
            // Get user's current location
            let lat = 0, lng = 0, address = "Location unknown";

            if (navigator.geolocation) {
                const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => resolve(pos.coords),
                        (err) => {
                            console.error("Geolocation error:", err);
                            reject(err);
                        },
                        { timeout: 5000 }
                    );
                });

                lat = position.latitude;
                lng = position.longitude;

                // Try to get address from coordinates using reverse geocoding
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
                    );
                    const data = await response.json();
                    address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                } catch (e) {
                    address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                }
            }

            // Create SOS alert in Firestore
            const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
            const sosMessage = `🚨 SOS ALERT: ${patientProfile?.name || "Patient"} needs immediate help!\\nLocation: ${address}\\nMap: ${mapsLink}`;

            await createSosAlert({
                patientId: user.uid,
                patientName: patientProfile?.name || user.displayName || user.email,
                caregiverId: activeContact?.id,
                doctorId: null,
                lat,
                lng,
                address,
                source: "chat",
            });

            // Send SOS message to chat
            await sendMessageToDb(chatId, user.uid, sosMessage);

            // Create a notification document in Firestore for the caregiver
            const notificationId = `sos_${user.uid}_${Date.now()}`;
            await setDoc(doc(db, "notifications", notificationId), {
                recipientId: activeContact.id,
                senderId: user.uid,
                senderName: patientProfile?.name || user.displayName || user.email,
                type: "sos",
                title: `🚨 SOS from ${patientProfile?.name || "Patient"}`,
                body: `Patient needs help at: ${address}`,
                latitude: lat,
                longitude: lng,
                address: address,
                mapsLink: mapsLink,
                read: false,
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour expiry
            });

            toast({
                title: "SOS sent!",
                description: "Your caregiver has been notified with your location.",
                variant: "default",
            });
        } catch (error) {
            console.error("SOS send failed:", error);
            toast({
                title: "SOS send failed",
                description: "Could not send SOS. Please try again or contact support.",
                variant: "destructive",
            });
        } finally {
            setSendingSos(false);
        }
    };

    return (
        <div className="h-screen bg-background flex overflow-hidden">
            <div className="max-w-6xl h-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 min-h-0 w-full">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Messages</h1>
                    <p className="text-sm text-muted-foreground mt-1">Chat with your doctor or caregiver securely.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
                    {/* CONTACT LIST */}
                    <Card className="lg:col-span-1 p-4 flex flex-col min-h-0">
                        <h2 className="font-semibold mb-2">Messages</h2>
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
                            {doctorsLoading ? (
                                <p className="text-sm text-muted-foreground">Loading doctors…</p>
                            ) : combinedContacts.length === 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">No assigned doctor yet. Please contact admin.</p>
                                    <Button size="sm" onClick={refreshDoctors}>Refresh</Button>
                                </div>
                            ) : (
                                combinedContacts.map((c) => (
                                    <Button
                                        key={c.id}
                                        variant={activeContact?.id === c.id ? "secondary" : "ghost"}
                                        className="w-full justify-start h-auto py-3"
                                        onClick={() => setActiveContact(c)}
                                    >
                                        <Avatar className="h-9 w-9 mr-3">
                                            <AvatarImage src={c.photoURL || undefined} alt={c.name} />
                                            <AvatarFallback>{initials(c.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 text-left">
                                            <p className="font-medium truncate">{c.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {c.role === "caregiver" ? "Caregiver" : (c.specialization || "General Medicine")}
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
                            {activeContact ? (
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={activeContact.photoURL || undefined} alt={activeContact.name} />
                                        <AvatarFallback>{initials(activeContact.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{activeContact.name}</p>
                                        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                            <p>{activeContact.role === "caregiver" ? "Caregiver" : (activeContact.specialization || "General Medicine")}</p>
                                            {activeContact.phone && <p>Phone: {activeContact.phone}</p>}
                                            {activeContact.hospital && <p>{activeContact.hospital}</p>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="font-semibold">Select a contact</p>
                            )}
                        </div>

                        {/* MESSAGES */}
                        <div className="flex-1 min-h-0 p-4 space-y-3 overflow-y-auto overscroll-contain">
                            {messages.map((m) => {
                                const createdAt: Date | null = m.createdAt?.toDate
                                    ? m.createdAt.toDate()
                                    : m.createdAt
                                        ? new Date(m.createdAt)
                                        : null;
                                const timeLabel = createdAt ? format(createdAt, "p") : "Sending…";
                                const isMine = m.senderId === user?.uid;
                                const isCaregiver = m.senderRole === "caregiver";
                                const seenBy = Array.isArray(m.seenBy) ? m.seenBy : [];
                                const seen = isMine && activeContact?.id ? seenBy.includes(activeContact.id) : false;
                                const statusLabel = isMine ? (seen ? `Seen · ${timeLabel}` : `Sent · ${timeLabel}`) : timeLabel;
                                const mapInfo = parseMapFromText(m.text);

                                return (
                                    <div key={m.id} className="space-y-1">
                                        <div
                                            className={`max-w-[70%] p-3 rounded-lg text-sm ${isMine
                                                ? "ml-auto bg-primary text-primary-foreground"
                                                : isCaregiver
                                                    ? "bg-amber-50 border border-amber-200"
                                                    : "bg-muted"
                                                }`}
                                        >
                                            {isCaregiver && (
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 mb-1">Caregiver message</p>
                                            )}
                                            {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                                            {mapInfo && (
                                                <div className="mt-3 space-y-2">
                                                    <div className="overflow-hidden rounded-md border bg-background/70">
                                                        <iframe
                                                            title="SOS location map"
                                                            src={`https://www.google.com/maps?q=${mapInfo.lat},${mapInfo.lng}&z=15&output=embed`}
                                                            loading="lazy"
                                                            className="h-48 w-full"
                                                            allowFullScreen
                                                        />
                                                    </div>
                                                    <a
                                                        href={mapInfo.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 text-xs font-medium underline"
                                                    >
                                                        Open full map
                                                    </a>
                                                </div>
                                            )}
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
                                        <p className={`text-[11px] text-muted-foreground ${isMine ? "text-right" : "text-left"}`}>
                                            {statusLabel}
                                        </p>
                                    </div>
                                );
                            })}
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
                                disabled={!user || sending || sendingSos}
                            >
                                <Paperclip className="w-4 h-4" />
                            </Button>
                            {activeContact?.role === "caregiver" && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={sendSos}
                                    disabled={!user || sendingSos || sending}
                                    className="gap-2"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    {sendingSos ? "Sending..." : "SOS"}
                                </Button>
                            )}
                            <Input
                                placeholder="Type a message…"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                disabled={sending || !user || sendingSos}
                            />
                            <Button onClick={sendMessage} disabled={(!message.trim() && !selectedFile) || !user || sending || sendingSos}>
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
            </div>
        </div>
    );
}
