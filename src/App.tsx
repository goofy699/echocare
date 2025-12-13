// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Unauthorized from "./pages/Unauthorized";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import VerifyOtp from "./pages/VerifyOtp";

import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import NotFound from "./pages/NotFound";

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

            {/* Protected routes (must be logged in) */}
            <Route element={<ProtectedRoute />}>
              {/* Patient only */}
              <Route element={<RoleRoute allow={["patient"]} />}>
                <Route path="/patient" element={<PatientDashboard />} />
              </Route>

              {/* Doctor only */}
              <Route element={<RoleRoute allow={["doctor"]} />}>
                <Route path="/doctor" element={<DoctorDashboard />} />
              </Route>

              {/* Caregiver only */}
              <Route element={<RoleRoute allow={["caregiver"]} />}>
                <Route path="/caregiver" element={<CaregiverDashboard />} />
              </Route>

              {/* Admin only */}
              <Route element={<RoleRoute allow={["admin"]} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
