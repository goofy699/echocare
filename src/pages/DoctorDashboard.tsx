import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { createChat, listenPatientsForDoctor, listenToMessages, sendMessage, uploadChatAttachment } from "../services/chat";
import { listenAppointmentsByDoctor } from "@/services/appointments";
import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, Calendar, MessageSquare, BarChart3, Settings, Search, Bell, CheckCircle, TrendingUp, Star, Bot, X, Paperclip, FileText, Menu, LogOut } from "lucide-react";
import { format } from "date-fns";
import { AppointmentRecord } from "@/services/appointments";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function DoctorDashboard() {
  useUserNotifications();
  const navigate = useNavigate();
  const doctorId = auth.currentUser?.uid;
  const [doctorName, setDoctorName] = useState(auth.currentUser?.displayName || auth.currentUser?.email || "Doctor");

  const [patients, setPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftStart, setShiftStart] = useState<Date | null>(null);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showMiniChat, setShowMiniChat] = useState(false);
  const [showAiDummy, setShowAiDummy] = useState(false);
  const [miniMessages, setMiniMessages] = useState<any[]>([]);
  const [miniMessage, setMiniMessage] = useState("");
  const [miniSending, setMiniSending] = useState(false);
  const [miniSelectedFile, setMiniSelectedFile] = useState<File | null>(null);
  const miniFileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = (value?: string) => {
    const text = (value || "").trim();
    if (!text) return "P";
    const parts = text.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "P";
  };

  const isReportMessage = (text?: string) =>
    typeof text === "string" && text.trim().startsWith("[REPORT]");

  const goToChat = (patientId?: string) => {
    if (patientId) {
      localStorage.setItem("doctor_selected_patient_id", patientId);
    }
    navigate("/doctor/messages");
  };

  const miniChatPatient = selectedPatient || patients[0] || null;
  const miniChatId = doctorId && miniChatPatient?.id
    ? [miniChatPatient.id, doctorId].sort().join("_")
    : "";

  useEffect(() => {
    if (!doctorId) return;

    const unsubscribe = onSnapshot(doc(db, "users", doctorId), (snap) => {
      const data = snap.data() as any;
      const availability = data?.availability;
      setDoctorName(data?.name || data?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || "Doctor");
      setIsAvailable(availability !== "unavailable");
      if (data?.currentShiftStartedAt?.toDate) {
        setShiftStart(data.currentShiftStartedAt.toDate());
        setShiftActive(true);
      } else {
        setShiftStart(null);
        setShiftActive(false);
      }
    });

    return () => unsubscribe();
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) return;

    const q = query(
      collection(db, "doctorShifts"),
      where("doctorId", "==", doctorId),
      orderBy("startAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setShiftHistory(list);
      const open = list.find((s) => s.status === "open");
      if (open?.startAt?.toDate) {
        setShiftStart(open.startAt.toDate());
        setShiftActive(true);
        setIsAvailable(true);
      } else {
        setShiftStart(null);
        setShiftActive(false);
      }
    });

    return () => unsub();
  }, [doctorId]);

  const toggleAvailability = async (next: boolean) => {
    if (!doctorId) return;

    // Online == on-duty; offline == off-duty
    if (next) {
      if (shiftActive) {
        setIsAvailable(true);
        setAvailabilitySaving(true);
        try {
          await setDoc(
            doc(db, "users", doctorId),
            {
              availability: "available",
              availabilityUpdatedAt: serverTimestamp(),
              shiftStatus: "on-duty",
            },
            { merge: true }
          );
        } catch (error) {
          console.error("Failed to update doctor availability:", error);
        } finally {
          setAvailabilitySaving(false);
        }
      } else {
        await startShift();
      }
    } else {
      if (shiftActive) {
        await endShift();
      } else {
        setIsAvailable(false);
        setAvailabilitySaving(true);
        try {
          await setDoc(
            doc(db, "users", doctorId),
            {
              availability: "unavailable",
              availabilityUpdatedAt: serverTimestamp(),
              shiftStatus: "off-duty",
            },
            { merge: true }
          );
        } catch (error) {
          console.error("Failed to update doctor availability:", error);
        } finally {
          setAvailabilitySaving(false);
        }
      }
    }
  };

  const startShift = async () => {
    if (!doctorId || shiftSaving) return;
    setShiftSaving(true);
    try {
      const now = new Date();
      setShiftActive(true);
      setShiftStart(now);
      setIsAvailable(true);
      await addDoc(collection(db, "doctorShifts"), {
        doctorId,
        status: "open",
        startAt: serverTimestamp(),
        endAt: null,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "users", doctorId),
        {
          availability: "available",
          availabilityUpdatedAt: serverTimestamp(),
          currentShiftStartedAt: serverTimestamp(),
          shiftStatus: "on-duty",
        },
        { merge: true }
      );
    } catch (error) {
      console.error("start shift failed", error);
    } finally {
      setShiftSaving(false);
    }
  };

  const endShift = async () => {
    if (!doctorId || shiftSaving) return;
    setShiftSaving(true);
    try {
      setShiftActive(false);
      setShiftStart(null);
      setIsAvailable(false);
      const q = query(
        collection(db, "doctorShifts"),
        where("doctorId", "==", doctorId),
        where("status", "==", "open"),
        limit(1)
      );
      const snap = await getDocs(q);
      const openShift = snap.docs[0];

      if (openShift) {
        await updateDoc(openShift.ref, {
          status: "closed",
          endAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await setDoc(
        doc(db, "users", doctorId),
        {
          availability: "unavailable",
          availabilityUpdatedAt: serverTimestamp(),
          currentShiftStartedAt: null,
          shiftStatus: "off-duty",
        },
        { merge: true }
      );
    } catch (error) {
      console.error("end shift failed", error);
    } finally {
      setShiftSaving(false);
    }
  };

  // Load real patients
  useEffect(() => {
    if (!doctorId) {
      setPatientsLoading(false);
      return;
    }

    let mounted = true;
    setPatientsLoading(true);

    const unsubscribe = listenPatientsForDoctor(doctorId, (list) => {
      if (!mounted) return;
      const nextPatients = list.filter((u: any) => u.role === "patient");
      setPatients(nextPatients);
      if (nextPatients.length > 0 && !selectedPatient) {
        setSelectedPatient(nextPatients[0]);
      }
      setPatientsLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [doctorId, selectedPatient]);

  useEffect(() => {
    if (!showMiniChat || !doctorId || !miniChatId || !miniChatPatient) return;

    createChat(miniChatId, miniChatPatient.id, doctorId, miniChatPatient.name || miniChatPatient.displayName || miniChatPatient.email || miniChatPatient.id);

    const unsubscribe = listenToMessages(miniChatId, (msgs) => {
      setMiniMessages((msgs || []).filter((m: any) => !isReportMessage(m?.text)));
    });

    return () => unsubscribe();
  }, [doctorId, miniChatId, miniChatPatient, showMiniChat]);

  // Load real appointments
  useEffect(() => {
    if (!doctorId) return;
    const unsubscribe = listenAppointmentsByDoctor(doctorId, (list) => {
      const now = new Date();
      // Only upcoming appointments, sorted by date, max 5
      const upcoming = list
        .filter((a) => a.scheduledAt.getTime() >= now.getTime())
        .slice(0, 5);
      setAppointments(upcoming);
    });
    return () => unsubscribe();
  }, [doctorId]);

  function StatusBadge({ status }: { status: string }) {
    if (status === "confirmed")
      return <Badge className="bg-success/10 text-success hover:bg-success/20">Confirmed</Badge>;
    if (status === "cancelled")
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Cancelled</Badge>;
    return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pending</Badge>;
  }

  const downloadAttachment = async (attachment: any) => {
    const fileName = attachment?.name || "document.pdf";
    try {
      if (attachment?.dataBase64) {
        const link = document.createElement("a");
        link.href = String(attachment.dataBase64);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const url = String(attachment?.url || "");
      if (!url) throw new Error("No attachment URL");

      const response = await fetch(url);
      if (!response.ok) throw new Error(`download failed: ${response.status}`);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("mini attachment download failed:", error);
    }
  };

  const onMiniFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");

    if (!isImage && !isPdf) {
      event.target.value = "";
      return;
    }

    if (miniFileInputRef.current) miniFileInputRef.current.value = "";
    setMiniSelectedFile(file);
  };

  const sendMiniMessage = async () => {
    if ((!miniMessage.trim() && !miniSelectedFile) || !doctorId || !miniChatId || !miniChatPatient) return;

    try {
      setMiniSending(true);
      await createChat(miniChatId, miniChatPatient.id, doctorId, miniChatPatient.name || miniChatPatient.displayName || miniChatPatient.email || miniChatPatient.id);

      let attachment;
      if (miniSelectedFile) {
        attachment = await uploadChatAttachment(miniChatId, doctorId, miniSelectedFile);
      }

      await sendMessage(miniChatId, doctorId, miniMessage, attachment);
      setMiniMessage("");
      setMiniSelectedFile(null);
      if (miniFileInputRef.current) miniFileInputRef.current.value = "";
    } catch (error) {
      console.error("doctor mini chat send failed:", error);
    } finally {
      setMiniSending(false);
    }
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
                <Button variant="secondary" className="w-full justify-start gap-3">
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
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/analytics")}>
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate("/doctor/settings")}>
                  <Settings className="w-4 h-4" />
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
          <h1 className="font-semibold">Dashboard</h1>
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
        <Logo className="mb-8" />
        <nav className="space-y-2">
          <Button variant="secondary" className="sidebar-item w-full justify-start gap-3">
            <LayoutDashboard className="w-4 h-4" />
            <span className="sidebar-label">Dashboard</span>
          </Button>
          <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/patients")}>
            <Users className="w-4 h-4" />
            <span className="sidebar-label">Patients</span>
          </Button>
          <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/appointments")}>
            <Calendar className="w-4 h-4" />
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
          <Button
            variant="ghost"
            className="sidebar-item w-full justify-start gap-3"
            onClick={() => navigate("/doctor/chatbot")}
          >
            <Bot className="w-4 h-4" />
            <span className="sidebar-label">AI Assistant</span>
          </Button>
          <Button variant="ghost" className="sidebar-item w-full justify-start gap-3" onClick={() => navigate("/doctor/settings")}>
            <Settings className="w-4 h-4" />
            <span className="sidebar-label">Settings</span>
          </Button>
        </nav>
        <div className="mt-auto pt-8">
          <Button
            variant="outline"
            className="sidebar-item w-full justify-start gap-3"
            onClick={() => {
              auth.signOut();
              navigate("/auth");
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="sidebar-label">Logout</span>
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input placeholder="Search Patients..." className="border-0 focus-visible:ring-0" />
            </div>
            <div className="flex items-center gap-4">
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg ${isAvailable ? "bg-success/10" : "bg-muted"}`}>
                <div className={`w-2 h-2 rounded-full ${isAvailable ? "bg-success animate-pulse" : "bg-muted-foreground"}`}></div>
                <span className={`text-sm font-medium ${isAvailable ? "text-success" : "text-muted-foreground"}`}>
                  {isAvailable ? "Available" : "Unavailable"}
                </span>
                <CheckCircle className={`w-4 h-4 ${isAvailable ? "text-success" : "text-muted-foreground"}`} />
                <Switch
                  checked={isAvailable}
                  onCheckedChange={toggleAvailability}
                  disabled={availabilitySaving}
                  aria-label="Toggle doctor availability"
                />
              </div>
              <div className="hidden sm:flex flex-col items-end text-right">
                <p className="text-xs text-muted-foreground">Shift</p>
                <div className="flex items-center gap-2">
                  <Badge variant={shiftActive ? "default" : "outline"}>
                    {shiftActive ? "On Duty" : "Off Duty"}
                  </Badge>
                  {shiftStart && <span className="text-xs text-muted-foreground">since {format(shiftStart, "p")}</span>}
                  <Button size="sm" variant={shiftActive ? "outline" : "secondary"} onClick={shiftActive ? endShift : startShift} disabled={shiftSaving}>
                    {shiftActive ? "Clock Out" : "Clock In"}
                  </Button>
                </div>
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Good Morning, {doctorName}</h1>
          </div>

          {/* Recent Patients */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">Recent Patients</h2>
            {patientsLoading ? (
              <p className="text-sm text-muted-foreground">Loading patients...</p>
            ) : patients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients found.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {patients.map((patient) => (
                  <Card key={patient.id} className={`hover:shadow-medium transition-all cursor-pointer ${selectedPatient?.id === patient.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedPatient(patient)}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-primary mb-4"></div>
                        <h3 className="font-semibold text-lg">
                          {patient.name || patient.displayName || "Unknown Patient"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {patient.email || patient.id}
                        </p>
                        <Badge className="mt-2 bg-primary/10 text-primary">Patient</Badge>
                        <Button variant="outline" size="sm" className="mt-4" onClick={(event) => {
                          event.stopPropagation();
                          setSelectedPatient(patient);
                          goToChat(patient.id);
                        }}>
                          Open Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                    <p className="text-2xl font-bold">{patients.length}</p>
                    <p className="text-xs text-muted-foreground">Total Patients</p>
                  </div>
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-accent" />
                      <span className="text-sm text-muted-foreground">Appointments</span>
                    </div>
                    <p className="text-2xl font-bold">{appointments.length}</p>
                    <p className="text-xs text-muted-foreground">Upcoming</p>
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

            {/* Real Upcoming Appointments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/doctor/appointments")}>
                    View all
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                ) : (
                  appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border ${appt.status === "confirmed" ? "bg-success/5 border-success/20" : "border"
                        }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h4 className="font-semibold truncate">{appt.patientName}</h4>
                          <StatusBadge status={appt.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(appt.scheduledAt, "h:mm a")} • {format(appt.scheduledAt, "MMM d")}
                        </p>
                        {appt.location && (
                          <p className="text-xs text-muted-foreground truncate">{appt.location}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Shift History */}
          <Card className="mb-12">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Shift History</CardTitle>
                <Badge variant={shiftActive ? "default" : "outline"}>{shiftActive ? "On Duty" : "Off Duty"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {shiftHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recorded shifts yet.</p>
              ) : (
                shiftHistory.map((shift) => {
                  const startedAt = shift.startAt?.toDate ? shift.startAt.toDate() : null;
                  const endedAt = shift.endAt?.toDate ? shift.endAt.toDate() : null;
                  return (
                    <div key={shift.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{shift.status === "open" ? "In Progress" : "Completed"}</span>
                        <span className="text-xs text-muted-foreground">
                          {startedAt ? `${format(startedAt, "MMM d, p")}` : "Start unknown"}
                          {endedAt ? ` • Ended ${format(endedAt, "p")}` : shift.status === "open" ? " • Ongoing" : ""}
                        </span>
                      </div>
                      <Badge variant={shift.status === "open" ? "outline" : "secondary"}>{shift.status === "open" ? "Open" : "Closed"}</Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

        </div>
      </main>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <Button
          className="w-12 h-12 rounded-full shadow-lg bg-accent"
          onClick={() => {
            setShowAiDummy(false);
            setShowMiniChat((prev) => !prev);
          }}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
        <Button
          variant="outline"
          className="w-12 h-12 rounded-full shadow-lg bg-white"
          onClick={() => navigate("/doctor/chatbot")}
        >
          <Bot className="w-6 h-6" />
        </Button>
      </div>

      {showMiniChat && (
        <div className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-[min(96vw,560px)] z-50">
          <Card className="shadow-large border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Quick Chat</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {miniChatPatient ? `with ${miniChatPatient.name || miniChatPatient.displayName || miniChatPatient.email || "patient"}` : "No patient selected"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowMiniChat(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2 rounded-md border p-2 h-28 sm:h-[300px] overflow-y-auto space-y-2">
                  {patients.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No patients found.</p>
                  ) : (
                    patients.map((patient: any) => {
                      const patientLabel = patient.name || patient.displayName || patient.email || patient.id;
                      return (
                        <Button
                          key={patient.id}
                          variant={miniChatPatient?.id === patient.id ? "secondary" : "ghost"}
                          className="w-full justify-start h-auto py-2"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={patient.photoURL || undefined} alt={patientLabel} />
                            <AvatarFallback>{initials(patientLabel)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-medium truncate">{patientLabel}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{patient.email || "Patient"}</p>
                          </div>
                        </Button>
                      );
                    })
                  )}
                </div>

                <div className="sm:col-span-3 h-[220px] sm:h-[300px] overflow-y-auto space-y-2 rounded-md border p-2 bg-muted/20">
                  {miniMessages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Start a quick conversation with your patient.</p>
                  ) : (
                    miniMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[88%] p-2 rounded-md text-xs ${m.senderId === doctorId ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
                      >
                        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                        {m.attachment && (
                          <div className={m.text ? "mt-2" : ""}>
                            {m.attachment.kind === "image" ? (
                              <a href={m.attachment.url} target="_blank" rel="noreferrer" className="block">
                                <img
                                  src={m.attachment.url}
                                  alt={m.attachment.name || "attachment"}
                                  className="max-h-28 rounded border"
                                />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => downloadAttachment(m.attachment)}
                                className="underline underline-offset-2"
                              >
                                {m.attachment.name || "PDF file"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {miniSelectedFile && (
                <div className="rounded-md border px-2 py-1.5 text-xs flex items-center justify-between gap-2">
                  <span className="truncate">{miniSelectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setMiniSelectedFile(null);
                      if (miniFileInputRef.current) miniFileInputRef.current.value = "";
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={miniFileInputRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  className="hidden"
                  onChange={onMiniFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => miniFileInputRef.current?.click()}
                  disabled={!miniChatPatient || miniSending}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Type message..."
                  value={miniMessage}
                  onChange={(e) => setMiniMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMiniMessage()}
                  disabled={!miniChatPatient || miniSending}
                />
                <Button onClick={sendMiniMessage} disabled={(!miniMessage.trim() && !miniSelectedFile) || !miniChatPatient || miniSending}>
                  Send
                </Button>
              </div>

              <Button variant="ghost" className="w-full" onClick={() => goToChat(miniChatPatient?.id)}>
                Open Full Chat
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showAiDummy && (
        <div className="fixed bottom-24 right-6 w-[min(92vw,340px)] z-50">
          <Card className="shadow-large border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  AI Assistant
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAiDummy(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI chatbot integration is coming soon. This button is active and ready for your future AI service.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
