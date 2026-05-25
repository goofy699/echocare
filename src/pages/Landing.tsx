import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Logo } from "@/components/Logo";
import { MessageSquare, Bell, Stethoscope, HeartPulse, CheckCircle2, Facebook, Twitter, Linkedin, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import doctorHero from "@/assets/doctor-hero.jpg";

export default function Landing() {
  const [showIntro, setShowIntro] = useState(true);
  const { canInstall, isInstalled, installApp } = usePwaInstall();

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  if (showIntro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-cyan-50 to-white">
        <div className="relative flex flex-col items-center gap-6 px-6 py-10 text-center">
          <div className="absolute inset-0 blur-3xl opacity-40 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_45%),radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.12),transparent_35%)]" />
          <div className="relative">
            <div className="mx-auto w-28 h-28 rounded-3xl bg-white shadow-2xl shadow-emerald-200/50 border border-primary/10 flex items-center justify-center">
              <Logo iconClassName="w-20 h-20" hideText />
            </div>
          </div>
          <div className="relative space-y-2">
            <p className="text-lg font-semibold text-foreground">Welcome to EchoCare</p>
            <p className="text-sm text-muted-foreground">Loading your care experience…</p>
          </div>
          <Loader2 className="relative w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50/80 via-cyan-50/60 to-background">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-700 shadow-sm">
                <HeartPulse className="w-4 h-4" />
                Care that stays with you daily
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Health Management Built for
                <span className="text-primary"> Real Life</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                EchoCare helps patients and doctors stay connected with smart reminders,
                secure messaging, and clear health updates from one trusted dashboard.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="text-base">
                    Get Started
                  </Button>
                  {!isInstalled && canInstall && (
                    <Button
                      variant="outline"
                      onClick={installApp}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Install App
                    </Button>
                  )}
                </Link>
                <a href="#about">
                  <Button size="lg" variant="outline" className="text-base">
                    Learn More
                  </Button>
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-3xl blur-3xl opacity-25 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.35),transparent_65%)]"></div>
              <img
                src={doctorHero}
                alt="Healthcare Professional"
                className="relative rounded-3xl shadow-large w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Discover a Smarter Way to Manage Health
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to keep you, your family, and your care team connected.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-medium">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>AI Chatbot</CardTitle>
                <CardDescription>
                  Get instant answers to your health questions with our 24/7 AI-powered health assistant.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-medium">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-success" />
                </div>
                <CardTitle>Smart Reminders</CardTitle>
                <CardDescription>
                  Stay on track with personalized medication schedules and appointment notifications.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-medium">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Stethoscope className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Care Team Updates</CardTitle>
                <CardDescription>
                  Keep doctors and patients aligned with clear status updates and shared treatment notes.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">About EchoCare</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                We built EchoCare to remove friction from everyday healthcare.
                Patients get clear guidance and faster support, while doctors get
                cleaner communication and better continuity of care.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                  <p className="text-sm text-muted-foreground">Role-based dashboards for patients, doctors, and caregivers.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                  <p className="text-sm text-muted-foreground">Simple appointment booking and secure file sharing in chat.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                  <p className="text-sm text-muted-foreground">Designed for preventive care, continuity, and daily follow-through.</p>
                </div>
              </div>
            </div>
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Why teams choose EchoCare</CardTitle>
                <CardDescription>Built to feel practical from day one.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>Patients can quickly connect to their doctor and track appointments without jumping across tools.</p>
                <p>Doctors can update availability, manage profiles, and communicate from one workspace.</p>
                <p>Admins and caregivers get visibility that supports safer care decisions.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted by Patients and Professionals
            </h2>
            <p className="text-muted-foreground">
              Hear what our users are saying about EchoCare.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-2">
              <CardContent className="pt-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-primary"></div>
                  <div>
                    <p className="font-semibold text-lg">Samyam Karki</p>
                    <p className="text-sm text-muted-foreground">Patient</p>
                  </div>
                </div>
                <p className="text-lg italic text-muted-foreground mb-4">
                  "EchoCare made my appointments and follow-ups way easier. I can message my doctor and keep everything organized in one place."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 border-t">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">EchoCare</h3>
              <p className="text-sm text-muted-foreground">
                Our mission is to empower individuals with the tools and insights they need to live healthier lives through proactive and preventive care.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>contact@echocare.com</li>
                <li>(555) 123-4567</li>
                <li>123 Health St, Wellness City</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 EchoCare. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Button size="icon" variant="ghost" className="rounded-full">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full">
                <Linkedin className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
