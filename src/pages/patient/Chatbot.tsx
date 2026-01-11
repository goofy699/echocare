import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Sparkles, Lightbulb, Clock, Pill, User, Bot } from "lucide-react";
import { auth } from "@/firebase";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const SUGGESTED_PROMPTS = [
    { icon: Clock, text: "What are my appointments today?", color: "text-blue-500" },
    { icon: Pill, text: "Remind me about my medications", color: "text-purple-500" },
    { icon: Lightbulb, text: "Tips for managing daily tasks", color: "text-amber-500" },
];

const INITIAL_GREETING: Message = {
    id: "greeting",
    role: "assistant",
    content: `Hello! I'm your AI health assistant, here to help you with your daily needs. I can help you with:

• Medication reminders and schedules
• Appointment information
• Daily task assistance
• Health-related questions
• Emergency contacts

How can I assist you today?`,
    timestamp: new Date(),
};

export default function PatientChatbot() {
    const user = auth.currentUser;
    const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        // Simulate AI response (replace with actual API call)
        setTimeout(() => {
            const aiResponse = generateAIResponse(text);
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: aiResponse,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsTyping(false);
        }, 1000 + Math.random() * 1000);
    };

    const generateAIResponse = (userInput: string): string => {
        const input = userInput.toLowerCase();

        // Simple response logic (replace with actual AI integration)
        if (input.includes("medication") || input.includes("medicine") || input.includes("pill")) {
            return "Your medications for today are:\n\n• Morning: Aricept 10mg - Take with breakfast\n• Afternoon: Namenda 10mg - Take with lunch\n• Evening: Vitamin B12 - Take with dinner\n\nRemember to take them with food and water. Would you like me to set up reminders?";
        } else if (input.includes("appointment") || input.includes("doctor")) {
            return "You have an upcoming appointment:\n\n📅 Dr. Evelyn Reed\n🕐 Tomorrow at 10:30 AM\n📍 City Hospital - Room 402\n\nWould you like me to add a reminder or provide directions?";
        } else if (input.includes("emergency") || input.includes("help") || input.includes("urgent")) {
            return "For emergencies, please:\n\n🚨 Call 911 for immediate help\n📞 Contact your caregiver: (555) 123-4567\n👨‍⚕️ Reach your doctor: Dr. Reed (555) 987-6543\n\nStay calm and safe. I'm here to help coordinate assistance.";
        } else if (input.includes("task") || input.includes("todo") || input.includes("daily")) {
            return "Here are your tasks for today:\n\n✓ Take morning medication (Completed)\n• Attend physical therapy at 2 PM\n• Call family member (Sarah)\n• Prepare dinner ingredients\n• Evening walk (weather permitting)\n\nWould you like me to explain any of these in more detail?";
        } else if (input.includes("hello") || input.includes("hi") || input.includes("hey")) {
            return `Hello ${user?.displayName || "there"}! I'm here to help you throughout the day. Feel free to ask me about your medications, appointments, or any health-related questions. How can I assist you?`;
        } else if (input.includes("thank") || input.includes("thanks")) {
            return "You're very welcome! I'm always here to help. Don't hesitate to ask if you need anything else. Have a wonderful day! 😊";
        } else {
            return "I understand you're asking about that. As your AI health assistant, I can help you with:\n\n• Medication schedules and reminders\n• Appointment information\n• Daily task management\n• Health tips and advice\n• Emergency contacts\n\nCould you please tell me more about what you'd like to know?";
        }
    };

    const handlePromptClick = (promptText: string) => {
        setInput(promptText);
        inputRef.current?.focus();
    };

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
            <div className="h-full flex flex-col">
                {/* HEADER */}
                <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">AI Health Assistant</h1>
                            <p className="text-sm text-muted-foreground">
                                Your personal health companion
                            </p>
                        </div>
                    </div>
                </div>

                {/* MAIN CHAT AREA */}
                <Card className="flex-1 flex flex-col overflow-hidden bg-card border border-border">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {messages.length === 1 && (
                            <div className="mb-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handlePromptClick(prompt.text)}
                                            className="p-4 border border-border rounded-lg hover:border-primary hover:bg-secondary/50 transition-all text-left group"
                                        >
                                            <prompt.icon className={`w-5 h-5 mb-2 ${prompt.color}`} />
                                            <p className="text-sm font-medium group-hover:text-primary">
                                                {prompt.text}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                {message.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                )}

                                <div
                                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${message.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-secondary text-secondary-foreground"
                                        }`}
                                >
                                    <p className="text-sm sm:text-base whitespace-pre-line">
                                        {message.content}
                                    </p>
                                    <p
                                        className={`text-xs mt-2 ${message.role === "user"
                                                ? "text-primary-foreground/70"
                                                : "text-muted-foreground"
                                            }`}
                                    >
                                        {message.timestamp.toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>

                                {message.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-secondary rounded-2xl px-4 py-3">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-border p-4 bg-background">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            className="flex gap-2"
                        >
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything about your health, medications, or appointments..."
                                className="flex-1 text-base"
                                disabled={isTyping}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isTyping}
                                className="flex-shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            AI Assistant can make mistakes. Please verify important information.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
