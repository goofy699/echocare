import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import PatientChatbot from "@/pages/patient/Chatbot";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
    LayoutDashboard,
    Users,
    Calendar,
    MessageSquare,
    BarChart3,
    Settings,
    FileText,
    Bot,
    Menu,
    LogOut,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function DoctorChatbot() {
    const navigate = useNavigate();

    const logout = async () => {
        sessionStorage.removeItem("echocare_logged_in");
        await auth.signOut();
        navigate("/auth", { replace: true });
    };

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
                                    <Calendar className="w-4 h-4" />
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
                                    <Bot className="w-4 h-4" />
                                    AI Assistant
                                </Button>

                                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/settings")}>
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </Button>

                                <Button variant="outline" className="w-full justify-start gap-3 mt-4" onClick={logout}>
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </Button>
                            </nav>
                        </SheetContent>
                    </Sheet>

                    <Logo className="h-8" />
                </div>
            </header>

            {/* DESKTOP SIDEBAR */}
            <aside className="w-64 bg-card border-r border-border p-6 hidden lg:flex flex-col">
                <Logo className="mb-8" />

                <nav className="space-y-2 flex-1">
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor")}>
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Button>

                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
                        <Users className="w-4 h-4" />
                        Patients
                    </Button>

                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/appointments")}>
                        <Calendar className="w-4 h-4" />
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
                        <Bot className="w-4 h-4" />
                        AI Assistant
                    </Button>

                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/settings")}>
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
                </nav>

                <Button variant="outline" className="w-full justify-start gap-3" onClick={logout}>
                    <LogOut className="w-4 h-4" />
                    Logout
                </Button>
            </aside>

            {/* MAIN CHATBOT */}
            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <PatientChatbot />
            </main>
        </div>
    );
}