import { useEffect, useState } from "react";
import { auth } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

export type UserRole = "patient" | "doctor" | "caregiver" | "admin";

export function useUserRole() {
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        getDoc(doc(db, "users", user.uid)).then((snap) => {
            if (snap.exists()) {
                setRole(snap.data().role);
            }
            setLoading(false);
        });
    }, []);

    return { role, loading };
}
