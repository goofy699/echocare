import {
    collection,
    addDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    doc,
    setDoc,
    where,
    getDoc,
    getDocs,
    increment,
} from "firebase/firestore";
import { auth, db } from "@/firebase";

export interface ChatAttachment {
    name: string;
    url: string;
    dataBase64?: string;
    contentType: string;
    size: number;
    kind: "image" | "pdf";
}

async function findChatCollection(chatId: string) {
    try {
        const c1 = await getDoc(doc(db, "chats", chatId));
        if (c1.exists()) return "chats";
        const c2 = await getDoc(doc(db, "chat", chatId));
        if (c2.exists()) return "chat";
    } catch (e) {
        console.warn("findChatCollection error:", e);
    }
    return "chats";
}

export async function createChat(
    chatId: string,
    patientId: string,
    doctorId: string,
    patientName?: string
) {
    const coll = await findChatCollection(chatId);

    const payload: any = {
        participants: [patientId, doctorId],
        patientId,
        doctorId,
        updatedAt: serverTimestamp(),
    };
    if (patientName) payload.patientName = patientName;

    await setDoc(doc(db, coll, chatId), payload, { merge: true });
    return { chatId, collection: coll };
}

export async function sendMessage(
    chatId: string,
    senderId: string,
    text: string,
    attachment?: ChatAttachment
) {
    const hasText = !!text?.trim();
    if (!hasText && !attachment) return;

    const coll = await findChatCollection(chatId);

    const chatDoc = await getDoc(doc(db, coll, chatId));
    const chatData = chatDoc.data();

    if (!chatData) {
        console.error("Chat document not found");
        return;
    }

    const isDoctor = chatData.doctorId === senderId;
    const isPatient = chatData.patientId === senderId;

    const messagesRef = collection(db, coll, chatId, "messages");
    const trimmedText = text?.trim() || "";
    await addDoc(messagesRef, {
        senderId,
        text: trimmedText,
        ...(attachment ? { attachment } : {}),
        createdAt: serverTimestamp(),
        senderRole: isDoctor ? "doctor" : "patient",
    });

    const fallbackMessage = attachment
        ? attachment.kind === "image"
            ? "📷 Image"
            : "📄 PDF"
        : "";
    const messagePreview = trimmedText || fallbackMessage;

    const updatePayload: any = {
        lastMessage: messagePreview,
        updatedAt: serverTimestamp(),
    };

    if (isDoctor) {
        updatePayload.lastMessageFromDoctor = messagePreview;
        updatePayload.lastMessageFromDoctorAt = serverTimestamp();
    } else if (isPatient) {
        updatePayload.lastMessageFromPatient = messagePreview;
        updatePayload.lastMessageFromPatientAt = serverTimestamp();
    }

    await setDoc(doc(db, coll, chatId), updatePayload, { merge: true });
}

export async function incrementDoctorReportDownload(chatId: string) {
    const coll = await findChatCollection(chatId);
    await setDoc(
        doc(db, coll, chatId),
        {
            reportDownloadsByDoctor: increment(1),
            lastReportDownloadedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function uploadChatAttachment(
    chatId: string,
    _senderId: string,
    file: File
): Promise<ChatAttachment> {
    const lowerName = file.name.toLowerCase();
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");

    if (!isImage && !isPdf) {
        throw new Error("Only images and PDF files are supported.");
    }

    const maxImageBytes = 8 * 1024 * 1024;
    const maxPdfBytes = 8 * 1024 * 1024;

    if (isImage && file.size > maxImageBytes) {
        throw new Error("Image too large. Max size is 8MB.");
    }

    if (isPdf && file.size > maxPdfBytes) {
        throw new Error("PDF too large. Max size is 8MB.");
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error(
            "Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file."
        );
    }

    const endpoint = isPdf
        ? `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`
        : `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", `chatAttachments/${chatId}`);

    const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
        const message = payload?.error?.message || "Cloudinary upload failed.";
        throw new Error(message);
    }

    const secureUrl = String(payload.secure_url || "");

    return {
        name: file.name,
        url: secureUrl,
        contentType: file.type || (isPdf ? "application/pdf" : "application/octet-stream"),
        size: file.size,
        kind: isImage ? "image" : "pdf",
    };
}

export function listenToMessages(chatId: string, callback: (msgs: any[]) => void) {
    let unsub: () => void = () => { };

    (async () => {
        try {
            const coll = await findChatCollection(chatId);
            const q = query(
                collection(db, coll, chatId, "messages"),
                orderBy("createdAt", "asc")
            );

            unsub = onSnapshot(
                q,
                (snapshot) => {
                    const messages = snapshot.docs.map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                    }));
                    callback(messages);
                },
                (err) => {
                    console.error("listenToMessages onSnapshot error:", err);
                    callback([]);
                }
            );
        } catch (err) {
            console.error("listenToMessages setup error:", err);
            callback([]);
        }
    })();

    return () => {
        try {
            unsub();
        } catch {
            // ignore
        }
    };
}

export function listenDoctorChats(doctorId: string, callback: (chats: any[]) => void) {
    const q = query(collection(db, "chats"), where("doctorId", "==", doctorId));

    return onSnapshot(q, async (snapshot) => {
        const chatList = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                let patientName = (data.patientName as string) || data.patientId;
                try {
                    if (!data.patientName) {
                        const patientDoc = await getDoc(doc(db, "users", data.patientId));
                        if (patientDoc.exists()) {
                            const pdata = patientDoc.data() as any;
                            patientName = pdata.name || pdata.displayName || pdata.email || data.patientId;
                        }
                    }
                } catch {
                    // ignore
                }

                return {
                    id: docSnap.id,
                    ...data,
                    patientName,
                    lastMessageFromPatient: data.lastMessageFromPatient || null,
                    lastMessageFromDoctor: data.lastMessageFromDoctor || null,
                };
            })
        );

        callback(chatList);
    });
}

export async function listDoctors() {
    const q = query(collection(db, "users"), where("role", "==", "doctor"));
    let snap = await getDocs(q);
    let docs = snap.docs;

    if (docs.length === 0) {
        snap = await getDocs(collection(db, "users"));
        docs = snap.docs;
    }

    return docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function listPatientsForDoctor(doctorId: string) {
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const snap = await getDocs(q);

    const patients = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    return patients.filter((p: any) => {
        if (!p) return false;
        if (p.assignedDoctorId) return p.assignedDoctorId === doctorId;
        if (p.doctorId) return p.doctorId === doctorId;
        if (Array.isArray(p.assignedDoctors)) return p.assignedDoctors.includes(doctorId);
        return true;
    });
}

export function listenDoctors(callback: (docs: any[]) => void) {
    const q = query(collection(db, "users"), where("role", "==", "doctor"));

    try {
        return onSnapshot(
            q,
            async (snapshot) => {
                try {
                    let docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                    if (docs.length === 0) {
                        const allSnap = await getDocs(collection(db, "users"));
                        docs = allSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                    }
                    callback(docs);
                } catch (innerErr) {
                    console.error("listenDoctors processing error:", innerErr);
                    callback([]);
                }
            },
            (err) => {
                console.error("listenDoctors onSnapshot error:", err);
                if ((err as any)?.code === "permission-denied") {
                    console.warn("listenDoctors: Firestore rules prevented a client read.");
                }
                callback([]);
            }
        );
    } catch (err) {
        console.error("listenDoctors setup error:", err);
        callback([]);
        return () => { };
    }
}

// Uses direct Firestore reads — no Firebase Functions needed (free plan compatible)
export async function fetchDoctorsViaFunction() {
    if (!auth.currentUser) throw new Error("not-signed-in");
    return listDoctors();
}

export async function fetchPatientsForDoctorViaFunction(doctorId: string) {
    if (!auth.currentUser) throw new Error("not-signed-in");
    return listPatientsForDoctor(doctorId);
}

export function listenPatientsForDoctor(doctorId: string, callback: (docs: any[]) => void) {
    const q = query(collection(db, "users"));

    try {
        return onSnapshot(
            q,
            (snapshot) => {
                try {
                    const all = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                    const isPatientCandidate = (u: any) => (u.role ? u.role === "patient" : true);

                    const assigned = all.filter((p: any) => {
                        if (!isPatientCandidate(p)) return false;
                        if (p.assignedDoctorId) return p.assignedDoctorId === doctorId;
                        if (p.doctorId) return p.doctorId === doctorId;
                        if (Array.isArray(p.assignedDoctors)) return p.assignedDoctors.includes(doctorId);
                        return false;
                    });

                    const candidates = all.filter(isPatientCandidate);
                    const result = assigned.length > 0 ? assigned : candidates;
                    callback(result);
                } catch (innerErr) {
                    console.error("listenPatientsForDoctor processing error:", innerErr);
                    callback([]);
                }
            },
            (err) => {
                console.error("listenPatientsForDoctor onSnapshot error:", err);
                callback([]);
            }
        );
    } catch (err) {
        console.error("listenPatientsForDoctor setup error:", err);
        callback([]);
        return () => { };
    }
}

export async function deleteChatMessage(chatId: string, messageId: string) {
    const coll = await findChatCollection(chatId);
    await deleteDoc(doc(db, coll, chatId, "messages", messageId));
    await setDoc(
        doc(db, coll, chatId),
        {
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export function listenUsersByRole(role: "patient" | "doctor" | "caregiver" | "admin", callback: (docs: any[]) => void) {
    const q = query(collection(db, "users"), where("role", "==", role));

    try {
        return onSnapshot(
            q,
            (snapshot) => {
                const docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                callback(docs);
            },
            (err) => {
                console.error("listenUsersByRole onSnapshot error:", err);
                callback([]);
            }
        );
    } catch (err) {
        console.error("listenUsersByRole setup error:", err);
        callback([]);
        return () => { };
    }
}

export function listenCaregiverPatients(caregiverId: string, callback: (docs: any[]) => void) {
    const q = query(collection(db, "users"), where("role", "==", "patient"));

    try {
        return onSnapshot(
            q,
            (snapshot) => {
                const allPatients = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

                const linked = allPatients.filter((p: any) => {
                    if (p.assignedCaregiverId) return p.assignedCaregiverId === caregiverId;
                    if (p.caregiverId) return p.caregiverId === caregiverId;
                    if (Array.isArray(p.assignedCaregivers)) return p.assignedCaregivers.includes(caregiverId);
                    return true;
                });

                callback(linked);
            },
            (err) => {
                console.error("listenCaregiverPatients onSnapshot error:", err);
                callback([]);
            }
        );
    } catch (err) {
        console.error("listenCaregiverPatients setup error:", err);
        callback([]);
        return () => { };
    }
}

export function listenChatsByParticipant(userId: string, callback: (chats: any[]) => void) {
    const q = query(collection(db, "chats"), where("participants", "array-contains", userId));

    try {
        return onSnapshot(
            q,
            (snapshot) => {
                const chats = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
                    .sort((a: any, b: any) => {
                        const aSec = a.updatedAt?.seconds || 0;
                        const bSec = b.updatedAt?.seconds || 0;
                        return bSec - aSec;
                    });
                callback(chats);
            },
            (err) => {
                console.error("listenChatsByParticipant onSnapshot error:", err);
                callback([]);
            }
        );
    } catch (err) {
        console.error("listenChatsByParticipant setup error:", err);
        callback([]);
        return () => { };
    }
}