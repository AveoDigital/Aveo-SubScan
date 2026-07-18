import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Trash2, ShieldCheck, CornerDownRight, MessageSquare, HelpCircle, ArrowRight } from "lucide-react";
import { Subscription } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface AIPilotChatProps {
  subscriptions: Subscription[];
  onLog?: (msg: string) => void;
}

const QUICK_PROMPTS = [
  { label: "🔍 Find duplicate services", prompt: "Do I have any duplicate or overlapping subscriptions in my list?" },
  { label: "💡 Smart budget advice", prompt: "Give me some smart tips to optimize my subscription spend." },
  { label: "📝 Draft cancellation letter", prompt: "Draft a polite cancellation email for Netflix Family because the price increased too much." },
  { label: "📈 Summarize my yearly burn", prompt: "Calculate and summarize my true yearly financial burn based on my subscriptions." }
];

export default function AIPilotChat({ subscriptions, onLog }: AIPilotChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I am your **Aveo SubScan Copilot**. 🤖\n\nI have scanned your active subscription ledger. I can help you locate duplicates, draft cancellation letters, negotiate rates, or organize your software licenses. Ask me anything!"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const newUserMessage: Message = { role: "user", text: textToSend };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setLoading(true);
    setError(null);
    if (onLog) onLog(`Sending request to Aveo AI Copilot: "${textToSend.substring(0, 30)}..."`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          subscriptions: subscriptions
        })
      });

      if (!response.ok) {
        throw new Error(`API failed with status ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
      if (onLog) onLog("Received smart analysis from Aveo AI Copilot.");
    } catch (err: any) {
      console.error("Chat failure:", err);
      setError(err.message || "Failed to communicate with AI.");
      if (onLog) onLog(`Copilot error: ${err.message || "Connection failure"}`);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        text: "Ledger chat reset! I am ready. How can I help optimize your software overhead today?"
      }
    ]);
    setError(null);
  };

  return (
    <div className="bg-white text-slate-900 border-4 border-[#FECC00] rounded-none shadow-xl overflow-hidden font-sans">
      
      {/* Header section with brand contrast colors */}
      <div className="bg-[#006AA7] text-white px-5 py-4 flex justify-between items-center border-b-4 border-[#FECC00]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#FECC00] text-[#006AA7] rounded-none">
            <Sparkles className="w-5 h-5 animate-pulse fill-[#006AA7]" />
          </div>
          <div>
            <h3 className="font-sans font-black text-sm uppercase tracking-wider text-white flex items-center gap-1.5">
              AVEO AI CO-PILOT
              <span className="text-[9px] font-mono bg-emerald-500 text-slate-950 px-1.5 py-0.5 font-bold uppercase tracking-widest rounded-none">
                PREMIUM
              </span>
            </h3>
            <p className="text-[10px] font-mono text-yellow-300 uppercase tracking-widest mt-0.5">
              Better tomorrow than yesterday
            </p>
          </div>
        </div>

        <button
          id="btn-clear-chat"
          onClick={clearChat}
          title="Reset Conversation"
          className="hover:bg-white/10 text-white p-2 transition font-mono text-xs uppercase font-bold flex items-center gap-1 rounded-none border border-white/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <div className="p-5 flex flex-col lg:flex-row gap-6">
        
        {/* Left column: Quick prompts & contextual status widget */}
        <div className="lg:w-1/3 flex flex-col gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4">
            <h4 className="text-xs font-black text-[#006AA7] uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Quick Analytics Actions
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
              Click any premium quick command to let our intelligent optimization algorithms dissect your stack instantly.
            </p>
            
            <div className="space-y-2">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  id={`quick-prompt-${idx}`}
                  key={idx}
                  disabled={loading}
                  onClick={() => handleSend(qp.prompt)}
                  className="w-full text-left text-xs bg-white hover:bg-[#006AA7] hover:text-white border border-slate-200 hover:border-[#006AA7] p-2.5 transition flex items-center justify-between group rounded-none font-sans font-semibold text-slate-800 disabled:opacity-50"
                >
                  <span className="truncate">{qp.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/60 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[#006AA7] font-black text-xs uppercase tracking-wide font-mono">
                <ShieldCheck className="w-4 h-4 text-[#006AA7]" />
                GDPR &amp; Privacy Safeguard
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mt-1.5">
                Aveo Digital operates entirely under local sandbox and secure server-side proxies. None of your real subscription credentials or inbox tokens are permanently stored or shared with external third-party advertising companies.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Interactive multi-turn chat panel */}
        <div className="flex-grow flex flex-col border border-slate-200 bg-slate-50 min-h-[400px]">
          
          {/* Messages scroll feed */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[380px] space-y-4">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[85%] ${
                    isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-none flex items-center justify-center shrink-0 border text-xs font-bold ${
                      isAssistant
                        ? "bg-[#006AA7] text-white border-[#006AA7]"
                        : "bg-[#FECC00] text-[#006AA7] border-[#FECC00]"
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1">
                      {isAssistant ? "Aveo Advisor" : "User Client"}
                    </span>
                    <div
                      className={`text-xs p-3 leading-relaxed rounded-none border whitespace-pre-wrap ${
                        isAssistant
                          ? "bg-white text-slate-800 border-slate-200 shadow-sm"
                          : "bg-[#006AA7] text-white border-[#006AA7] font-semibold"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                <div className="w-7 h-7 rounded-none bg-[#006AA7] text-white border border-[#006AA7] flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-white border border-slate-200 p-3 flex items-center gap-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#006AA7] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#006AA7] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#006AA7] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[10px] font-mono font-bold text-[#006AA7] uppercase tracking-wider ml-1">
                    Aveo AI is thinking...
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 text-xs flex items-center justify-between rounded-none">
                <span className="font-medium font-mono">{error}</span>
                <button
                  id="btn-retry-chat"
                  onClick={() => handleSend(messages[messages.length - 1].text)}
                  className="bg-red-200 hover:bg-red-300 px-2.5 py-1 text-[10px] font-black uppercase text-red-900 rounded-none transition"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat input box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="border-t border-slate-200 p-3 bg-white flex gap-2"
          >
            <input
              id="input-copilot-chat"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Copilot about overlaps, savings, or specific apps..."
              className="flex-1 bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-[#006AA7] focus:bg-white rounded-none placeholder-slate-400 font-sans font-medium"
              disabled={loading}
            />
            <button
              id="btn-send-chat"
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-[#006AA7] hover:bg-[#006AA7]/90 text-white font-sans font-black uppercase text-xs px-4 py-2 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
