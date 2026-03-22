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
    const notifiedIdsRef = useRef<Set<string>>(new Set());
    const lastCheckRef = useRef<number>(Date.now());

    const userId = auth.currentUser?.uid;

    useEffect(() => {
        if (!userId) return;

        notifiedIdsRef.current = new Set();
        lastCheckRef.current = Date.now();

        const unsubscribe = listenRemindersByPatient(userId, setReminders);
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const previous = lastCheckRef.current;
            lastCheckRef.current = now;

            reminders.forEach((item) => {
                if (item.status !== "pending") return;
                const dueAt = item.dueAt.getTime();
                if (dueAt <= previous || dueAt > now) return;
                if (notifiedIdsRef.current.has(item.id)) return;

                notifiedIdsRef.current.add(item.id);

                toast({
                    title: `Reminder: ${item.title}`,
                    description: `${toLabel(item.type)} • ${format(item.dueAt, "PPP p")}`,
                });

                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                    new Notification(item.title, {
                        body: `${toLabel(item.type)} reminder is due now.`,
                    });
                }
            });
        }, CHECK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [reminders, userId]);
}
