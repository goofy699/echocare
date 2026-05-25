import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, Calendar, FileText, ScrollText, MessageSquare, LogOut, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate("/auth");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:flex flex-col">
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

                <div className="pt-2 border-t mt-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-3"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Mobile Navigation */}
            <div className="lg:hidden border-b border-border p-4 bg-card flex items-center justify-between sticky top-0 z-50">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="lg:hidden">
                            <Menu className="w-5 h-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
                        <SheetHeader>
                            <SheetTitle>Menu</SheetTitle>
                        </SheetHeader>
                        <nav className="space-y-2 mt-6">
                            {links.map((link) => {
                                const ActiveIcon = link.icon;
                                const selected = location.pathname === link.path;
                                return (
                                    <Button
                                        key={link.path}
                                        variant={selected ? "secondary" : "ghost"}
                                        className="w-full justify-start gap-3"
                                        onClick={() => {
                                            navigate(link.path);
                                            setMobileMenuOpen(false);
                                        }}
                                    >
                                        <ActiveIcon className="w-4 h-4" />
                                        {link.label}
                                    </Button>
                                );
                            })}
                        </nav>

                        <div className="pt-2 border-t mt-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
                <Logo className="h-8" />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{title}</h1>
                        {subtitle ? <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
