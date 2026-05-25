import { useMemo } from "react";
import { auth } from "@/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, SlidersHorizontal, Stethoscope, UserCircle2 } from "lucide-react";
import { languageTools } from "@/lib/languagetools";

export default function PatientSettings() {
    const navigate = useNavigate();
    const user = auth.currentUser;

    const sections = useMemo(
        () => [
            {
                key: "profile",
                title: "Profile Settings",
                description: "Change name, phone number, and profile picture.",
                icon: UserCircle2,
                path: "/patient/settings/profile",
                cta: "Open Profile",
            },
            {
                key: "medical",
                title: "Medical Settings",
                description: "Edit blood group, medications, allergies, and emergency contact.",
                icon: Stethoscope,
                path: "/patient/settings/medical",
                cta: "Open Medical",
            },
            {
                key: "preferences",
                title: "Preferences",
                description: "Manage dark/light mode, notifications, and privacy options.",
                icon: SlidersHorizontal,
                path: "/patient/settings/preferences",
                cta: "Open Preferences",
            },
        ],
        []
    );

    const handleLanguageToggle = () => {
        const newLang = languageTools.toggleLanguage();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Patient Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Choose a settings area to manage one thing at a time.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Settings Center</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div className="rounded-md border p-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="font-medium">Signed in as</p>
                                <p className="text-xs text-muted-foreground">{user?.email || "Unknown email"}</p>
                            </div>
                            <Badge variant="outline">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Patient Account
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {sections.map((section) => {
                                const Icon = section.icon;
                                return (
                                    <Card key={section.key} className="border-dashed">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Icon className="w-4 h-4" />
                                                {section.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <p className="text-sm text-muted-foreground">{section.description}</p>
                                            <Button className="w-full" variant="outline" onClick={() => navigate(section.path)}>
                                                {section.cta}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
