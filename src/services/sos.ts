import {
    addDoc,
    collection,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
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

    const sosRef = await addDoc(collection(db, "sosAlerts"), payload);

    const mapUrl = `https://maps.google.com/?q=${params.lat},${params.lng}`;
    const locationText = params.address || `${params.lat}, ${params.lng}`;
    const patientName = params.patientName || "Patient";

    // Notification for assigned caregiver
    if (params.caregiverId) {
        await addDoc(collection(db, "notifications"), {
            type: "sos",
            title: `🚨 SOS Alert from ${patientName}`,
            body: `${patientName} needs immediate help at ${locationText}`,
            senderId: params.patientId,
            senderName: patientName,
            recipientId: params.caregiverId,
            recipientRole: "caregiver",
            sosAlertId: sosRef.id,
            lat: params.lat,
            lng: params.lng,
            address: params.address || null,
            mapUrl,
            read: false,
            createdAt: serverTimestamp(),
        });
    }

    // Optional notification for assigned doctor
    if (params.doctorId) {
        await addDoc(collection(db, "notifications"), {
            type: "sos",
            title: `🚨 SOS Alert from ${patientName}`,
            body: `${patientName} needs immediate help at ${locationText}`,
            senderId: params.patientId,
            senderName: patientName,
            recipientId: params.doctorId,
            recipientRole: "doctor",
            sosAlertId: sosRef.id,
            lat: params.lat,
            lng: params.lng,
            address: params.address || null,
            mapUrl,
            read: false,
            createdAt: serverTimestamp(),
        });
    }

    return sosRef.id;
}

export function listenSosAlertsForCaregiver(
    caregiverId: string,
    callback: (alerts: SosAlert[]) => void
) {
    const q = query(
        collection(db, "sosAlerts"),
        where("caregiverId", "==", caregiverId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(
        q,
        (snap) => {
            const alerts = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
            }));
            callback(alerts as SosAlert[]);
        },
        (error) => {
            console.error("listenSosAlertsForCaregiver error:", error);
            callback([]);
        }
    );
}

export function listenSosAlertsForAdmin(callback: (alerts: SosAlert[]) => void) {
    const q = query(collection(db, "sosAlerts"), orderBy("createdAt", "desc"));

    return onSnapshot(
        q,
        (snap) => {
            const alerts = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
            }));
            callback(alerts as SosAlert[]);
        },
        (error) => {
            console.error("listenSosAlertsForAdmin error:", error);
            callback([]);
        }
    );
}