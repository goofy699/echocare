import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase";

export type UserRole = "patient" | "doctor" | "caregiver" | "admin";

export async function setUserRole(uid: string, email: string, role: UserRole) {
    await setDoc(
        doc(db, "users", uid),
        { email, role, createdAt: serverTimestamp() },
        { merge: true }
    );
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return (data.role as UserRole) ?? null;
}
