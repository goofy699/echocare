import { Navigate, Outlet, useLocation } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/firebase";

export default function ProtectedRoute() {
    const location = useLocation();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
    }

    return <Outlet />;
}
