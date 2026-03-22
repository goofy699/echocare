import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, Calendar, FileText, ScrollText, MessageSquare, LogOut } from "lucide-react";

type Props = {
    title: string;
    subtitle?: string;
    children: ReactNode;
};

const links = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/users", label: "Users", icon: Users },
    { path: "/admin/appointments", label: "Appointments", icon: Calendar },
    { path: "/admin/reports", label: "Reports", icon: FileText },
    { path: "/admin/chats", label: "Chat Monitor", icon: MessageSquare },
    { path: "/admin/logs", label: "System Logs", icon: ScrollText },
];

export default function AdminLayout({ title, subtitle, children }: Props) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    {links.map((link) => {
                        const ActiveIcon = link.icon;
                        const selected = location.pathname === link.path;
                        return (
                            <Button
                                key={link.path}
                                variant={selected ? "secondary" : "ghost"}
                                className="w-full justify-start gap-3"
                                onClick={() => navigate(link.path)}
                            >
                                <ActiveIcon className="w-4 h-4" />
                                {link.label}
                            </Button>
                        );
                    })}
                </nav>

                <div className="mt-8 pt-4 border-t">
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-3"
                        onClick={() => {
                            auth.signOut();
                            navigate("/auth");
                        }}
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </Button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
                        {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
