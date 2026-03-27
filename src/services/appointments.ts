import {
    Timestamp,
    addDoc,
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    where,
    writeBatch,
    updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";

export type AppointmentRole = "patient" | "doctor" | "caregiver";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export type AppointmentRecord = {
    id: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    caregiverId?: string | null;
    caregiverName?: string | null;
    location: string;
    notes?: string;
    scheduledAt: Date;
    createdBy: string;
    status: AppointmentStatus;
};

export type CreateAppointmentInput = {
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    caregiverId?: string | null;
    caregiverName?: string | null;
    location: string;
    notes?: string;
    scheduledAt: Date;
    createdBy: string;
};

function toAppointmentRecord(snapshotData: any, id: string): AppointmentRecord {
    const rawDate = snapshotData.scheduledAt;
    const dateValue =
        rawDate instanceof Timestamp
            ? rawDate.toDate()
            : rawDate?.toDate?.() ?? new Date();

    return {
        id,
        patientId: snapshotData.patientId,
        patientName: snapshotData.patientName ?? "Patient",
        doctorId: snapshotData.doctorId,
        doctorName: snapshotData.doctorName ?? "Doctor",
        caregiverId: snapshotData.caregiverId ?? null,
        caregiverName: snapshotData.caregiverName ?? null,
        location: snapshotData.location ?? "",
        notes: snapshotData.notes ?? "",
        scheduledAt: dateValue,
        createdBy: snapshotData.createdBy ?? "",
        status: snapshotData.status ?? "pending",
    };
}

function sortByDate(items: AppointmentRecord[]) {
    return [...items].sort(
        (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
    );
}

export async function createAppointment(input: CreateAppointmentInput) {
    await addDoc(collection(db, "appointments"), {
        patientId: input.patientId,
        patientName: input.patientName,
        doctorId: input.doctorId,
        doctorName: input.doctorName,
        caregiverId: input.caregiverId ?? null,
        caregiverName: input.caregiverName ?? null,
        location: input.location,
        notes: input.notes ?? "",
        scheduledAt: Timestamp.fromDate(input.scheduledAt),
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export function listenAppointmentsByPatient(
    patientId: string,
    callback: (appointments: AppointmentRecord[]) => void,
) {
    const q = query(collection(db, "appointments"), where("patientId", "==", patientId));
    return onSnapshot(
        q,
        (snapshot) => {
            const mapped = snapshot.docs.map((d) => toAppointmentRecord(d.data(), d.id));
            callback(sortByDate(mapped));
        },
        (error) => {
            console.error("listenAppointmentsByPatient error:", error);
            callback([]);
        },
    );
}

export function listenAppointmentsByDoctor(
    doctorId: string,
    callback: (appointments: AppointmentRecord[]) => void,
) {
    const q = query(collection(db, "appointments"), where("doctorId", "==", doctorId));
    return onSnapshot(
        q,
        (snapshot) => {
            const mapped = snapshot.docs.map((d) => toAppointmentRecord(d.data(), d.id));
            callback(sortByDate(mapped));
        },
        (error) => {
            console.error("listenAppointmentsByDoctor error:", error);
            callback([]);
        },
    );
}

export function listenAppointmentsForCaregiver(
    caregiverId: string,
    callback: (appointments: AppointmentRecord[]) => void,
) {
    const q = query(collection(db, "appointments"));
    return onSnapshot(
        q,
        (snapshot) => {
            const mapped = snapshot.docs
                .map((d) => toAppointmentRecord(d.data(), d.id))
                .filter(
                    (item) =>
                        !item.caregiverId || item.caregiverId === caregiverId || item.createdBy === caregiverId,
                );
            callback(sortByDate(mapped));
        },
        (error) => {
            console.error("listenAppointmentsForCaregiver error:", error);
            callback([]);
        },
    );
}

export async function clearPastAppointments(
    role: AppointmentRole,
    userId: string,
    now: Date = new Date(),
) {
    const q = query(collection(db, "appointments"));
    return new Promise<number>((resolve, reject) => {
        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                unsubscribe();
                const batch = writeBatch(db);
                let count = 0;

                snapshot.docs.forEach((d) => {
                    const record = toAppointmentRecord(d.data(), d.id);
                    const isPast = record.scheduledAt.getTime() < now.getTime();
                    if (!isPast) return;

                    const canDelete =
                        (role === "patient" && record.patientId === userId) ||
                        (role === "doctor" && record.doctorId === userId) ||
                        role === "caregiver";

                    if (canDelete) {
                        batch.delete(doc(db, "appointments", d.id));
                        count += 1;
                    }
                });

                if (count > 0) {
                    await batch.commit();
                }

                resolve(count);
            },
            (error) => {
                reject(error);
            },
        );
    });
}

export async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
    await updateDoc(doc(db, "appointments", appointmentId), {
        status,
        updatedAt: serverTimestamp(),
    });
}

export function splitAppointments(appointments: AppointmentRecord[], now: Date = new Date()) {
    const nowMs = now.getTime();
    const upcoming = appointments.filter((item) => item.scheduledAt.getTime() >= nowMs);
    const past = appointments.filter((item) => item.scheduledAt.getTime() < nowMs);
    return { upcoming, past };
}
