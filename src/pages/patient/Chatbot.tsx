import { useState, useRef, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { languageTools } from "@/lib/languagetools";
import {
    Send,
    Sparkles,
    Lightbulb,
    Clock,
    Pill,
    User,
    Bot,
    ShieldAlert,
} from "lucide-react";
import { auth, functions } from "@/firebase";
import { toast } from "sonner";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

type GeminiResponse = {
    reply: string;
};

const SUGGESTED_PROMPTS = [
    {
        icon: Clock,
        text: "What should I do before an appointment?",
        color: "text-blue-500",
    },
    {
        icon: Pill,
        text: "How can I remember my medications?",
        color: "text-purple-500",
    },
    {
        icon: Lightbulb,
        text: "Give me daily care tips",
        color: "text-amber-500",
    },
];

const INITIAL_GREETING: Message = {
    id: "greeting",
    role: "assistant",
    content: `Hello! I'm your EchoCare AI health assistant.

I can help with:
• Medication and reminder guidance
• Appointment preparation
• Daily care tips
• SOS and safety guidance
• How to use EchoCare features

I can provide general guidance, but I cannot diagnose illness or replace a doctor.`,
    timestamp: new Date(),
};

export default function PatientChatbot() {
    const user = auth.currentUser;
    const [language, setLanguage] = useState(languageTools.getLanguage());

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
    }, [messages, isTyping]);

    const callGemini = async (text: string) => {
        const callable = httpsCallable(functions, "askGeminiChat");

        const history = messages
            .filter((item) => item.id !== "greeting")
            .slice(-8)
            .map((item) => ({
                role: item.role,
                content: item.content,
            }));

        const result = await callable({
            message: text,
            history,
        });

        return result.data as GeminiResponse;
    };

    const handleSendMessage = async (messageText?: string) => {
        const text = messageText || input.trim();

        if (!text) return;

        if (!user) {
            toast.error("Please sign in first.");
            return;
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        try {
            const data = await callGemini(text);

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: data.reply || "Sorry, I could not generate a response.",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error("Gemini chatbot failed:", error);

            const errorMessage =
                error?.message ||
                "AI assistant is not available right now. Please try again.";

            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-error-${Date.now()}`,
                    role: "assistant",
                    content: errorMessage,
                    timestamp: new Date(),
                },
            ]);

            toast.error("AI chatbot failed.");
        } finally {
            setIsTyping(false);
        }
    };

    const handlePromptClick = (promptText: string) => {
        setInput(promptText);
        inputRef.current?.focus();
    };

    const handleLanguageToggle = () => {
        const newLang = languageTools.toggleLanguage();
        setLanguage(newLang);
    };

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
            <div className="h-full flex flex-col">
                <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>

                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">
                                AI Health Assistant
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Gemini-powered support for EchoCare users
                            </p>
                        </div>
                    </div>
                </div>

                <Card className="flex-1 flex flex-col overflow-hidden bg-card border border-border">
                    <div className="border-b border-border p-3 bg-muted/30 flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                        <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                        <p>
                            This AI gives general guidance only. It does not replace a doctor.
                            For emergencies, contact your caregiver, doctor, or emergency services.
                        </p>
                    </div>

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
                                        <div
                                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                            style={{ animationDelay: "0ms" }}
                                        />
                                        <div
                                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                            style={{ animationDelay: "150ms" }}
                                        />
                                        <div
                                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                            style={{ animationDelay: "300ms" }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

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
                                placeholder="Ask about reminders, appointments, care tips, or EchoCare..."
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
                            AI can make mistakes. Verify important health information with a professional.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}