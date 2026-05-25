import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Unauthorized from "./Unauthorized";
import Landing from "./Landing";
import Auth from "./Auth";
import VerifyOtp from "./VerifyOtp";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import PatientDashboard from "./PatientDashboard";
import PatientHome from "./patient/Home";
import PatientChatbot from "./patient/Chatbot";
import PatientAppointments from "./patient/Appointments";
import PatientReminders from "@/pages/patient/Reminders";
import PatientReports from "@/pages/patient/Reports";
import PatientMessages from "./patient/Messages";
import PatientGames from "@/pages/patient/Games";
import PatientNotes from "@/pages/patient/Notes";
import PatientSettings from "./patient/Settings";
import PatientSettingsProfile from "./patient/SettingsProfile";
import PatientSettingsMedical from "./patient/SettingsMedical";
import PatientSettingsPreferences from "./patient/SettingsPreferences";

import DoctorDashboard from "./DoctorDashboard";
import DoctorMessages from "./doctor/DoctorMessages";
import DoctorAppointments from "./doctor/Appointments";
import DoctorPatients from "./doctor/DoctorPatients";
import DoctorProfile from "./doctor/DoctorProfile";
import DoctorReports from "./doctor/DoctorReports";
import DoctorAnalytics from "@/pages/doctor/DoctorAnalytics";
import DoctorChatbot from "./doctor/Chatbot";
import DoctorSettings from "./doctor/Settings";


import CaregiverDashboard from "@/pages/CaregiverDashboard";
import CaregiverChatbot from "./caregiver/Chatbot";
import CaregiverAppointments from "./caregiver/Appointments";
import CaregiverPatients from "./caregiver/Patients";
import CaregiverMessages from "./caregiver/Messages";
import CaregiverReminders from "./caregiver/Reminders";
import CaregiverSettings from "./caregiver/Settings";
import AdminOverview from "./admin/AdminOverview";
import AdminUsers from "./admin/AdminUsers";
import AdminAppointments from "./admin/AdminAppointments";
import AdminReports from "./admin/AdminReports";
import AdminChats from "./admin/AdminChats";
import AdminSystemLogs from "./admin/AdminSystemLogs";
import CompleteProfile from "./CompleteProfile";

import NotFound from "./NotFound";

import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRoute from "@/components/RoleRoute";

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    // Initialize push notifications on app load
    const initNotifications = async () => {
      try {
        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                {/* Patient only */}
                <Route element={<RoleRoute allow={["patient"]} />}>
                  <Route path="/patient" element={<PatientDashboard />}>
                    <Route index element={<PatientHome />} />
                    <Route path="chatbot" element={<PatientChatbot />} />
                    <Route path="appointments" element={<PatientAppointments />} />
                    <Route path="reminders" element={<PatientReminders />} />
                    <Route path="messages" element={<PatientMessages />} />
                    <Route path="reports" element={<PatientReports />} />
                    <Route path="games" element={<PatientGames />} />
                    <Route path="notes" element={<PatientNotes />} />
                    <Route path="settings" element={<PatientSettings />} />
                    <Route path="settings/profile" element={<PatientSettingsProfile />} />
                    <Route path="settings/medical" element={<PatientSettingsMedical />} />
                    <Route path="settings/preferences" element={<PatientSettingsPreferences />} />
                  </Route>
                </Route>

                {/* Doctor only */}
                <Route element={<RoleRoute allow={["doctor"]} />}>
                  <Route path="/doctor" element={<DoctorDashboard />} />
                  <Route path="/doctor/chatbot" element={<DoctorChatbot />} />
                  <Route path="/doctor/patients" element={<DoctorPatients />} />
                  <Route path="/doctor/messages" element={<DoctorMessages />} />
                  <Route path="/doctor/appointments" element={<DoctorAppointments />} />
                  <Route path="/doctor/reports" element={<DoctorReports />} />
                  <Route path="/doctor/analytics" element={<DoctorAnalytics />} />
                  <Route path="/doctor/settings" element={<DoctorSettings />} />
                  <Route path="/doctor/profile" element={<DoctorProfile />} />
                </Route>

                {/* Caregiver only */}
                <Route element={<RoleRoute allow={["caregiver"]} />}>
                  <Route path="/caregiver" element={<CaregiverDashboard />} />
                  <Route path="/caregiver/chatbot" element={<CaregiverChatbot />} />
                  <Route path="/caregiver/patients" element={<CaregiverPatients />} />
                  <Route path="/caregiver/messages" element={<CaregiverMessages />} />
                  <Route path="/caregiver/appointments" element={<CaregiverAppointments />} />
                  <Route path="/caregiver/reminders" element={<CaregiverReminders />} />
                  <Route path="/caregiver/settings" element={<CaregiverSettings />} />
                </Route>

                {/* Admin only */}
                <Route element={<RoleRoute allow={["admin"]} />}>
                  <Route path="/admin" element={<AdminOverview />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/appointments" element={<AdminAppointments />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/chats" element={<AdminChats />} />
                  <Route path="/admin/logs" element={<AdminSystemLogs />} />
                </Route>

                {/* Complete profile (any authenticated user) */}
                <Route path="/complete-profile" element={<CompleteProfile />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
