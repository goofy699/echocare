import {
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { isSameDay } from "date-fns";
import { db } from "@/firebase";

export type ReminderType = "medication" | "appointment" | "task" | "meal" | "activity";
export type ReminderPriority = "high" | "medium" | "low";
export type ReminderStatus = "pending" | "completed" | "canceled";

export type ReminderRecord = {
    id: string;
    patientId: string;
    title: string;
    description: string;
    type: ReminderType;
    priority: ReminderPriority;
    status: ReminderStatus;
    dueAt: Date;
    completedAt?: Date | null;
    canceledAt?: Date | null;
    createdBy: string;
};

export type CreateReminderInput = {
    patientId: string;
    title: string;
    description?: string;
    type: ReminderType;
    priority: ReminderPriority;
    dueAt: Date;
    createdBy: string;
};

function toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof (value as any)?.toDate === "function") return (value as any).toDate();
    const parsed = new Date(value as any);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapReminder(data: any, id: string): ReminderRecord {
    return {
        id,
        patientId: data.patientId,
        title: data.title ?? "Reminder",
        description: data.description ?? "",
        type: (data.type ?? "task") as ReminderType,
        priority: (data.priority ?? "medium") as ReminderPriority,
        status: (data.status ?? "pending") as ReminderStatus,
        dueAt: toDate(data.dueAt) ?? new Date(),
        completedAt: toDate(data.completedAt),
        canceledAt: toDate(data.canceledAt),
        createdBy: data.createdBy ?? "",
    };
}

function sortByDueDate(items: ReminderRecord[]) {
    return [...items].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

export async function createReminder(input: CreateReminderInput) {
    await addDoc(collection(db, "reminders"), {
        patientId: input.patientId,
        title: input.title,
        description: input.description ?? "",
        type: input.type,
        priority: input.priority,
        status: "pending",
        dueAt: Timestamp.fromDate(input.dueAt),
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export function listenRemindersByPatient(
    patientId: string,
    callback: (reminders: ReminderRecord[]) => void,
) {
    const q = query(collection(db, "reminders"), where("patientId", "==", patientId));
    return onSnapshot(
        q,
        (snapshot) => {
            const mapped = snapshot.docs.map((item) => mapReminder(item.data(), item.id));
            callback(sortByDueDate(mapped));
        },
        (error) => {
            console.error("listenRemindersByPatient error:", error);
            callback([]);
        },
    );
}

export async function markReminderCompleted(reminderId: string) {
    await updateDoc(doc(db, "reminders", reminderId), {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function cancelReminder(reminderId: string) {
    await updateDoc(doc(db, "reminders", reminderId), {
        status: "canceled",
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteReminder(reminderId: string) {
    await deleteDoc(doc(db, "reminders", reminderId));
}

export function getReminderBuckets(reminders: ReminderRecord[], now: Date = new Date()) {
    const upcoming = reminders.filter(
        (item) => item.status === "pending" && item.dueAt.getTime() > now.getTime(),
    );
    const completedToday = reminders.filter(
        (item) =>
            item.status === "completed" &&
            item.completedAt &&
            isSameDay(item.completedAt, now),
    );
    const missed = reminders.filter(
        (item) => item.status === "pending" && item.dueAt.getTime() < now.getTime(),
    );

    return {
        upcoming: sortByDueDate(upcoming),
        completedToday: sortByDueDate(completedToday),
        missed: sortByDueDate(missed),
    };
}
