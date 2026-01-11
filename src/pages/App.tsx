import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Unauthorized from "./Unauthorized";
import Landing from "./Landing";
import Auth from "./Auth";
import VerifyOtp from "./VerifyOtp";

import PatientDashboard from "./PatientDashboard";
import PatientHome from "./patient/Home";
import PatientChatbot from "./patient/Chatbot";
import PatientAppointments from "./patient/Appointments";
import PatientReminders from "./patient/Reminders";
import PatientReports from "./patient/Reports";
import PatientMessages from "./patient/Messages";

import DoctorDashboard from "./DoctorDashboard";
import DoctorMessages from "./doctor/DoctorMessages";

import CaregiverDashboard from "./CaregiverDashboard";
import AdminDashboard from "./AdminDashboard";
import CompleteProfile from "./CompleteProfile";

import NotFound from "./NotFound";

import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRoute from "@/components/RoleRoute";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
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
                </Route>
              </Route>

              {/* Doctor only */}
              <Route element={<RoleRoute allow={["doctor"]} />}>
                <Route path="/doctor" element={<DoctorDashboard />} />
                <Route path="/doctor/messages" element={<DoctorMessages />} />
              </Route>

              {/* Caregiver only */}
              <Route element={<RoleRoute allow={["caregiver"]} />}>
                <Route path="/caregiver" element={<CaregiverDashboard />} />
              </Route>

              {/* Admin only */}
              <Route element={<RoleRoute allow={["admin"]} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* Complete profile (any authenticated user) */}
              <Route path="/complete-profile" element={<CompleteProfile />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
