import { Navigate, Outlet } from "react-router-dom";
import { auth } from "@/firebase";

type Role = "patient" | "doctor" | "caregiver" | "admin";

export default function RoleRoute({ allow }: { allow: Role[] }) {
    const user = auth.currentUser;

    // TEMP (your current method): role stored in displayName
    const role = (user?.displayName || "") as Role;

    if (!user) return <Navigate to="/auth" replace />;

    if (!allow.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
