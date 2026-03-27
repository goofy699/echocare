import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";

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
