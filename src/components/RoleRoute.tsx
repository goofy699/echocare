
import { Navigate, Outlet } from "react-router-dom";
import { useUserRole, UserRole } from "@/lib/useUserRole";

export default function RoleRoute({ allow }: { allow: UserRole[] }) {
    const { role, loading } = useUserRole();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading...
            </div>
        );
    }

    if (!role || !allow.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
