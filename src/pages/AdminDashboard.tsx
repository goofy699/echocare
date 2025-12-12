import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, Calendar, FileText, ScrollText, Settings, HelpCircle, Search, Bell, TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function AdminDashboard() {
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
            Users
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Calendar className="w-4 h-4" />
            Appointments
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <FileText className="w-4 h-4" />
            Reports
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <ScrollText className="w-4 h-4" />
            System Logs
          </Button>
        </nav>

        <div className="mt-auto pt-8 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <HelpCircle className="w-4 h-4" />
            Support
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
              <Input placeholder="Search..." className="border-0 focus-visible:ring-0" />
            </div>

            <div className="flex items-center gap-4">
              <Button size="icon" variant="ghost">
                <Bell className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost">
                <Settings className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-primary"></div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">Dr. Admin</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">System Overview</h1>
            <p className="text-muted-foreground">Welcome back, Admin. Here's a real-time overview of the system.</p>
          </div>

          <Button className="mb-8">
            <FileText className="w-4 h-4 mr-2" />
            Create Report
          </Button>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                  <Users className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1,204</div>
                <p className="text-xs text-success">+5.2% this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Appointments</CardTitle>
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">8,345</div>
                <p className="text-xs text-success">+2.1% this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">System Alerts</CardTitle>
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">12</div>
                <p className="text-xs text-destructive">-1.5% this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Generated Reports</CardTitle>
                  <FileText className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">57</div>
                <p className="text-xs text-success">+10.0% this month</p>
              </CardContent>
            </Card>
          </div>

          {/* Manage Users */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Manage Users</CardTitle>
              <p className="text-sm text-muted-foreground">Approve, suspend, or edit user accounts.</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3">USER</th>
                      <th className="pb-3">ROLE</th>
                      <th className="pb-3">STATUS</th>
                      <th className="pb-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary"></div>
                          <div>
                            <p className="font-medium">Olivia Rhye</p>
                            <p className="text-muted-foreground">olivia@echocare.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">Doctor</td>
                      <td className="py-4">
                        <Badge className="bg-success/10 text-success hover:bg-success/20">Active</Badge>
                      </td>
                      <td className="py-4 text-right">
                        <Button variant="link" size="sm" className="text-primary">Edit</Button>
                        <Button variant="link" size="sm" className="text-destructive">Suspend</Button>
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary"></div>
                          <div>
                            <p className="font-medium">Phoenix Baker</p>
                            <p className="text-muted-foreground">phoenix@echocare.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">Patient</td>
                      <td className="py-4">
                        <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pending Approval</Badge>
                      </td>
                      <td className="py-4 text-right">
                        <Button variant="link" size="sm" className="text-success">Approve</Button>
                        <Button variant="link" size="sm" className="text-primary">Edit</Button>
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary"></div>
                          <div>
                            <p className="font-medium">Lana Steiner</p>
                            <p className="text-muted-foreground">lana@echocare.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">Caregiver</td>
                      <td className="py-4">
                        <Badge variant="destructive">Suspended</Badge>
                      </td>
                      <td className="py-4 text-right">
                        <Button variant="link" size="sm" className="text-primary">Edit</Button>
                        <Button variant="link" size="sm" className="text-success">Reactivate</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">Application Usage Trends</p>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center mb-4">
                  <p className="text-muted-foreground">Chart visualization here</p>
                </div>
              </CardContent>
            </Card>

            {/* System Logs */}
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">User 'olivia@...' logged in.</p>
                    <p className="text-xs text-muted-foreground">2 min ago</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">API endpoint /reports is slow.</p>
                    <p className="text-xs text-muted-foreground">15 min ago</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">Database connection failed.</p>
                    <p className="text-xs text-muted-foreground">1 hour ago</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Clock className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">New user 'phoenix@...' registered.</p>
                    <p className="text-xs text-muted-foreground">3 hours ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
