import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { listenAppointmentsByPatient, listenAppointmentsForCaregiver, AppointmentRecord } from "@/services/appointments";

const CHECK_INTERVAL_MS = 15000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Role = "patient" | "caregiver";

export function useAppointmentNotifications(params: { role: Role; userId?: string }) {
    const { role, userId } = params;
    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [upcomingCount, setUpcomingCount] = useState(0);
    const notifiedRef = useRef<Set<string>>(new Set());
    const lastCheckRef = useRef<number>(Date.now());

    const ensurePermission = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return;
        if (Notification.permission === "granted") return;
        try {
            await Notification.requestPermission();
        } catch (err) {
            console.warn("notification permission request failed", err);
        }
    };

    useEffect(() => {
        if (!userId) return;
        notifiedRef.current = new Set();
        lastCheckRef.current = Date.now();
        ensurePermission();

        if (role === "patient") {
            return listenAppointmentsByPatient(userId, setAppointments);
        }
        return listenAppointmentsForCaregiver(userId, setAppointments);
    }, [role, userId]);

    useEffect(() => {
        if (!userId) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const previous = lastCheckRef.current;
            lastCheckRef.current = now;

            const soonWindow = now + DAY_MS; // next 24h
            const upcoming = appointments.filter((a) => a.scheduledAt.getTime() <= soonWindow && a.scheduledAt.getTime() >= now - 5 * 60 * 1000);
            setUpcomingCount(upcoming.length);

            appointments.forEach((appt) => {
                const startMs = appt.scheduledAt.getTime();
                const keyDayBefore = `${appt.id}-24h`;
                const keyNow = `${appt.id}-now`;

                const crossedDayBefore = startMs - DAY_MS <= now && startMs - DAY_MS > previous;
                if (crossedDayBefore && !notifiedRef.current.has(keyDayBefore)) {
                    notifiedRef.current.add(keyDayBefore);
                    toast({
                        title: `Tomorrow: ${appt.doctorName || "Appointment"}`,
                        description: `${format(appt.scheduledAt, "PPP p")} • ${appt.location || "Clinic"}`,
                    });
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                        new Notification("Appointment tomorrow", {
                            body: `${appt.doctorName || "Appointment"} at ${format(appt.scheduledAt, "p")}`,
                        });
                    }
                }

                const crossedStart = startMs <= now && startMs > previous;
                if (crossedStart && !notifiedRef.current.has(keyNow)) {
                    notifiedRef.current.add(keyNow);
                    toast({
                        title: `Appointment now: ${appt.doctorName || "Appointment"}`,
                        description: `${format(appt.scheduledAt, "PPP p")} • ${appt.location || "Clinic"}`,
                    });
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                        new Notification("Appointment now", {
                            body: `${appt.doctorName || "Appointment"} is starting now.`,
                        });
                    }
                }
            });
        }, CHECK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [appointments, userId]);

    return { upcomingCount };
}
