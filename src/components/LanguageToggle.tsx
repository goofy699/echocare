// src/components/LanguageToggle.tsx
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LanguageToggle() {
    const { i18n } = useTranslation();

    const isNepali = i18n.language?.startsWith("ne");

    const toggleLanguage = async () => {
        await i18n.changeLanguage(isNepali ? "en" : "ne");
    };

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2 rounded-full"
            title="Change language"
        >
            <Languages className="w-4 h-4" />
            {isNepali ? "English" : "नेपाली"}
        </Button>
    );
}