import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Bot,
  X,
  Paperclip,
} from "lucide-react";
import { createChat, listenDoctors, listenToMessages, sendMessage, uploadChatAttachment } from "@/services/chat";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";

export default function PatientDashboard() {
  useReminderNotifications();

  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [showMiniChat, setShowMiniChat] = useState(false);
  const [showAiDummy, setShowAiDummy] = useState(false);
  const [miniMessages, setMiniMessages] = useState<any[]>([]);
  const [miniMessage, setMiniMessage] = useState("");
  const [miniSending, setMiniSending] = useState(false);
  const [miniSelectedFile, setMiniSelectedFile] = useState<File | null>(null);
  const miniFileInputRef = useRef<HTMLInputElement | null>(null);

  const isReportMessage = (text?: string) =>
    typeof text === "string" && text.trim().startsWith("[REPORT]");

  useEffect(() => {
    const unsubscribe = listenDoctors((list) => {
      const normalized = list.map((d: any) => ({
        id: d.id,
        name: d.name || d.displayName || d.email || "Doctor",
        specialization: d.specialization || "General Medicine",
        phone: d.phone || "",
        qualification: d.qualification || "",
        hospital: d.hospital || "",
        bio: d.bio || "",
        availability: d.availability || "available",
      }));

      setDoctors(normalized);
      if (normalized.length > 0 && !selectedDoctor) {
        setSelectedDoctor(normalized[0]);
      }
    });

    return () => unsubscribe && unsubscribe();
  }, [selectedDoctor]);

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

  const miniChatDoctor = selectedDoctor || doctors[0] || null;
  const miniChatId = user?.uid && miniChatDoctor?.id
    ? [user.uid, miniChatDoctor.id].sort().join("_")
    : "";

  useEffect(() => {
    if (!showMiniChat || !miniChatId || !user || !miniChatDoctor) return;

    createChat(
      miniChatId,
      user.uid,
      miniChatDoctor.id,
      user.displayName || user.email || user.uid
    );

    const unsubscribe = listenToMessages(miniChatId, (msgs) => {
      setMiniMessages((msgs || []).filter((m: any) => !isReportMessage(m?.text)));
    });
    return () => unsubscribe();
  }, [showMiniChat, miniChatId, miniChatDoctor, user]);

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

    miniFileInputRef.current && (miniFileInputRef.current.value = "");
    setMiniSelectedFile(file);
  };

  const sendMiniMessage = async () => {
    if ((!miniMessage.trim() && !miniSelectedFile) || !user || !miniChatId) return;
    try {
      setMiniSending(true);
      let attachment;
      if (miniSelectedFile) {
        attachment = await uploadChatAttachment(miniChatId, user.uid, miniSelectedFile);
      }

      await sendMessage(miniChatId, user.uid, miniMessage, attachment);
      setMiniMessage("");
      setMiniSelectedFile(null);
      if (miniFileInputRef.current) miniFileInputRef.current.value = "";
    } catch (error) {
      console.error("mini chat send failed:", error);
    } finally {
      setMiniSending(false);
    }
  };

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
            <span className="font-semibold text-sm">Dashboard</span>
          </div>
          <Button size="icon" variant="ghost">
            <Bell className="w-5 h-5" />
          </Button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 pb-24">
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
                    <Button className="gap-2" onClick={() => goToBooking(selectedDoctor?.id)}>
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle>Doctors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                      {doctors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No doctors available.</p>
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
                              {doctor.availability === "available" ? "Available" : "Unavailable"}
                            </span>
                          </Button>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Doctor Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!selectedDoctor ? (
                        <p className="text-sm text-muted-foreground">Select a doctor to view details.</p>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold">{selectedDoctor.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <p><span className="font-medium">Phone:</span> {selectedDoctor.phone || "Not added"}</p>
                            <p><span className="font-medium">Qualification:</span> {selectedDoctor.qualification || "Not added"}</p>
                            <p className="sm:col-span-2"><span className="font-medium">Hospital:</span> {selectedDoctor.hospital || "Not added"}</p>
                          </div>

                          {selectedDoctor.bio ? (
                            <p className="text-sm text-muted-foreground">{selectedDoctor.bio}</p>
                          ) : null}

                          <div className="flex flex-wrap gap-3 pt-1">
                            <Button className="gap-2" onClick={() => goToBooking(selectedDoctor.id)}>
                              <Calendar className="w-4 h-4" />
                              Book Appointment
                            </Button>
                            <Button variant="outline" className="gap-2" onClick={() => goToChat(selectedDoctor.id)}>
                              <MessagesSquare className="w-4 h-4" />
                              Chat with Doctor
                            </Button>
                          </div>
                        </div>
                      )}
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
          onClick={() => {
            setShowMiniChat(false);
            setShowAiDummy((prev) => !prev);
          }}
        >
          <Bot className="w-6 h-6" />
        </Button>
      </div>

      {showMiniChat && (
        <div className="fixed bottom-24 right-6 w-[min(92vw,360px)] z-50">
          <Card className="shadow-large border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Quick Chat</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {miniChatDoctor ? `with ${miniChatDoctor.name}` : "No doctor selected"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowMiniChat(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-52 overflow-y-auto space-y-2 rounded-md border p-2 bg-muted/20">
                {miniMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Start a quick conversation with your doctor.</p>
                ) : (
                  miniMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[82%] p-2 rounded-md text-xs ${m.senderId === user?.uid ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
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
                  disabled={!miniChatDoctor || miniSending}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Type message..."
                  value={miniMessage}
                  onChange={(e) => setMiniMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMiniMessage()}
                  disabled={!miniChatDoctor || miniSending}
                />
                <Button onClick={sendMiniMessage} disabled={(!miniMessage.trim() && !miniSelectedFile) || !miniChatDoctor || miniSending}>
                  Send
                </Button>
              </div>

              <Button variant="ghost" className="w-full" onClick={() => goToChat(miniChatDoctor?.id)}>
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
