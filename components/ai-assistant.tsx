"use client";

import { useState } from "react";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

const quickActions = [
    { label: "Explain Question", prompt: "Explain this question in simple terms" },
    { label: "Fix My Code", prompt: "Find and fix errors in my code" },
    { label: "Optimize Solution", prompt: "Suggest an optimized solution" },
    { label: "Explain Error", prompt: "Explain what this error means and how to fix it" },
];

// Mock AI responses for demo
const mockResponses: Record<string, string> = {
    default:
        "I'd be happy to help! Could you provide more details about what you're working on? Share your code or algorithm and I'll analyze it for you.",
    explain:
        "This problem asks you to implement a solution that processes the given input according to the specified format. Break it down into steps:\n\n1. **Parse the input** according to the given format\n2. **Apply the algorithm** as described\n3. **Format the output** to match requirements\n\nStart with the algorithm first, then translate to code.",
    fix: "Here are potential issues I found:\n\n1. **Edge case handling** — Check for empty input or boundary values\n2. **Off-by-one errors** — Verify loop bounds\n3. **Variable initialization** — Ensure all variables have correct initial values\n\nTry adding input validation at the start of your function.",
    optimize:
        "Consider these optimizations:\n\n1. **Use a hash map** for O(1) lookups instead of nested loops\n2. **Sort the data first** if you need repeated searches\n3. **Memoize** repeated computations\n\nThis could improve your time complexity from O(n²) to O(n log n) or O(n).",
    error:
        "This error typically occurs when:\n\n1. You're accessing an index that's out of bounds\n2. A variable is undefined or null when you try to use it\n3. There's a type mismatch\n\nCheck the line number in the error trace and verify the data is what you expect.",
};

function getResponse(input: string): string {
    const lower = input.toLowerCase();
    if (lower.includes("explain") && lower.includes("question"))
        return mockResponses.explain;
    if (lower.includes("fix") || lower.includes("error") || lower.includes("bug"))
        return mockResponses.fix;
    if (lower.includes("optimize") || lower.includes("improve") || lower.includes("better"))
        return mockResponses.optimize;
    if (lower.includes("error") || lower.includes("wrong"))
        return mockResponses.error;
    return mockResponses.default;
}

export function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const sendMessage = async (content: string) => {
        if (!content.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: content.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        // Simulate AI response delay
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

        const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: getResponse(content),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
    };

    return (
        <>
            {/* Floating trigger button */}
            <Button
                onClick={() => setIsOpen(true)}
                size="lg"
                className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
                <Bot className="h-6 w-6" />
                <span className="sr-only">Open AI Assistant</span>
            </Button>

            {/* Sheet panel */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
                    <SheetHeader className="border-b px-6 py-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <SheetTitle className="text-base">AI Assistant</SheetTitle>
                                <SheetDescription className="text-xs">
                                    Get help with algorithms, code, and debugging
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Messages */}
                    <ScrollArea className="flex-1 px-6 py-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center gap-4 py-12 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                                    <Bot className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">How can I help you?</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Ask me about algorithms, code corrections, or optimizations
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 w-full mt-2">
                                    {quickActions.map((action) => (
                                        <Button
                                            key={action.label}
                                            variant="outline"
                                            size="sm"
                                            className="h-auto py-2 text-xs text-left"
                                            onClick={() => sendMessage(action.prompt)}
                                        >
                                            {action.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted"
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Thinking...
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Input */}
                    <div className="border-t p-4">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                sendMessage(input);
                            }}
                            className="flex gap-2"
                        >
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about your code or algorithm..."
                                className="min-h-[40px] max-h-[120px] resize-none text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(input);
                                    }
                                }}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                className="shrink-0"
                                disabled={!input.trim() || isTyping}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
