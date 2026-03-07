"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Brain,
  Send,
  ArrowLeft,
  Sparkles,
  Loader2,
} from "lucide-react"

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_QUESTIONS = [
  "What neighborhood should I hit today?",
  "What time of day am I most effective?",
  "Compare my cold calls vs door knocking results",
  "What's my best day of the week for closing?",
  "Where should I focus this week?",
]

export default function InsightsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || user.id !== ADMIN_ID) {
        router.push("/portal/dashboard")
        return
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(question: string) {
    if (!question.trim() || thinking) return

    const userMsg: ChatMessage = { role: "user", content: question.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setThinking(true)

    try {
      const res = await fetch("/api/portal/insights/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ])
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err.error || "Something went wrong"}`,
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error — check your connection." },
      ])
    } finally {
      setThinking(false)
      inputRef.current?.focus()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-black">
        <div className="size-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col bg-black lg:h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stone-800 px-4 py-3">
        <button
          onClick={() => router.push("/portal/the-move")}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-amber-400" />
          <h1 className="font-bold text-stone-200">The Brain</h1>
        </div>
        <span className="text-[10px] text-stone-600">
          Ask anything about your data
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          // Welcome state with suggested questions
          <div className="flex h-full flex-col items-center justify-center">
            <Brain className="mb-4 size-12 text-stone-700" />
            <h2 className="mb-1 text-lg font-bold text-stone-300">
              Ask The Brain
            </h2>
            <p className="mb-6 max-w-sm text-center text-sm text-stone-500">
              Your AI analyst knows all your door knocking and cold calling
              data. Ask it anything.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-800/50 px-3 py-2 text-xs text-stone-300 hover:border-amber-500/50 hover:text-amber-300 transition"
                >
                  <Sparkles className="size-3 text-amber-500" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-amber-500/10 border border-amber-500/20 text-stone-200"
                      : "bg-stone-800/80 border border-stone-700/50 text-stone-300"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="prose prose-sm prose-invert max-w-none prose-headings:text-stone-200 prose-strong:text-stone-200 prose-li:text-stone-300 prose-p:text-stone-300"
                      dangerouslySetInnerHTML={{
                        __html: simpleMarkdown(msg.content),
                      }}
                    />
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-stone-800/80 border border-stone-700/50 px-4 py-3">
                  <Loader2 className="size-4 animate-spin text-amber-400" />
                  <span className="text-sm text-stone-400">
                    Analyzing your data...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-stone-800 px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            disabled={thinking}
            className="flex-1 rounded-xl border border-stone-700 bg-stone-800/50 px-4 py-2.5 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="rounded-xl bg-amber-500 p-2.5 text-black hover:bg-amber-400 transition disabled:opacity-30 disabled:hover:bg-amber-500"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

// Simple markdown to HTML (bold, headers, lists, line breaks)
function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-bold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-bold mt-3 mb-1">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
}
