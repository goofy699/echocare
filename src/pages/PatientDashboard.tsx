import { useNavigate, Outlet, useLocation } from "react-router-dom";
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
  Pill,
  Menu,
  MessagesSquare,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const Nav = () => (
    <nav className="space-y-2">
      <Button
        variant="secondary"
        className="w-full justify-start gap-3"
        onClick={() => navigate("/patient")}
      >
        <Home className="w-4 h-4" />
        Home
      </Button>

      {/* ✅ NEW MESSAGES BUTTON */}
      <Button
        variant="ghost"
        className="w-full justify-start gap-3"
        onClick={() => navigate("/patient/messages")}
      >
        <MessagesSquare className="w-4 h-4" />
        Messages
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3"
        onClick={() => navigate("/patient/chatbot")}
      >
        <MessageSquare className="w-4 h-4" />
        Chatbot
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3"
        onClick={() => navigate("/patient/appointments")}
      >
        <Calendar className="w-4 h-4" />
        Appointments
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3"
        onClick={() => navigate("/patient/reminders")}
      >
        <Bell className="w-4 h-4" />
        Reminders
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3"
        onClick={() => navigate("/patient/reports")}
      >
        <FileText className="w-4 h-4" />
        Reports
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-destructive"
      >
        <LifeBuoy className="w-4 h-4" />
        SOS
      </Button>

      <Button variant="ghost" className="w-full justify-start gap-3">
        <ThumbsUp className="w-4 h-4" />
        Feedback
      </Button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
        <Logo className="mb-8" />
        <Nav />
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col">
        {/* MOBILE HEADER */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-card lg:hidden">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-6">
                <SheetHeader className="mb-4">
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <Nav />
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm">Dashboard</span>
          </div>
          <Button size="icon" variant="ghost">
            <Bell className="w-5 h-5" />
          </Button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {location.pathname === "/patient" ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    Welcome Back, Jane!
                  </h1>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-6">
                    Today&apos;s Health Overview
                  </h2>

                  <div className="flex flex-wrap gap-3">
                    <Button className="gap-2">
                      <Calendar className="w-4 h-4" />
                      Book Appointment
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <FileText className="w-4 h-4" />
                      Add Note
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Bell className="w-4 h-4" />
                      Check Reminders
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 mb-8">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Medication Status
                        </CardTitle>
                        <Pill className="w-4 h-4 text-success" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-success">Taken</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Today’s medication completed
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Health Trends</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Blood Pressure (Systolic)
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                          Health trend visualization will appear here
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Appointments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold">Dr. Evelyn Reed</h4>
                        <p className="text-sm text-muted-foreground">
                          Cardiology • 28 Oct • 10:30 AM
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold">Dr. Ben Carter</h4>
                        <p className="text-sm text-muted-foreground">
                          Dermatology • 05 Nov • 02:00 PM
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Medication Adherence</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Last 7 days
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                          Medication adherence visualization will appear here
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Button className="w-12 h-12 rounded-full shadow-lg bg-accent">
          <MessageSquare className="w-6 h-6" />
        </Button>
        <Button variant="destructive" className="w-12 h-12 rounded-full shadow-lg">
          <LifeBuoy className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
