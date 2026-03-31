import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";
import { auth } from "@/firebase";

export type AdminCreateUserInput = {
    email: string;
    password: string;
    role: "patient" | "doctor" | "caregiver" | "admin";
    name?: string;
};

export async function adminCreateUser(input: AdminCreateUserInput) {
    const callable = httpsCallable(functions, "adminCreateUser");
    const result = await callable(input);
    return result.data as { uid: string; email: string; role: string };
}

export async function adminSetUserSuspended(input: { uid: string; suspended: boolean; reason?: string }) {
    const callable = httpsCallable(functions, "adminSetUserSuspended");
    const result = await callable(input);
    return result.data as { uid: string; suspended: boolean };
}

export async function adminDeleteUser(input: { uid: string }) {
    const callable = httpsCallable(functions, "adminDeleteUser");
    const result = await callable(input);
    return result.data as { uid: string; deleted: boolean };
}

export async function adminSetUserPassword(input: { uid: string; newPassword: string }) {
    const callable = httpsCallable(functions, "adminSetUserPassword");
    const result = await callable(input);
    return result.data as { uid: string; passwordUpdated: boolean };
}

export async function adminGeneratePasswordResetLink(input: { uid?: string; email?: string }) {
    const callable = httpsCallable(functions, "adminGeneratePasswordResetLink");
    const result = await callable(input);
    return result.data as { uid: string; email: string; resetLink: string };
}

export async function listUserActivity(input: { uid?: string; limit?: number }) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
        throw new Error("Not signed in");
    }

    const response = await fetch(
        "https://us-central1-echocare-9c2d8.cloudfunctions.net/listUserActivityHttp",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(input || {}),
        }
    );

    if (!response.ok) {
        let errorText = "Failed to load user activity.";
        try {
            const payload = await response.json();
            if (payload?.error) errorText = String(payload.error);
        } catch {
            // ignore parsing errors
        }
        throw new Error(errorText);
    }

    const data = await response.json();
    return data as Array<{
        id: string;
        uid: string | null;
        email: string | null;
        role: string | null;
        type: string | null;
        route: string | null;
        metadata: Record<string, any> | null;
        createdAt: any;
    }>;
}
