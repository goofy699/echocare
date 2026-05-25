import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/firebase";
import { languageTools } from "@/lib/languagetools";
import { doc, onSnapshot } from "firebase/firestore";
import { format, isSameDay, startOfDay, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import {
  Home,
  MessageSquare,
  Calendar,
  Bell,
  FileText,
  NotebookPen,
  LifeBuoy,
  ThumbsUp,
  Pill,
  Menu,
  MessagesSquare,
  Brain,
  Settings,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { createChat, sendMessage } from "@/services/chat";
import { createPatientNote } from "@/services/notes";
import { listenRemindersByPatient, ReminderRecord } from "@/services/reminders";
import { AppointmentRecord, listenAppointmentsByPatient } from "@/services/appointments";
import { createSosAlert } from "@/services/sos";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";
import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function PatientDashboard() {
  useUserNotifications();
  const { dueSoonCount } = useReminderNotifications();
  const { upcomingCount: appointmentNotifCount } = useAppointmentNotifications({ role: "patient", userId: auth.currentUser?.uid || undefined });

  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const [language, setLanguage] = useState(languageTools.getLanguage());
  const [welcomeName, setWelcomeName] = useState(user?.displayName || user?.email || "Patient");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.photoURL || "");
  const [patientProfile, setPatientProfile] = useState<any | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const graceMs = 5 * 60 * 1000; // five-minute grace window
  const notificationBadgeCount = (dueSoonCount || 0) + (appointmentNotifCount || 0);
  const [quickNoteTitle, setQuickNoteTitle] = useState("");
  const [quickNoteContent, setQuickNoteContent] = useState("");
  const [savingQuickNote, setSavingQuickNote] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);

  const initials = (value?: string) => {
    const text = (value || "").trim();
    if (!text) return "D";
    const parts = text.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "D";
  };

  const caregiverId = patientProfile?.assignedCaregiverId || patientProfile?.caregiverId || null;

  const sendSos = async () => {
    if (!user?.uid) {
      toast.error("Please sign in first.");
      return;
    }
    if (!caregiverId) {
      toast.error("No caregiver assigned. Contact admin to link a caregiver.");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Location is not supported in this browser.");
      return;
    }

    setSendingSos(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
          const patientName = welcomeName;

          await createSosAlert({
            patientId: user.uid,
            patientName,
            caregiverId,
            lat,
            lng,
            source: "dashboard",
          });

          const chatId = [user.uid, caregiverId].sort().join("_");
          await createChat(chatId, user.uid, caregiverId, patientName);
          await sendMessage(chatId, user.uid, `SOS: ${patientName} needs help. Location: ${mapsLink}`);

          toast.success("SOS sent to your caregiver.");
        } catch (error) {
          console.error("sos send failed", error);
          toast.error("Could not send SOS. Please try again.");
        } finally {
          setSendingSos(false);
        }
      },
      (err) => {
        console.error("geolocation error", err);
        toast.error("Location access denied. Enable location and try again.");
        setSendingSos(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const isReportMessage = (text?: string) =>
    typeof text === "string" && text.trim().startsWith("[REPORT]");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data() as any;
      setWelcomeName(data?.name || data?.displayName || user.displayName || user.email || "Patient");
      setProfilePhotoUrl(data?.photoURL || data?.photoUrl || user.photoURL || "");
      setPatientProfile(data || null);
    });

    return () => unsubscribe();
  }, [user?.uid, user?.displayName, user?.email]);

  useEffect(() => {
    if (!patientProfile) {
      setDoctors([]);
      setSelectedDoctor(null);
      return;
    }

    const assignedDoctorIds = [
      patientProfile.assignedDoctorId,
      patientProfile.doctorId,
      ...(Array.isArray(patientProfile.assignedDoctors) ? patientProfile.assignedDoctors : []),
    ].filter(Boolean);

    if (assignedDoctorIds.length === 0) {
      setDoctors([]);
      setSelectedDoctor(null);
      return;
    }

    const unsubscribers = assignedDoctorIds.map((doctorId: string) =>
      onSnapshot(doc(db, "users", doctorId), (snap) => {
        setDoctors((prev) => {
          const withoutCurrent = prev.filter((doctor) => doctor.id !== doctorId);

          if (!snap.exists()) {
            return withoutCurrent;
          }

          const data = snap.data() as any;

          if (data.role !== "doctor") {
            return withoutCurrent;
          }

          const doctor = {
            id: snap.id,
            name: data.name || data.displayName || data.email || "Doctor",
            specialization: data.specialization || "General Medicine",
            phone: data.phone || "",
            email: data.email || "",
            photoURL: data.photoURL || data.photoUrl || "",
            qualification: data.qualification || "",
            hospital: data.hospital || "",
            bio: data.bio || "",
            availability: data.availability || "available",
          };

          const nextDoctors = [...withoutCurrent, doctor];

          setSelectedDoctor((current: any) => {
            if (current && nextDoctors.some((item) => item.id === current.id)) {
              return current;
            }

            return nextDoctors[0] || null;
          });

          return nextDoctors;
        });
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [patientProfile]);

  useEffect(() => {
    if (!user?.uid) return;
    const un = listenRemindersByPatient(user.uid, setReminders);
    return () => un();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setAppointmentsLoading(false);
      return;
    }

    const unsubscribe = listenAppointmentsByPatient(user.uid, (list) => {
      const now = new Date();
      const upcoming = list
        .filter((item) => item.scheduledAt.getTime() >= now.getTime())
        .slice(0, 3);
      setUpcomingAppointments(upcoming);
      setAppointmentsLoading(false);
    });

    return () => unsubscribe?.();
  }, [user?.uid]);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const latestMedicationStatus = useMemo(() => {
    const medicationReminders = reminders
      .filter((item) => item.type === "medication")
      .sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime());

    const latest = medicationReminders[0];

    if (!latest) {
      return {
        label: languageTools.t("noMedication"),
        description: languageTools.t("noMedicationReminder"),
        textClass: "text-muted-foreground",
        iconClass: "text-muted-foreground",
      };
    }

    const now = nowTick;
    const dueTime = latest.dueAt.getTime();
    const isMissed = latest.status === "pending" && now - dueTime > graceMs;

    if (latest.status === "completed") {
      return {
        label: languageTools.t("medicationStatusTaken"),
        description: `${latest.title} completed at ${latest.completedAt ? format(latest.completedAt, "p") : "scheduled time"}.`,
        textClass: "text-green-500",
        iconClass: "text-green-500",
      };
    }

    if (isMissed) {
      return {
        label: languageTools.t("medicationStatusMissed"),
        description: `${latest.title} was due at ${format(latest.dueAt, "PPP p")}.`,
        textClass: "text-red-500",
        iconClass: "text-red-500",
      };
    }

    if (latest.status === "canceled") {
      return {
        label: languageTools.t("medicationStatusCanceled"),
        description: `${latest.title} was canceled.`,
        textClass: "text-slate-500",
        iconClass: "text-slate-500",
      };
    }

    return {
      label: languageTools.t("medicationStatusPending"),
      description: `${latest.title} is due at ${format(latest.dueAt, "PPP p")}.`,
      textClass: "text-amber-500",
      iconClass: "text-amber-500",
    };
  }, [reminders, nowTick, graceMs]);

  const medicationAdherence = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const dayDate = subDays(today, 6 - idx);
      const meds = reminders.filter(
        (r) => r.type === "medication" && isSameDay(startOfDay(r.dueAt), dayDate),
      );

      if (meds.length === 0) {
        return { label: format(dayDate, "EEE"), status: "none" as const, items: [] as ReminderRecord[] };
      }

      const now = new Date();
      const pastDueWithoutGrace = meds.filter(
        (r) => r.status === "pending" && now.getTime() - r.dueAt.getTime() > graceMs,
      );
      const completed = meds.filter((r) => r.status === "completed");
      const status = (() => {
        if (completed.length === meds.length) return "taken" as const;
        if (completed.length > 0 && pastDueWithoutGrace.length === 0) return "partial" as const;
        if (completed.length > 0 && pastDueWithoutGrace.length > 0) return "partial" as const;
        if (pastDueWithoutGrace.length === meds.length) return "missed" as const;
        return "partial" as const;
      })();

      return { label: format(dayDate, "EEE"), status, items: meds };
    });

    return days;
  }, [graceMs, reminders]);

  const goToBooking = (doctorId?: string) => {
    if (doctorId) {
      localStorage.setItem("patient_selected_doctor_id", doctorId);
    }
    navigate("/patient/appointments");
  };

  const goToChat = (doctorId?: string) => {
    if (doctorId) {
      localStorage.setItem("patient_selected_doctor_id", doctorId);
    }
    navigate("/patient/messages");
  };

  const handleSaveQuickNote = async () => {
    if (!user?.uid) return;
    if (!quickNoteContent.trim()) {
      toast.error("Please write your note first.");
      return;
    }

    try {
      setSavingQuickNote(true);
      await createPatientNote({
        patientId: user.uid,
        title: quickNoteTitle,
        content: quickNoteContent,
      });
      setQuickNoteTitle("");
      setQuickNoteContent("");
      setShowQuickNote(false);
      toast.success("Note saved.");
    } catch (error) {
      console.error("quick note save failed:", error);
      toast.error("Could not save note.");
    } finally {
      setSavingQuickNote(false);
    }
  };

  const handleLanguageToggle = () => {
    const newLang = languageTools.toggleLanguage();
    setLanguage(newLang);
  };

  const Nav = () => (
    <nav className="space-y-2">
      <Button
        variant="secondary"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient")}
      >
        <Home className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("home")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient/messages")}
      >
        <MessagesSquare className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("messages")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient/chatbot")}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("chatbot")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient/appointments")}
      >
        <Calendar className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("appointments")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient/reminders")}
      >
        <Bell className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("reminders")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient/reports")}
      >
        <FileText className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("reports")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient/notes")}
      >
        <NotebookPen className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("notes")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient/games")}
      >
        <Brain className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("games")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3"
        onClick={() => navigate("/patient/settings")}
      >
        <Settings className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("settings")}</span>
      </Button>

      <Button
        variant="ghost"
        className="sidebar-item w-full justify-start gap-3 text-destructive"
        onClick={sendSos}
        disabled={sendingSos}
      >
        <LifeBuoy className="w-4 h-4" />
        <span className="sidebar-label">{sendingSos ? languageTools.t("sending") : languageTools.t("sos")}</span>
      </Button>

      <Button variant="ghost" className="sidebar-item w-full justify-start gap-3">
        <ThumbsUp className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("feedback")}</span>
      </Button>

      <Button
        variant="outline"
        className="sidebar-item w-full justify-start gap-3"
        onClick={async () => {
          sessionStorage.removeItem("echocare_logged_in");
          await auth.signOut();
          navigate("/auth", { replace: true });
        }}
      >
        <LogOut className="w-4 h-4" />
        <span className="sidebar-label">{languageTools.t("logout")}</span>
      </Button>

      {/* Language Switcher */}
      <div className="flex gap-2 pt-2 border-t mt-2">
        <Button
          variant={language === "en" ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs"
          onClick={handleLanguageToggle}
        >
          EN
        </Button>
        <Button
          variant={language === "ne" ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs"
          onClick={handleLanguageToggle}
        >
          NE
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block overflow-y-auto">
        <Logo className="mb-8" />
        <Nav />
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* MOBILE HEADER */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-card lg:hidden shrink-0">
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
            <span className="font-semibold text-sm">{languageTools.t("dashboard")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={language === "en" ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={handleLanguageToggle}
            >
              EN
            </Button>
            <Button
              variant={language === "ne" ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={handleLanguageToggle}
            >
              NE
            </Button>
            <Button size="icon" variant="ghost" className="relative">
              <Bell className="w-5 h-5" />
              {notificationBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-destructive text-[11px] text-destructive-foreground flex items-center justify-center px-1 leading-none">
                  {notificationBadgeCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:p-6 pb-12">
          <div className="max-w-7xl mx-auto">
            {location.pathname === "/patient" ? (
              <>
                <div className="mb-8">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle2 className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{languageTools.t("yourAccountProfile")}</p>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    {languageTools.t("welcomeBack", { name: welcomeName })}
                  </h1>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-6">
                    {languageTools.t("todaysHealthOverview")}
                  </h2>

                  <div className="flex flex-wrap gap-3">
                    <Button className="gap-2" onClick={() => goToBooking(selectedDoctor?.id)}>
                      <Calendar className="w-4 h-4" />
                      {languageTools.t("bookAppointment")}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setShowQuickNote((prev) => !prev)}>
                      <FileText className="w-4 h-4" />
                      {languageTools.t("addNote")}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setShowReminderPopup((prev) => !prev)}>
                      <Bell className="w-4 h-4" />
                      {languageTools.t("checkReminders")}
                    </Button>
                  </div>

                  {showReminderPopup && (
                    <Card className="mt-4">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            {languageTools.t("reminderNotifications")}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => navigate("/patient/reminders")}>
                            {languageTools.t("addReminder")}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {reminders.filter((r) => r.status === "pending").length === 0 ? (
                          <p className="text-sm text-muted-foreground">{languageTools.t("noPendingReminders")}</p>
                        ) : (
                          reminders
                            .filter((r) => r.status === "pending")
                            .slice(0, 6)
                            .map((item) => (
                              <div key={item.id} className="rounded-md border p-3">
                                <p className="font-medium text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{item.description || languageTools.t("noDescription")}</p>
                                <p className="text-xs mt-1">Due: {item.dueAt.toLocaleString()}</p>
                              </div>
                            ))
                        )}
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setShowReminderPopup(false)}>
                            {languageTools.t("close")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {showQuickNote && (
                    <Card className="mt-4">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{languageTools.t("quickNote")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input
                          value={quickNoteTitle}
                          onChange={(e) => setQuickNoteTitle(e.target.value)}
                          placeholder={languageTools.t("titleOptional")}
                        />
                        <Textarea
                          value={quickNoteContent}
                          onChange={(e) => setQuickNoteContent(e.target.value)}
                          placeholder={languageTools.t("writeYourNote")}
                          className="min-h-24"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveQuickNote} disabled={savingQuickNote || !quickNoteContent.trim()}>
                            {savingQuickNote ? languageTools.t("saving") : languageTools.t("saveNote")}
                          </Button>
                          <Button variant="outline" onClick={() => setShowQuickNote(false)}>{languageTools.t("cancel")}</Button>
                          <Button variant="ghost" onClick={() => navigate("/patient/notes")}>{languageTools.t("openFullNotes")}</Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 mb-8">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {languageTools.t("medicationStatus")}
                        </CardTitle>
                        <Pill className={`w-4 h-4 ${latestMedicationStatus.iconClass}`} />
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className={`text-3xl font-bold ${latestMedicationStatus.textClass}`}>
                        {latestMedicationStatus.label}
                      </div>

                      <p className="text-sm text-muted-foreground mt-1">
                        {latestMedicationStatus.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle>{languageTools.t("doctors")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                      {doctors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{languageTools.t("noDoctorsAvailable")}</p>
                      ) : (
                        doctors.map((doctor) => (
                          <Button
                            key={doctor.id}
                            variant={selectedDoctor?.id === doctor.id ? "secondary" : "ghost"}
                            className="w-full justify-start h-auto py-3"
                            onClick={() => setSelectedDoctor(doctor)}
                          >
                            <div className="min-w-0 text-left">
                              <p className="font-medium truncate">{doctor.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
                            </div>
                            <span className={`ml-auto text-xs ${doctor.availability === "available" ? "text-green-600" : "text-slate-500"}`}>
                              {doctor.availability === "available" ? languageTools.t("available") : languageTools.t("unavailable")}
                            </span>
                          </Button>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>{languageTools.t("doctorDetails")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!selectedDoctor ? (
                        <p className="text-sm text-muted-foreground">{languageTools.t("selectDoctorToViewDetails")}</p>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold">{selectedDoctor.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <p><span className="font-medium">{languageTools.t("phone")}</span> {selectedDoctor.phone || languageTools.t("notAdded")}</p>
                            <p><span className="font-medium">{languageTools.t("qualification")}</span> {selectedDoctor.qualification || languageTools.t("notAdded")}</p>
                            <p className="sm:col-span-2"><span className="font-medium">{languageTools.t("hospital")}</span> {selectedDoctor.hospital || languageTools.t("notAdded")}</p>
                          </div>

                          {selectedDoctor.bio ? (
                            <p className="text-sm text-muted-foreground">{selectedDoctor.bio}</p>
                          ) : null}

                          <div className="flex flex-wrap gap-3 pt-1">
                            <Button className="gap-2" onClick={() => goToBooking(selectedDoctor.id)}>
                              <Calendar className="w-4 h-4" />
                              {languageTools.t("bookAppointment")}
                            </Button>
                            <Button variant="outline" className="gap-2" onClick={() => goToChat(selectedDoctor.id)}>
                              <MessagesSquare className="w-4 h-4" />
                              {languageTools.t("chatWithDoctor")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{languageTools.t("upcomingAppointments")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {appointmentsLoading ? (
                        <p className="text-sm text-muted-foreground">{languageTools.t("loadingAppointments")}</p>
                      ) : upcomingAppointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{languageTools.t("noUpcomingAppointments")}</p>
                      ) : (
                        upcomingAppointments.map((appt) => (
                          <div key={appt.id} className="p-4 border rounded-lg">
                            <h4 className="font-semibold">{appt.doctorName || languageTools.t("doctor")}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(appt.scheduledAt, "MMM d, h:mm a")}
                              {appt.location ? ` - ${appt.location}` : ""}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{languageTools.t("medicationAdherence")}</CardTitle>
                      <p className="text-sm text-muted-foreground">{languageTools.t("lastSevenDays")}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                        {medicationAdherence.map((day) => {
                          const color =
                            day.status === "taken"
                              ? "bg-green-500/10 text-green-700 border-green-500/30"
                              : day.status === "missed"
                                ? "bg-red-500/10 text-red-700 border-red-500/30"
                                : day.status === "partial"
                                  ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                                  : "bg-muted text-muted-foreground border-muted";
                          const labelKey = day.status === "taken" ? "taken" : day.status === "missed" ? "missed" : day.status === "partial" ? "partial" : "noMeds";
                          return (
                            <div key={day.label} className={`rounded-lg border p-3 space-y-1 ${color}`}>
                              <p className="text-xs font-semibold">{day.label}</p>
                              <p className="text-xs">{languageTools.t(labelKey)}</p>
                              {day.items.slice(0, 2).map((med) => (
                                <p key={med.id} className="text-[11px] truncate font-medium text-foreground">
                                  {med.title}
                                </p>
                              ))}
                              {day.items.length > 2 && (
                                <p className="text-[11px] text-muted-foreground">+{day.items.length - 2} more</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-500"></span> {languageTools.t("takenBadge")}</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span> {languageTools.t("partialBadge")}</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-red-500"></span> {languageTools.t("missedBadge")}</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-muted"></span> {languageTools.t("noMedsBadge")}</span>
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
    </div>
  );
}
