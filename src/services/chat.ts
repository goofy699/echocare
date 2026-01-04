import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    doc,
    setDoc,
    where,
    getDoc,
    getDocs,
} from "firebase/firestore";
import { db } from "@/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Create or update a chat between patient and doctor
 */
async function findChatCollection(chatId: string) {
    // Detect whether an existing chat document is in 'chats' or 'chat' collection.
    try {
        const c1 = await getDoc(doc(db, "chats", chatId));
        if (c1.exists()) return "chats";
        const c2 = await getDoc(doc(db, "chat", chatId));
        if (c2.exists()) return "chat";
    } catch (e) {
        console.warn("findChatCollection error:", e);
    }
    // default to 'chats'
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

    await setDoc(
        doc(db, coll, chatId),
        payload,
        { merge: true }
    );
    return { chatId, collection: coll };
}

/**
 * Send a message - now tracks sender role
 */
export async function sendMessage(
    chatId: string,
    senderId: string,
    text: string
) {
    const coll = await findChatCollection(chatId);

    // Get the chat document to determine sender role
    const chatDoc = await getDoc(doc(db, coll, chatId));
    const chatData = chatDoc.data();

    if (!chatData) {
        console.error("Chat document not found");
        return;
    }

    const isDoctor = chatData.doctorId === senderId;
    const isPatient = chatData.patientId === senderId;

    // Add message to subcollection
    const messagesRef = collection(db, coll, chatId, "messages");
    await addDoc(messagesRef, {
        senderId,
        text,
        createdAt: serverTimestamp(),
        senderRole: isDoctor ? "doctor" : "patient",
    });

    // Update chat document with role-specific last message
    const updatePayload: any = {
        lastMessage: text,
        updatedAt: serverTimestamp(),
    };

    if (isDoctor) {
        updatePayload.lastMessageFromDoctor = text;
        updatePayload.lastMessageFromDoctorAt = serverTimestamp();
    } else if (isPatient) {
        updatePayload.lastMessageFromPatient = text;
        updatePayload.lastMessageFromPatientAt = serverTimestamp();
    }

    await setDoc(
        doc(db, coll, chatId),
        updatePayload,
        { merge: true }
    );
}

/**
 * Listen to messages (real-time)
 */
export function listenToMessages(chatId: string, callback: (msgs: any[]) => void) {
    // Return an unsubscribe function immediately. Internally resolve collection and attach listener.
    let unsub: () => void = () => { };

    (async () => {
        try {
            const coll = await findChatCollection(chatId);
            const q = query(
                collection(db, coll, chatId, "messages"),
                orderBy("createdAt", "asc")
            );

            unsub = onSnapshot(q, (snapshot) => {
                const messages = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                callback(messages);
            }, (err) => {
                console.error("listenToMessages onSnapshot error:", err);
                callback([]);
            });
        } catch (err) {
            console.error("listenToMessages setup error:", err);
            callback([]);
        }
    })();

    return () => {
        try { unsub(); } catch (e) { /* ignore */ }
    };
}

/**
 * Listen to all chats for a given doctor (real-time)
 */
export function listenDoctorChats(doctorId: string, callback: (chats: any[]) => void) {
    const q = query(collection(db, "chats"), where("doctorId", "==", doctorId));

    return onSnapshot(q, async (snapshot) => {
        const chatList = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                // Prefer an embedded patientName on the chat document; fall back to patientId
                let patientName = (data.patientName as string) || data.patientId;
                try {
                    // If no embedded name, try to fetch the user doc to get a friendly name
                    if (!data.patientName) {
                        const patientDoc = await getDoc(doc(db, "users", data.patientId));
                        if (patientDoc.exists()) {
                            const pdata = patientDoc.data() as any;
                            patientName = pdata.name || pdata.displayName || pdata.email || data.patientId;
                        }
                    }
                } catch (e) {
                    // ignore
                }
                return {
                    id: docSnap.id,
                    ...data,
                    patientName,
                    // Include role-specific last messages for UI display
                    lastMessageFromPatient: data.lastMessageFromPatient || null,
                    lastMessageFromDoctor: data.lastMessageFromDoctor || null,
                };
            })
        );

        callback(chatList);
    });
}

/**
 * List doctors (simple utility). Falls back to all users if none have role === 'doctor'.
 */
export async function listDoctors() {
    const q = query(collection(db, "users"), where("role", "==", "doctor"));
    let snap = await getDocs(q);
    let docs = snap.docs;

    // Fallback: if no doctors explicitly tagged, return all users
    if (docs.length === 0) {
        snap = await getDocs(collection(db, "users"));
        docs = snap.docs;
    }

    return docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * List patients relevant to a doctor. This will prefer patients explicitly assigned to the doctor
 * via fields like `assignedDoctorId`, `doctorId`, or `assignedDoctors` array. If those fields are
 * absent, it returns all patients so the doctor can start chats with them.
 */
export async function listPatientsForDoctor(doctorId: string) {
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const snap = await getDocs(q);

    const patients = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    return patients.filter((p: any) => {
        if (!p) return false;
        if (p.assignedDoctorId) return p.assignedDoctorId === doctorId;
        if (p.doctorId) return p.doctorId === doctorId;
        if (Array.isArray(p.assignedDoctors)) return p.assignedDoctors.includes(doctorId);
        // no assignment information — include so chats can be started
        return true;
    });
}

/**
 * Listen to doctors in real-time. Falls back to all users if none are tagged as doctors.
 */
export function listenDoctors(callback: (docs: any[]) => void) {
    const q = query(collection(db, "users"), where("role", "==", "doctor"));

    try {
        return onSnapshot(q, async (snapshot) => {
            try {
                let docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                if (docs.length === 0) {
                    // fallback to all users (one-off)
                    const allSnap = await getDocs(collection(db, "users"));
                    docs = allSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                }
                callback(docs);
            } catch (innerErr) {
                console.error("listenDoctors processing error:", innerErr);
                callback([]);
            }
        }, (err) => {
            console.error("listenDoctors onSnapshot error:", err);
            if ((err as any)?.code === 'permission-denied') {
                console.warn("listenDoctors: Firestore rules prevented a client read; try using server function or adjust rules.");
            }
            // call callback with empty array so UI can stop loading
            callback([]);
        });
    } catch (err) {
        console.error("listenDoctors setup error:", err);
        callback([]);
        return () => { /* noop */ };
    }
}

// Server-backed fetch helpers (use when Firestore rules block direct reads)
import { auth } from "@/firebase";

// Use the Functions emulator when running locally (so CORS and rapid iteration work).
const FUNCTIONS_BASE = (typeof window !== "undefined" && window.location.hostname === "localhost")
    ? `http://localhost:5001/echocare-9c2d8/us-central1`
    : "https://us-central1-echocare-9c2d8.cloudfunctions.net";

export async function fetchDoctorsViaFunction() {
    // Try HTTP endpoint with CORS headers set on the function
    try {
        const token = await auth.currentUser?.getIdToken();
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${FUNCTIONS_BASE}/listDoctorsHttp`, {
            method: "GET",
            headers,
            mode: "cors",
        });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const data = await res.json();
        return data as any[];
    } catch (err) {
        console.warn("fetchDoctorsViaFunction http failed, falling back to callable if signed-in:", err);
        // If not signed in, skip callable fallback and let caller handle a realtime or other fallback
        if (!auth.currentUser) {
            console.warn("No authenticated user; skipping callable fallback.");
            throw new Error("not-signed-in");
        }
        // Fallback to callable if http fails and user is signed-in
        try {
            const functions = getFunctions();
            const fn = httpsCallable(functions, "listDoctors");
            const result = await fn();
            return result.data as any[];
        } catch (callErr) {
            console.error("callable listDoctors failed:", callErr);
            throw callErr;
        }
    }
}

export async function fetchPatientsForDoctorViaFunction(doctorId: string) {
    try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${FUNCTIONS_BASE}/listPatientsForDoctorHttp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ doctorId }),
        });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const data = await res.json();
        return data as any[];
    } catch (err) {
        console.warn("fetchPatientsForDoctorViaFunction http failed, falling back to callable:", err);
        const functions = getFunctions();
        const fn = httpsCallable(functions, "listPatientsForDoctor");
        const result = await fn({ doctorId });
        return result.data as any[];
    }
}

/**
 * Listen to patients relevant to a doctor in real-time (prefers assigned patients).
 */
export function listenPatientsForDoctor(doctorId: string, callback: (docs: any[]) => void) {
    // Query all users (fallback for when roles are missing), then pick patient-like users
    const q = query(collection(db, "users"));

    try {
        return onSnapshot(q, (snapshot) => {
            try {
                const all = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

                // Consider a user a patient candidate if role === 'patient' OR role missing
                const isPatientCandidate = (u: any) => (u.role ? u.role === "patient" : true);

                const assigned = all.filter((p: any) => {
                    if (!isPatientCandidate(p)) return false;
                    if (p.assignedDoctorId) return p.assignedDoctorId === doctorId;
                    if (p.doctorId) return p.doctorId === doctorId;
                    if (Array.isArray(p.assignedDoctors)) return p.assignedDoctors.includes(doctorId);
                    return false;
                });

                // If there are assigned patients, show them; otherwise show all patient candidates
                const candidates = all.filter(isPatientCandidate);
                const result = assigned.length > 0 ? assigned : candidates;

                callback(result);
            } catch (innerErr) {
                console.error("listenPatientsForDoctor processing error:", innerErr);
                callback([]);
            }
        }, (err) => {
            console.error("listenPatientsForDoctor onSnapshot error:", err);
            // notify UI with empty array so loading stops and user can refresh
            callback([]);
        });
    } catch (err) {
        console.error("listenPatientsForDoctor setup error:", err);
        callback([]);
        return () => { /* noop */ };
    }
}
