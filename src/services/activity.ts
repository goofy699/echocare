import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";

export async function recordUserActivity(input: {
    type: "login" | "usage" | "signup" | string;
    route?: string;
    metadata?: Record<string, unknown>;
}) {
    const callable = httpsCallable(functions, "recordUserActivity");
    await callable(input);
}
