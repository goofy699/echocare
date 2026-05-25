import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
};

export function usePwaInstall() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const checkInstalled = () => {
            const standalone =
                window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as any).standalone === true;

            setIsInstalled(standalone);
        };

        checkInstalled();

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            const promptEvent = event as BeforeInstallPromptEvent;
            setInstallPrompt(promptEvent);
            setCanInstall(true);
        };

        const handleAppInstalled = () => {
            setInstallPrompt(null);
            setCanInstall(false);
            setIsInstalled(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!installPrompt) {
            return {
                success: false,
                message: "Install prompt is not available yet.",
            };
        }

        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;

        if (choice.outcome === "accepted") {
            setInstallPrompt(null);
            setCanInstall(false);
            setIsInstalled(true);

            return {
                success: true,
                message: "EchoCare installed successfully.",
            };
        }

        return {
            success: false,
            message: "Installation was dismissed.",
        };
    };

    return {
        canInstall,
        isInstalled,
        installApp,
    };
}