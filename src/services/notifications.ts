import {
    collection,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";

export async function requestNotificationPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
        console.warn("This browser does not support notifications");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        try {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return false;
        }
    }

    return false;
}

export function sendPushNotification(
    title: string,
    options?: {
        body?: string;
        icon?: string;
        badge?: string;
        tag?: string;
        onClick?: () => void;
    }
) {
    if (!("Notification" in window)) {
        console.warn("This browser does not support notifications");
        return;
    }

    if (Notification.permission !== "granted") {
        console.warn("Notification permission not granted");
        return;
    }

    try {
        const notification = new Notification(title, {
            body: options?.body || "",
            icon: options?.icon || "/logo.png",
            badge: options?.badge || "/logo.png",
            tag: options?.tag || "notification",
            requireInteraction: true,
        });

        if (options?.onClick) {
            notification.onclick = () => {
                options.onClick?.();
                notification.close();
                window.focus();
            };
        }

        setTimeout(() => {
            notification.close();
        }, 10000);

        return notification;
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

function getNotificationTargetUrl(data: any) {
    if (data.type === "sos") {
        if (data.recipientRole === "caregiver") return "/caregiver/messages";
        if (data.recipientRole === "doctor") return "/doctor/messages";
        return "/";
    }

    if (data.type === "reminder") {
        if (data.recipientRole === "caregiver") return "/caregiver/reminders";
        if (data.recipientRole === "patient") return "/patient/reminders";
        return "/";
    }

    if (data.type === "appointment") {
        if (data.recipientRole === "doctor") return "/doctor/appointments";
        if (data.recipientRole === "caregiver") return "/caregiver/appointments";
        if (data.recipientRole === "patient") return "/patient/appointments";
        return "/";
    }

    return "/";
}

export function listenForUserNotifications(
    userId: string,
    callback?: (notification: any) => void
) {
    try {
        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", userId),
            where("read", "==", false)
        );

        return onSnapshot(
            q,
            async (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    if (change.type !== "added") continue;

                    const data = change.doc.data();

                    if (Notification.permission === "granted") {
                        sendPushNotification(data.title || "EchoCare Notification", {
                            body: data.body || "",
                            icon: data.type === "sos" ? "/alert-icon.png" : "/logo.png",
                            badge: data.type === "sos" ? "/alert-icon.png" : "/logo.png",
                            tag: `${data.type || "notification"}-${change.doc.id}`,
                            onClick: () => {
                                window.focus();
                                window.location.href = getNotificationTargetUrl(data);
                            },
                        });
                    }

                    callback?.({
                        id: change.doc.id,
                        ...data,
                    });

                    try {
                        await updateDoc(doc(db, "notifications", change.doc.id), {
                            read: true,
                        });
                    } catch (error) {
                        console.error("Error marking notification as read:", error);
                    }
                }
            },
            (error) => {
                console.error("listenForUserNotifications error:", error);
            }
        );
    } catch (error) {
        console.error("Error setting up notification listener:", error);
        return () => { };
    }
}

export function listenForCaregiverNotifications(
    caregiverId: string,
    callback: (notification: any) => void
) {
    return listenForUserNotifications(caregiverId, callback);
}