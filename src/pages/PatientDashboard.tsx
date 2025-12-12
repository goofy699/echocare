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
  Heart,
  Footprints,
  Pill,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function PatientDashboard() {
  // sidebar nav extracted so we can reuse it in desktop + mobile drawer
  const Nav = () => (
    <nav className="space-y-2">
      <Button variant="secondary" className="w-full justify-start gap-3">
        <Home className="w-4 h-4" />
        Home
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-3">
        <MessageSquare className="w-4 h-4" />
        Chatbot
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-3">
        <Calendar className="w-4 h-4" />
        Appointments
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-3">
        <Bell className="w-4 h-4" />
        Reminders
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-3">
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

      {/* MAIN COLUMN (works for both mobile + desktop) */}
      <div className="flex-1 flex flex-col">
        {/* MOBILE TOP BAR */}
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
                  <SheetTitle className="flex items-center gap-2">
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <Nav />
              </SheetContent>
            </Sheet>

            <span className="font-semibold text-sm">Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost"> 
              <Bell className="w-5 h-5" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-gradient-primary" />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* HEADER (welcome + actions) */}
            <div className="flex justify-between items-start mb-8">
              <div>
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

              {/* Right-side user info: only on larger screens */}
              <div className="hidden lg:flex items-center gap-4">
                <Button size="icon" variant="ghost">
                  <Bell className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary" />
                  <div className="text-right">
                    <p className="text-sm font-medium">Jane Doe</p>
                    <p className="text-xs text-muted-foreground">
                      patient.email@example.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* HEALTH STATS – stack on mobile, 3 cols on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Heart Rate
                    </CardTitle>
                    <Heart className="w-4 h-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    72{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      BPM
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Steps
                    </CardTitle>
                    <Footprints className="w-4 h-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">4,520</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Medication
                    </CardTitle>
                    <Pill className="w-4 h-4 text-success" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">Taken</div>
                </CardContent>
              </Card>
            </div>

            {/* MAIN GRID – 1 col on mobile, 2 cols on lg+ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Weekly Health Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Health Trends</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Blood Pressure (Systolic)
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Chart visualization here
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Appointments */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Upcoming Appointments</CardTitle>
                    <Button variant="link" className="text-accent">
                      View All Appointments
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4 p-4 bg-accent/10 rounded-lg">
                    <div className="bg-accent text-accent-foreground px-3 py-2 rounded-lg text-center">
                      <div className="text-xs">OCT</div>
                      <div className="text-2xl font-bold">28</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Dr. Evelyn Reed</h4>
                      <p className="text-sm text-muted-foreground">
                        Cardiology
                      </p>
                      <p className="text-sm">10:30 AM • Video Call</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 border rounded-lg">
                    <div className="bg-muted text-foreground px-3 py-2 rounded-lg text-center">
                      <div className="text-xs">NOV</div>
                      <div className="text-2xl font-bold">05</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Dr. Ben Carter</h4>
                      <p className="text-sm text-muted-foreground">
                        Dermatology
                      </p>
                      <p className="text-sm">02:00 PM • In-Person</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 border rounded-lg">
                    <div className="bg-muted text-foreground px-3 py-2 rounded-lg text-center">
                      <div className="text-xs">NOV</div>
                      <div className="text-2xl font-bold">12</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Dr. Chloe Davis</h4>
                      <p className="text-sm text-muted-foreground">
                        General Check-up
                      </p>
                      <p className="text-sm">09:00 AM • Video Call</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medication Adherence */}
              <Card>
                <CardHeader>
                  <CardTitle>Medication Adherence</CardTitle>
                  <p className="text-sm text-muted-foreground">Last 7 days</p>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Chart visualization here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* FLOATING FABs – visible on both mobile + desktop */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Button className="w-12 h-12 rounded-full shadow-lg bg-accent">
          <MessageSquare className="w-6 h-6" />
        </Button>
        <Button
          variant="destructive"
          className="w-12 h-12 rounded-full shadow-lg"
        >
          <LifeBuoy className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
