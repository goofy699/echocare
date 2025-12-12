import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, Search, Bell, CheckCircle, AlertCircle, Clock, Phone, LifeBuoy } from "lucide-react";

export default function CaregiverDashboard() {
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
            <MessageSquare className="w-4 h-4" />
            Messages
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Calendar className="w-4 h-4" />
            Schedule
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </nav>

        <div className="mt-auto pt-8">
          <div className="flex items-center gap-3 p-4 bg-card border rounded-lg">
            <div className="w-12 h-12 rounded-full bg-gradient-primary"></div>
            <div>
              <p className="text-sm font-medium">Dr. Evelyn Reed</p>
              <p className="text-xs text-muted-foreground">Caregiver</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Good Morning, Evelyn</h1>
              <p className="text-muted-foreground">Here's a summary of your patients' activity today.</p>
            </div>

            <div className="flex items-center gap-4">
              <Button size="icon" variant="ghost">
                <Search className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* SOS Alert */}
          <Card className="mb-8 border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted"></div>
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <LifeBuoy className="w-5 h-5 text-destructive" />
                      Active SOS Alert
                    </h3>
                    <p className="text-sm font-medium">Arthur Morgan</p>
                    <p className="text-sm text-muted-foreground">Fall Detected - No Response</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <span>📍</span> 123 Maple Street, Lakeside, OH
                    </p>
                  </div>
                </div>
                <Button className="bg-destructive hover:bg-destructive/90">
                  <Phone className="w-4 h-4 mr-2" />
                  Contact Patient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tracked Patients */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Tracked Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3">PATIENT NAME</th>
                      <th className="pb-3">STATUS</th>
                      <th className="pb-3">LAST CHECK-IN</th>
                      <th className="pb-3">ALERTS</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary"></div>
                          <span className="font-medium">Beatrice Miller</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge className="bg-success/10 text-success hover:bg-success/20">Stable</Badge>
                      </td>
                      <td className="py-4">10:45 AM</td>
                      <td className="py-4">
                        <Bell className="w-4 h-4 text-muted-foreground opacity-30" />
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary"></div>
                          <span className="font-medium">Arthur Morgan</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Needs Attention</Badge>
                      </td>
                      <td className="py-4">9:30 AM</td>
                      <td className="py-4">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary"></div>
                          <span className="font-medium">Charles Smith</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge className="bg-success/10 text-success hover:bg-success/20">Stable</Badge>
                      </td>
                      <td className="py-4">11:00 AM</td>
                      <td className="py-4">
                        <Bell className="w-4 h-4 text-muted-foreground opacity-30" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Medication Reminders */}
          <Card>
            <CardHeader>
              <CardTitle>Medication Reminders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Beatrice Miller - Lisinopril 10mg</p>
                  <p className="text-sm text-muted-foreground">Due: 6:00 AM</p>
                </div>
                <Badge className="bg-success/10 text-success hover:bg-success/20">Taken</Badge>
              </div>

              <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Arthur Morgan - Metformin 500mg</p>
                  <p className="text-sm text-muted-foreground">Due: 9:00 AM</p>
                </div>
                <Badge variant="destructive">Missed</Badge>
              </div>

              <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
                <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Charles Smith - Atorvastatin 20mg</p>
                  <p className="text-sm text-muted-foreground">Due: 12:00 PM</p>
                </div>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Upcoming</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Messages</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                    Patients
                  </Button>
                  <Button variant="ghost" size="sm">
                    Doctors
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 hover:bg-muted/50 rounded-lg cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">Beatrice Miller</p>
                    <span className="text-xs text-muted-foreground">10m ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    Thanks for checking on me! I'm feeling much better today.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 hover:bg-muted/50 rounded-lg cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex-shrink-0 relative">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">Charles Smith</p>
                    <span className="text-xs text-muted-foreground">1h ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    Just wanted to confirm my appointment for tomorrow.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 hover:bg-muted/50 rounded-lg cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex-shrink-0 relative">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">Arthur Morgan</p>
                    <span className="text-xs text-muted-foreground">Yesterday</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    I've been feeling a bit dizzy after the new medication.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            variant="destructive" 
            className="w-14 h-14 rounded-full fixed bottom-6 right-6 shadow-lg"
          >
            <LifeBuoy className="w-6 h-6" />
          </Button>
        </div>
      </main>
    </div>
  );
}
