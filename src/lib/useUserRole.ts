// src/lib/useUserRole.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";

export type UserRole = "patient" | "doctor" | "caregiver" | "admin";

export function useUserRole() {
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            try {
                setLoading(true);

                if (!user) {
                    setRole(null);
                    return;
                }

                const snap = await getDoc(doc(db, "users", user.uid));
                const data = snap.data();

                setRole((data?.role as UserRole) || null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, []);

    return { role, loading };
}
