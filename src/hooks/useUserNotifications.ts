import { useEffect } from "react";
import { auth } from "@/firebase";
import {
    listenForUserNotifications,
    requestNotificationPermission,
} from "@/services/notifications";

export function useUserNotifications() {
    const userId = auth.currentUser?.uid;

    useEffect(() => {
        if (!userId) return;

        let unsubscribe: (() => void) | undefined;

        const start = async () => {
            await requestNotificationPermission();

            unsubscribe = listenForUserNotifications(userId, (notification) => {
                console.log("Received EchoCare notification:", notification);
            });
        };

        start();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [userId]);
}