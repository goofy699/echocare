import {
    Timestamp,
    addDoc,
    collection,
    doc,
    getDoc,
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
    return [...items].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

function uniqueIds(ids: Array<string | null | undefined>) {
    return Array.from(new Set(ids.filter(Boolean))) as string[];
}

export async function createAppointment(input: CreateAppointmentInput) {
    let caregiverId = input.caregiverId ?? null;
    let caregiverName = input.caregiverName ?? null;
    let patientName = input.patientName || "Patient";

    try {
        const patientSnap = await getDoc(doc(db, "users", input.patientId));

        if (patientSnap.exists()) {
            const patient = patientSnap.data() as any;
            patientName = input.patientName || patient.name || patient.displayName || patient.email || "Patient";
            caregiverId = caregiverId || patient.assignedCaregiverId || patient.caregiverId || null;
            caregiverName = caregiverName || patient.assignedCaregiverName || null;
        }
    } catch (error) {
        console.error("Failed to fetch patient for appointment notification:", error);
    }

    const appointmentRef = await addDoc(collection(db, "appointments"), {
        patientId: input.patientId,
        patientName,
        doctorId: input.doctorId,
        doctorName: input.doctorName,
        caregiverId,
        caregiverName,
        location: input.location,
        notes: input.notes ?? "",
        scheduledAt: Timestamp.fromDate(input.scheduledAt),
        createdBy: input.createdBy,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    const recipients = uniqueIds([
        input.patientId,
        input.doctorId,
        caregiverId,
    ]);

    await Promise.all(
        recipients.map((recipientId) => {
            let recipientRole: "patient" | "doctor" | "caregiver" = "patient";

            if (recipientId === input.doctorId) {
                recipientRole = "doctor";
            } else if (recipientId === caregiverId) {
                recipientRole = "caregiver";
            }

            return addDoc(collection(db, "notifications"), {
                type: "appointment",
                title: "Appointment booked",
                body: `${patientName} has an appointment with ${input.doctorName} at ${input.scheduledAt.toLocaleString()}.`,
                senderId: input.createdBy,
                recipientId,
                recipientRole,
                patientId: input.patientId,
                patientName,
                doctorId: input.doctorId,
                doctorName: input.doctorName,
                caregiverId,
                caregiverName,
                appointmentId: appointmentRef.id,
                scheduledAt: Timestamp.fromDate(input.scheduledAt),
                location: input.location,
                read: false,
                createdAt: serverTimestamp(),
            });
        })
    );

    return appointmentRef.id;
}

export function listenAppointmentsByPatient(
    patientId: string,
    callback: (appointments: AppointmentRecord[]) => void
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
        }
    );
}

export function listenAppointmentsByDoctor(
    doctorId: string,
    callback: (appointments: AppointmentRecord[]) => void
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
        }
    );
}

export function listenAppointmentsForCaregiver(
    caregiverId: string,
    callback: (appointments: AppointmentRecord[]) => void
) {
    const q = query(collection(db, "appointments"));

    return onSnapshot(
        q,
        (snapshot) => {
            const mapped = snapshot.docs
                .map((d) => toAppointmentRecord(d.data(), d.id))
                .filter(
                    (item) =>
                        item.caregiverId === caregiverId ||
                        item.createdBy === caregiverId
                );

            callback(sortByDate(mapped));
        },
        (error) => {
            console.error("listenAppointmentsForCaregiver error:", error);
            callback([]);
        }
    );
}

export async function clearPastAppointments(
    role: AppointmentRole,
    userId: string,
    now: Date = new Date()
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
                        (role === "caregiver" &&
                            (record.caregiverId === userId || record.createdBy === userId));

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
            }
        );
    });
}

export async function updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
) {
    await updateDoc(doc(db, "appointments", appointmentId), {
        status,
        updatedAt: serverTimestamp(),
    });
}

export function splitAppointments(
    appointments: AppointmentRecord[],
    now: Date = new Date()
) {
    const nowMs = now.getTime();
    const upcoming = appointments.filter((item) => item.scheduledAt.getTime() >= nowMs);
    const past = appointments.filter((item) => item.scheduledAt.getTime() < nowMs);

    return {
        upcoming,
        past,
    };
}