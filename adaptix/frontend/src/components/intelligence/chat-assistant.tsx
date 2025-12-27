"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: any[]; // For structured data (tables/lists) if needed later
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your Business Intelligence Assistant. Ask me about sales, inventory, or staff attendance.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/intelligence/assistant/chat/", {
        message: userMessage.content,
      });

      const reply = res.data.reply || "I didn't understand that.";
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        data: res.data.data,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting to the brain database right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-violet-600 hover:bg-violet-700 text-white z-50 animate-in zoom-in duration-300"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-10 duration-200 border-violet-200 dark:border-violet-900">
          <CardHeader className="p-4 border-b bg-violet-50 dark:bg-violet-950/30 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <Bot className="h-5 w-5" />
              Adaptix Assistant
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full items-start gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900 border border-violet-200 flex items-center justify-center shrink-0">
                        <Bot className="h-3 w-3 text-violet-600" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm max-w-[80%]",
                        msg.role === "user"
                          ? "bg-violet-600 text-white"
                          : "bg-white dark:bg-slate-800 border shadow-sm text-slate-700 dark:text-slate-200"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {/* Render simple data table if present - Quick hack for demo */}
                      {msg.data &&
                        Array.isArray(msg.data) &&
                        msg.data.length > 0 && (
                          <div className="mt-2 text-xs border-t pt-2 opacity-80">
                            {msg.data.length} records found.
                          </div>
                        )}
                    </div>

                    {msg.role === "user" && (
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex w-full items-start gap-2 justify-start">
                    <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <Bot className="h-3 w-3 text-violet-600" />
                    </div>
                    <div className="bg-white border text-sm rounded-lg px-3 py-2">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 bg-background border-t">
            <div className="flex w-full items-center gap-2">
              <Input
                placeholder="Ask e.g. 'Top selling products'..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                autoFocus
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={loading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
