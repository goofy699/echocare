import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, Calendar, MessageSquare, BarChart3, Settings, Search, Bell, CheckCircle, Clock, TrendingUp, Star, Send } from "lucide-react";

export default function DoctorDashboard() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
        <Logo className="mb-8" />
        
        <nav className="space-y-2">
          <Button variant="secondary" className="w-full justify-start gap-3">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Users className="w-4 h-4" />
            Patients
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Calendar className="w-4 h-4" />
            Appointments
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <MessageSquare className="w-4 h-4" />
            Messages
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </nav>

        <div className="mt-auto pt-8">
          <Button variant="outline" className="w-full justify-start gap-3">
            <span className="text-sm">🚪</span>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input placeholder="Search Patients..." className="border-0 focus-visible:ring-0" />
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm text-success font-medium">Availability</span>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <Button size="icon" variant="ghost">
                <Bell className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-primary"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Good Morning, Dr. Smith</h1>
          </div>

          {/* Recent Patients */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">Recent Patients</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "John Doe", age: "34 yrs", lastVisit: "2 days ago" },
                { name: "Jane Smith", age: "45 yrs", lastVisit: "1 week ago" },
                { name: "Emily Johnson", age: "28 yrs", lastVisit: "3 weeks ago" },
              ].map((patient, i) => (
                <Card key={i} className="hover:shadow-medium transition-all cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-primary mb-4"></div>
                      <h3 className="font-semibold text-lg">{patient.name}</h3>
                      <p className="text-sm text-muted-foreground">{patient.age}</p>
                      <p className="text-xs text-muted-foreground mt-1">Last visit: {patient.lastVisit}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Consultations</span>
                    </div>
                    <p className="text-2xl font-bold">32</p>
                    <p className="text-xs text-muted-foreground">/ Week</p>
                  </div>

                  <div className="p-4 bg-accent/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-accent" />
                      <span className="text-sm text-muted-foreground">Average Rating</span>
                    </div>
                    <p className="text-2xl font-bold">4.9</p>
                    <p className="text-xs text-muted-foreground">from patients</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Patient Satisfaction</h4>
                  <div className="h-32 bg-muted/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Chart visualization here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-success/10 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">Michael Brown</h4>
                      <Badge className="bg-success/10 text-success hover:bg-success/20">Confirmed</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">10:30 AM • Today</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">Sarah Davis</h4>
                      <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">02:00 PM • Today</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">David Wilson</h4>
                      <Badge className="bg-success/10 text-success hover:bg-success/20">Confirmed</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">09:00 AM • Tomorrow</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patient Chat */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="bg-muted p-3 rounded-lg rounded-tl-none max-w-md">
                      <p className="text-sm">Hello Dr. Smith, I have a question about my prescription.</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">John Doe • 10:45 AM</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <div className="flex-1 flex justify-end">
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none max-w-md">
                      <p className="text-sm">Of course, John. What can I help you with?</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">10:48 AM</p>
              </div>

              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button 
            variant="destructive" 
            className="w-14 h-14 rounded-full fixed bottom-6 right-6 shadow-lg"
          >
            SOS
          </Button>
        </div>
      </main>
    </div>
  );
}
