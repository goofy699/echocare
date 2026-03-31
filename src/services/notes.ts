import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "@/firebase";

export type PatientNote = {
    id: string;
    patientId: string;
    title: string;
    content: string;
    createdAt?: Date;
    updatedAt?: Date;
};

const normalizeNote = (id: string, data: any): PatientNote => ({
    id,
    patientId: data.patientId,
    title: data.title || "Untitled note",
    content: data.content || "",
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
});

export async function createPatientNote(input: {
    patientId: string;
    title: string;
    content: string;
}) {
    await addDoc(collection(db, "notes"), {
        patientId: input.patientId,
        createdBy: input.patientId,
        title: input.title.trim() || "Untitled note",
        content: input.content.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function updatePatientNote(noteId: string, patch: { title?: string; content?: string }) {
    await updateDoc(doc(db, "notes", noteId), {
        ...(patch.title != null ? { title: patch.title.trim() || "Untitled note" } : {}),
        ...(patch.content != null ? { content: patch.content.trim() } : {}),
        updatedAt: serverTimestamp(),
    });
}

export async function deletePatientNote(noteId: string) {
    await deleteDoc(doc(db, "notes", noteId));
}

export function listenPatientNotes(patientId: string, cb: (notes: PatientNote[]) => void) {
    const q = query(
        collection(db, "notes"),
        where("patientId", "==", patientId),
        orderBy("updatedAt", "desc")
    );

    return onSnapshot(q, (snap) => {
        cb(snap.docs.map((d) => normalizeNote(d.id, d.data())));
    });
}
