// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { auth } from "@/firebase";

export default function ProtectedRoute() {
    const location = useLocation();

    if (!auth.currentUser) {
        return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
    }

    return <Outlet />;
}
