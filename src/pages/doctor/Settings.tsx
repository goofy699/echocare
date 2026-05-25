import { useMemo } from "react";
import { auth } from "@/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { ShieldCheck, UserCircle2, CalendarClock, BarChart3, MessageSquare, LayoutDashboard, Users, CalendarIcon, FileText, Settings as SettingsIcon, Menu, LogOut } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function DoctorSettings() {
    const navigate = useNavigate();
    const user = auth.currentUser;

    const sections = useMemo(
        () => [
            {
                key: "profile",
                title: "Profile Settings",
                description: "Update your name, specialty, and contact details.",
                icon: UserCircle2,
                path: "/doctor/profile",
                cta: "Open Profile",
            },
            {
                key: "availability",
                title: "Availability & Scheduling",
                description: "Manage availability and review upcoming appointments.",
                icon: CalendarClock,
                path: "/doctor/appointments",
                cta: "Manage Availability",
            },
            {
                key: "preferences",
                title: "Notifications & Preferences",
                description: "Adjust theme, alerts, and sharing settings.",
                icon: BarChart3,
                path: "/doctor/profile#preferences",
                cta: "Open Preferences",
            },
            {
                key: "messages",
                title: "Messages",
                description: "Jump into patient messages to manage chats and alerts.",
                icon: MessageSquare,
                path: "/doctor/messages",
                cta: "Open Messages",
            },
        ],
        []
    );

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            {/* MOBILE HEADER */}
            <header className="border-b border-border bg-card sticky top-0 z-40 lg:hidden">
                <div className="flex items-center gap-4 h-16 px-4">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="ghost">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left">
                            <SheetHeader>
                                <SheetTitle>
                                    <Logo />
                                </SheetTitle>
                            </SheetHeader>
                            <nav className="space-y-2 mt-6">
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor")}>
                                    <LayoutDashboard className="w-4 h-4" />
                                    Dashboard
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
                                    <Users className="w-4 h-4" />
                                    Patients
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/appointments")}>
                                    <CalendarIcon className="w-4 h-4" />
                                    Appointments
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/messages")}>
                                    <MessageSquare className="w-4 h-4" />
                                    Messages
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/reports")}>
                                    <FileText className="w-4 h-4" />
                                    Reports
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/analytics")}>
                                    <BarChart3 className="w-4 h-4" />
                                    Analytics
                                </Button>
                                <Button variant="secondary" className="w-full justify-start gap-3">
                                    <SettingsIcon className="w-4 h-4" />
                                    Settings
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3 mt-4"
                                    onClick={() => {
                                        auth.signOut();
                                        navigate("/auth");
                                    }}
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </Button>
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <h1 className="font-semibold">Settings</h1>
                </div>
            </header>

            {/* DESKTOP SIDEBAR */}
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
                <Logo className="mb-8" />
                <nav className="space-y-2">
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor")}>
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="sidebar-label">Dashboard</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
                        <Users className="w-4 h-4" />
                        <span className="sidebar-label">Patients</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/appointments")}>
                        <CalendarIcon className="w-4 h-4" />
                        <span className="sidebar-label">Appointments</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/messages")}>
                        <MessageSquare className="w-4 h-4" />
                        <span className="sidebar-label">Messages</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/reports")}>
                        <FileText className="w-4 h-4" />
                        <span className="sidebar-label">Reports</span>
                    </Button>
                    <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/analytics")}>
                        <BarChart3 className="w-4 h-4" />
                        <span className="sidebar-label">Analytics</span>
                    </Button>
                    <Button variant="secondary" className="sidebar-item w-full justify-start gap-3">
                        <SettingsIcon className="w-4 h-4" />
                        <span className="sidebar-label">Settings</span>
                    </Button>
                </nav>
                <div className="mt-auto pt-8">
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
                <div className="max-w-5xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Doctor Settings</h1>
                        <p className="text-sm text-muted-foreground mt-1">Choose the settings area you want to manage.</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Settings Center</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-md border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <p className="font-medium">Signed in as</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email || "Unknown email"}</p>
                                </div>
                                <Badge variant="outline">
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Doctor Account
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    return (
                                        <Card key={section.key} className="border-dashed">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Icon className="w-4 h-4" />
                                                    {section.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <p className="text-sm text-muted-foreground">{section.description}</p>
                                                <Button className="w-full" variant="outline" onClick={() => navigate(section.path)}>
                                                    {section.cta}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
