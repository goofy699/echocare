import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { format } from "date-fns";
import { auth, db } from "@/firebase";
import { AppointmentRecord, listenAppointmentsByPatient } from "@/services/appointments";
import { languageTools } from "@/lib/languagetools";

export default function PatientHome() {
    const user = auth.currentUser;
    const [language, setLanguage] = useState(languageTools.getLanguage());
    const [welcomeName, setWelcomeName] = useState(user?.displayName || user?.email || "Patient");
    const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentRecord[]>([]);
    const [appointmentsLoading, setAppointmentsLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
            const data = snap.data() as any;
            setWelcomeName(
                data?.name || data?.displayName || user.displayName || user.email || "Patient",
            );
        });

        return () => unsubscribe();
    }, [user?.uid, user?.displayName, user?.email]);

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

    const handleLanguageToggle = () => {
        const newLang = languageTools.toggleLanguage();
        setLanguage(newLang);
    };

    return (
        <div>
            {/* Same content as the PatientDashboard main content */}
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">{languageTools.t("welcomeBack", { name: welcomeName })}</h1>
                    <h2 className="text-xl sm:text-2xl font-semibold mb-6">{languageTools.t("todaysHealthOverview")}</h2>

                    <div className="flex flex-wrap gap-3">
                        <button className="gap-2 btn">{languageTools.t("bookAppointment")}</button>
                        <button className="gap-2 btn btn-outline">{languageTools.t("addNote")}</button>
                        <button className="gap-2 btn btn-outline">{languageTools.t("checkReminders")}</button>
                    </div>
                </div>

                {/* MEDICATION STATUS */}
                <div className="grid grid-cols-1 gap-6 mb-8">
                    <div className="card">
                        <div className="card-header flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">{languageTools.t("medicationStatus")}</span>
                            <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                        </div>
                        <div className="card-content">
                            <div className="text-3xl font-bold text-success">{languageTools.t("taken")}</div>
                            <p className="text-sm text-muted-foreground mt-1">{languageTools.t("medicationStatusTaken")}</p>
                        </div>
                    </div>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Weekly Health Trends</span>
                            <p className="text-sm text-muted-foreground">Blood Pressure (Systolic)</p>
                        </div>
                        <div className="card-content">
                            <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Health trend visualization will appear here</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">{languageTools.t("upcomingAppointments")}</span>
                        </div>
                        <div className="card-content space-y-4">
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
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">{languageTools.t("medicationAdherence")}</span>
                            <p className="text-sm text-muted-foreground">{languageTools.t("lastSevenDays")}</p>
                        </div>
                        <div className="card-content">
                            <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Medication adherence visualization will appear here</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
