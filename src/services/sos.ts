import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/firebase";

export type SosAlert = {
    id: string;
    patientId: string;
    patientName?: string;
    caregiverId?: string | null;
    doctorId?: string | null;
    lat: number;
    lng: number;
    address?: string | null;
    source?: string | null;
    status?: "active" | "resolved";
    createdAt?: any;
    updatedAt?: any;
};

export async function createSosAlert(params: {
    patientId: string;
    patientName?: string;
    caregiverId?: string | null;
    doctorId?: string | null;
    lat: number;
    lng: number;
    address?: string | null;
    source?: string;
}) {
    const payload = {
        patientId: params.patientId,
        patientName: params.patientName || null,
        caregiverId: params.caregiverId || null,
        doctorId: params.doctorId || null,
        lat: params.lat,
        lng: params.lng,
        address: params.address || null,
        source: params.source || "sos",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminVisibility: true,
    };

    const ref = await addDoc(collection(db, "sosAlerts"), payload);
    return ref.id;
}

export function listenSosAlertsForCaregiver(caregiverId: string, callback: (alerts: SosAlert[]) => void) {
    const q = query(
        collection(db, "sosAlerts"),
        where("caregiverId", "==", caregiverId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(
        q,
        (snap) => {
            const alerts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            callback(alerts as SosAlert[]);
        },
        () => callback([])
    );
}

export function listenSosAlertsForAdmin(callback: (alerts: SosAlert[]) => void) {
    const q = query(collection(db, "sosAlerts"), orderBy("createdAt", "desc"));
    return onSnapshot(
        q,
        (snap) => {
            const alerts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            callback(alerts as SosAlert[]);
        },
        () => callback([])
    );
}
