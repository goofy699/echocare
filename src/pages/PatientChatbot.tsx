import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import {
    Home,
    MessageSquare,
    Calendar,
    Bell,
    FileText,
    LifeBuoy,
    ThumbsUp,
    Menu,
    Send,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function PatientChatbot() {
    const Nav = () => (
        <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3">
                <Home className="w-4 h-4" /> Home
            </Button>
            <Button variant="secondary" className="w-full justify-start gap-3">
                <MessageSquare className="w-4 h-4" /> Chatbot
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
                <Calendar className="w-4 h-4" /> Appointments
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
                <Bell className="w-4 h-4" /> Reminders
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
                <FileText className="w-4 h-4" /> Reports
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-destructive">
                <LifeBuoy className="w-4 h-4" /> SOS
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
                <ThumbsUp className="w-4 h-4" /> Feedback
            </Button>
        </nav>
    );

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 bg-card border-r p-6 hidden lg:block">
                <Logo className="mb-8" />
                <Nav />
            </aside>

            <div className="flex-1 flex flex-col">
                <header className="flex items-center justify-between px-4 py-3 border-b bg-card lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64 p-6">
                            <SheetHeader>
                                <SheetTitle><Logo /></SheetTitle>
                            </SheetHeader>
                            <Nav />
                        </SheetContent>
                    </Sheet>
                    <Bell className="w-5 h-5" />
                </header>

                <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
                    <h1 className="text-2xl font-bold mb-6">AI Health Assistant</h1>

                    <Card className="h-[500px] flex flex-col">
                        <CardHeader>
                            <CardTitle>Chatbot</CardTitle>
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col justify-between">
                            <div className="flex-1 bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                                Chat messages will appear here
                            </div>

                            <div className="mt-4 flex gap-2">
                                <input
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                    placeholder="Type your question..."
                                />
                                <Button>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
