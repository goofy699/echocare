import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";

import { auth } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { ReminderRecord, listenRemindersByPatient } from "@/services/reminders";

const CHECK_INTERVAL_MS = 15000;

function toLabel(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function useReminderNotifications() {
    const [reminders, setReminders] = useState<ReminderRecord[]>([]);
    const [dueSoonCount, setDueSoonCount] = useState(0);
    const notifiedIdsRef = useRef<Set<string>>(new Set());
    const lastCheckRef = useRef<number>(Date.now());

    const userId = auth.currentUser?.uid;

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

        notifiedIdsRef.current = new Set();
        lastCheckRef.current = Date.now();

        const unsubscribe = listenRemindersByPatient(userId, setReminders);
        ensurePermission();
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const previous = lastCheckRef.current;
            lastCheckRef.current = now;

            const preWindowMs = 5 * 60 * 1000; // five minutes
            const soonThreshold = now + preWindowMs;

            const pendingReminders = reminders.filter((r) => r.status === "pending");
            const soon = pendingReminders.filter((r) => r.dueAt.getTime() <= soonThreshold && r.dueAt.getTime() >= now - preWindowMs);
            setDueSoonCount(soon.length);

            pendingReminders.forEach((item) => {
                const dueAt = item.dueAt.getTime();

                const keyDue = `${item.id}-due`;
                const keySoon = `${item.id}-soon`;

                const crossedSoon = dueAt - preWindowMs <= now && dueAt - preWindowMs > previous;
                if (crossedSoon && !notifiedIdsRef.current.has(keySoon)) {
                    notifiedIdsRef.current.add(keySoon);
                    toast({
                        title: `Reminder in 5 min: ${item.title}`,
                        description: `${toLabel(item.type)} • ${format(item.dueAt, "PPP p")}`,
                    });
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                        new Notification(`Upcoming: ${item.title}`, {
                            body: `${toLabel(item.type)} starts in 5 minutes.`,
                        });
                    }
                }

                const crossedDue = dueAt <= now && dueAt > previous;
                if (crossedDue && !notifiedIdsRef.current.has(keyDue)) {
                    notifiedIdsRef.current.add(keyDue);
                    toast({
                        title: `Reminder: ${item.title}`,
                        description: `${toLabel(item.type)} • ${format(item.dueAt, "PPP p")}`,
                    });
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                        new Notification(item.title, {
                            body: `${toLabel(item.type)} reminder is due now.`,
                        });
                    }
                }
            });
        }, CHECK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [reminders, userId]);

    return { dueSoonCount };
}
