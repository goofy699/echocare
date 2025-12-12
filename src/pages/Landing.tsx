import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { MessageSquare, Bell, Activity, ArrowRight, Facebook, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import doctorHero from "@/assets/doctor-hero.jpg";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                AI-Powered Preventive Healthcare for{" "}
                <span className="text-primary">Everyone.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Discover a smarter way to manage your health with personalized insights, timely reminders, and real-time monitoring.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="text-base">
                    Get Started
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-base">
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20"></div>
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
                  <Activity className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Real-Time Monitoring</CardTitle>
                <CardDescription>
                  Securely track vital signs and share health data with your care team from anywhere.
                </CardDescription>
              </CardHeader>
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
                    <p className="font-semibold text-lg">John Doe</p>
                    <p className="text-sm text-muted-foreground">Patient</p>
                  </div>
                </div>
                <p className="text-lg italic text-muted-foreground mb-4">
                  "EchoCare has revolutionized how I manage my chronic condition. The real-time monitoring gives me and my doctor peace of mind."
                </p>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="rounded-full">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
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
