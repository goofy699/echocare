// src/i18n.ts
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

const resources = {
    en: {
        translation: {
            appName: "EchoCare",

            nav: {
                home: "Home",
                dashboard: "Dashboard",
                patients: "Patients",
                messages: "Messages",
                chatbot: "Chatbot",
                appointments: "Appointments",
                schedule: "Schedule",
                reminders: "Reminders",
                reports: "Reports",
                notes: "Notes",
                games: "Games",
                settings: "Settings",
                sos: "SOS",
                feedback: "Feedback",
                logout: "Logout",
                aiAssistant: "AI Assistant",
            },

            common: {
                welcomeBack: "Welcome Back",
                loading: "Loading...",
                save: "Save",
                cancel: "Cancel",
                delete: "Delete",
                edit: "Edit",
                add: "Add",
                close: "Close",
                search: "Search",
                available: "Available",
                unavailable: "Unavailable",
                pending: "Pending",
                completed: "Completed",
                missed: "Missed",
                taken: "Taken",
                noData: "No data available.",
                language: "Language",
                english: "English",
                nepali: "नेपाली",
            },

            patient: {
                subtitle: "Real patient tracking, reminders, appointments, and messages.",
                healthOverview: "Today's Health Overview",
                accountProfile: "Your account profile",
                bookAppointment: "Book Appointment",
                addNote: "Add Note",
                checkReminders: "Check Reminders",
                medicationStatus: "Medication Status",
                doctors: "Doctors",
                doctorDetails: "Doctor Details",
                upcomingAppointments: "Upcoming Appointments",
                medicationAdherence: "Medication Adherence",
                last7Days: "Last 7 days",
                noUpcomingAppointments: "No upcoming appointments.",
                noDoctors: "No doctors available.",
                selectDoctor: "Select a doctor to view details.",
                chatWithDoctor: "Chat with Doctor",
            },

            caregiver: {
                subtitle: "Real patient tracking, reminders, appointments, and messages.",
                trackedPatients: "Tracked Patients",
                pendingReminders: "Pending Reminders",
                missedReminders: "Missed Reminders",
                upcomingAppointments: "Upcoming Appointments",
                shiftHistory: "Shift History",
                noRecordedShifts: "No recorded shifts yet.",
                medicationReminders: "Medication Reminders",
                recentMessages: "Recent Messages",
            },

            doctor: {
                subtitle: "Manage patient consultations, schedules, and care updates.",
                patients: "Patients",
                appointments: "Appointments",
                reports: "Reports",
                recentActivity: "Recent Activity",
                patientOverview: "Patient Overview",
            },

            auth: {
                welcome: "Welcome to EchoCare",
                signin: "Sign In",
                signupPatient: "Patient Sign Up",
                email: "Email Address",
                password: "Password",
                fullName: "Full Name",
                forgotPassword: "Forgot Password?",
                createPatientAccount: "Create Patient Account",
                doctorCaregiverAdminNote: "Doctor, caregiver, and admin accounts are created by the administrator.",
            },

            chatbot: {
                title: "AI Health Assistant",
                subtitle: "Gemini-powered support for EchoCare users",
                disclaimer: "This AI gives general guidance only. It does not replace a doctor.",
                placeholder: "Ask about reminders, appointments, care tips",
            },

            settings: {
                title: "Settings",
                profile: "Profile",
                preferences: "Preferences",
                medical: "Medical",
                changeLanguage: "Change Language",
            },
        },
    },

    ne: {
        translation: {
            appName: "इकोकेयर",

            nav: {
                home: "गृहपृष्ठ",
                dashboard: "ड्यासबोर्ड",
                patients: "बिरामीहरू",
                messages: "सन्देशहरू",
                chatbot: "च्याटबोट",
                appointments: "अपोइन्टमेन्ट",
                schedule: "तालिका",
                reminders: "रिमाइन्डर",
                reports: "रिपोर्टहरू",
                notes: "नोटहरू",
                games: "खेलहरू",
                settings: "सेटिङ्स",
                sos: "SOS",
                feedback: "प्रतिक्रिया",
                logout: "लगआउट",
                aiAssistant: "AI सहायक",
            },

            common: {
                welcomeBack: "फेरि स्वागत छ",
                loading: "लोड हुँदैछ...",
                save: "सेभ गर्नुहोस्",
                cancel: "रद्द गर्नुहोस्",
                delete: "हटाउनुहोस्",
                edit: "सम्पादन गर्नुहोस्",
                add: "थप्नुहोस्",
                close: "बन्द गर्नुहोस्",
                search: "खोज्नुहोस्",
                available: "उपलब्ध",
                unavailable: "उपलब्ध छैन",
                pending: "बाँकी",
                completed: "पूरा भयो",
                missed: "छुट्यो",
                taken: "लिइयो",
                noData: "डाटा उपलब्ध छैन।",
                language: "भाषा",
                english: "English",
                nepali: "नेपाली",
            },

            patient: {
                subtitle: "बिरामी ट्र्याकिङ, रिमाइन्डर, अपोइन्टमेन्ट र सन्देशहरू।",
                healthOverview: "आजको स्वास्थ्य अवलोकन",
                accountProfile: "तपाईंको खाता प्रोफाइल",
                bookAppointment: "अपोइन्टमेन्ट बुक गर्नुहोस्",
                addNote: "नोट थप्नुहोस्",
                checkReminders: "रिमाइन्डर हेर्नुहोस्",
                medicationStatus: "औषधि स्थिति",
                doctors: "डाक्टरहरू",
                doctorDetails: "डाक्टर विवरण",
                upcomingAppointments: "आउँदै गरेका अपोइन्टमेन्टहरू",
                medicationAdherence: "औषधि पालन",
                last7Days: "पछिल्ला ७ दिन",
                noUpcomingAppointments: "कुनै आउँदै गरेको अपोइन्टमेन्ट छैन।",
                noDoctors: "कुनै डाक्टर उपलब्ध छैन।",
                selectDoctor: "विवरण हेर्न डाक्टर छान्नुहोस्।",
                chatWithDoctor: "डाक्टरसँग च्याट गर्नुहोस्",
            },

            caregiver: {
                subtitle: "बिरामी ट्र्याकिङ, रिमाइन्डर, अपोइन्टमेन्ट र सन्देशहरू।",
                trackedPatients: "ट्र्याक गरिएका बिरामीहरू",
                pendingReminders: "बाँकी रिमाइन्डरहरू",
                missedReminders: "छुटेका रिमाइन्डरहरू",
                upcomingAppointments: "आउँदै गरेका अपोइन्टमेन्टहरू",
                shiftHistory: "सिफ्ट इतिहास",
                noRecordedShifts: "कुनै सिफ्ट रेकर्ड छैन।",
                medicationReminders: "औषधि रिमाइन्डरहरू",
                recentMessages: "हालका सन्देशहरू",
            },

            doctor: {
                subtitle: "बिरामी परामर्श, तालिका र केयर अपडेट व्यवस्थापन गर्नुहोस्।",
                patients: "बिरामीहरू",
                appointments: "अपोइन्टमेन्टहरू",
                reports: "रिपोर्टहरू",
                recentActivity: "हालको गतिविधि",
                patientOverview: "बिरामी अवलोकन",
            },

            auth: {
                welcome: "इकोकेयरमा स्वागत छ",
                signin: "साइन इन",
                signupPatient: "बिरामी साइन अप",
                email: "इमेल ठेगाना",
                password: "पासवर्ड",
                fullName: "पूरा नाम",
                forgotPassword: "पासवर्ड बिर्सनुभयो?",
                createPatientAccount: "बिरामी खाता बनाउनुहोस्",
                doctorCaregiverAdminNote: "डाक्टर, केयरगिभर र एडमिन खाता एडमिनले बनाउँछन्।",
            },

            chatbot: {
                title: "AI स्वास्थ्य सहायक",
                subtitle: "इकोकेयर प्रयोगकर्ताका लागि Gemini-संचालित सहायता",
                disclaimer: "यो AI ले सामान्य सुझाव मात्र दिन्छ। यसले डाक्टरलाई प्रतिस्थापन गर्दैन।",
                placeholder: "रिमाइन्डर, अपोइन्टमेन्ट, केयर टिप्स सोध्नुहोस्",
            },

            settings: {
                title: "सेटिङ्स",
                profile: "प्रोफाइल",
                preferences: "प्राथमिकता",
                medical: "स्वास्थ्य",
                changeLanguage: "भाषा परिवर्तन गर्नुहोस्",
            },
        },
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        supportedLngs: ["en", "ne"],
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
        },
    });

export default i18n;