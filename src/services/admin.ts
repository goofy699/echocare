import { httpsCallable } from "firebase/functions";
import { functions, auth } from "@/firebase";

export type AdminCreateUserInput = {
    email: string;
    password: string;
    role: "patient" | "doctor" | "caregiver" | "admin";
    name?: string;
};

const PROJECT_ID = "echocare-9c2d8";
const REGION = "us-central1";

const LOCAL_FUNCTIONS_BASE_URL = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`;
const PRODUCTION_FUNCTIONS_BASE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

const FUNCTIONS_BASE_URL = import.meta.env.DEV
    ? LOCAL_FUNCTIONS_BASE_URL
    : PRODUCTION_FUNCTIONS_BASE_URL;

async function getCurrentUserToken() {
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
        throw new Error("Not signed in");
    }

    return token;
}

async function postToHttpFunction<T>(
    functionName: string,
    input: Record<string, any>
): Promise<T> {
    const token = await getCurrentUserToken();

    const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input || {}),
    });

    let payload: any = null;

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error || `Request failed with status ${response.status}`);
    }

    return payload as T;
}

export async function adminCreateUser(input: AdminCreateUserInput) {
    return postToHttpFunction<{ uid: string; email: string; role: string }>(
        "adminCreateUserHttp",
        input
    );
}

export async function adminSetUserSuspended(input: {
    uid: string;
    suspended: boolean;
    reason?: string;
}) {
    const callable = httpsCallable(functions, "adminSetUserSuspended");
    const result = await callable(input);
    return result.data as { uid: string; suspended: boolean };
}

export async function adminDeleteUser(input: { uid: string }) {
    const callable = httpsCallable(functions, "adminDeleteUser");
    const result = await callable(input);
    return result.data as { uid: string; deleted: boolean };
}

export async function adminSetUserPassword(input: {
    uid: string;
    newPassword: string;
}) {
    const callable = httpsCallable(functions, "adminSetUserPassword");
    const result = await callable(input);
    return result.data as { uid: string; passwordUpdated: boolean };
}

export async function adminGeneratePasswordResetLink(input: {
    uid?: string;
    email?: string;
}) {
    const callable = httpsCallable(functions, "adminGeneratePasswordResetLink");
    const result = await callable(input);
    return result.data as { uid: string; email: string; resetLink: string };
}

export async function listUserActivity(input: { uid?: string; limit?: number }) {
    return postToHttpFunction<
        Array<{
            id: string;
            uid: string | null;
            email: string | null;
            role: string | null;
            type: string | null;
            route: string | null;
            metadata: Record<string, any> | null;
            createdAt: any;
        }>
    >("listUserActivityHttp", input);
}