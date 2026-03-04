"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Scroll,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type ScriptLine =
  | { type: "speaker"; text: string }
  | { type: "stage"; text: string }
  | { type: "dialogue"; text: string }
  | { type: "cue"; text: string }
  | { type: "blank" }

interface ScriptSection {
  id: string
  label: string
  shortLabel: string
  lines: ScriptLine[]
}

type FontSize = "sm" | "md" | "lg"

// ─── Script Data ──────────────────────────────────────────────────────────────

const SCRIPT_SECTIONS: ScriptSection[] = [
  {
    id: "intro",
    label: "Intro",
    shortLabel: "Intro",
    lines: [
      { type: "speaker", text: "YOU:" },
      {
        type: "dialogue",
        text: '"Hey [Name]... oh, hey [Name], this is... uh... Anthony over at HomeField Hub.',
      },
      {
        type: "stage",
        text: "(downswing/pause)",
      },
      {
        type: "dialogue",
        text:
          'Look, I know I\'m catching you totally out of the blue here... but do you mind if I grab just like, a quick half a minute? I\'ll tell you why I called, and then you can let me know if it\'s even relevant to your world... or not?"',
      },
      { type: "blank" },
      {
        type: "cue",
        text: "🎯 Tonality: Relaxed, slightly apologetic. You're a peer, not a salesperson. Downswing on 'HomeField Hub' — kills the salesy vibe.",
      },
    ],
  },
  {
    id: "pattern1",
    label: "Pattern Interrupt 1",
    shortLabel: "PI #1",
    lines: [
      { type: "speaker", text: "YOU:" },
      {
        type: "dialogue",
        text: '"Appreciate that. And, uh, have you heard of HomeField Hub? Just by the off chance?"',
      },
      { type: "blank" },
      { type: "speaker", text: "PROSPECT:" },
      { type: "stage", text: '(They say: "No.")' },
      { type: "blank" },
      { type: "speaker", text: "YOU:" },
      {
        type: "dialogue",
        text: '"Okay, no worries... look, feel free to stop me at any point if this isn\'t making sense."',
      },
      { type: "blank" },
      {
        type: "cue",
        text: "🎯 Tonality: Casual, unbothered. The 'feel free to stop me' line gives them control — which paradoxically makes them want to keep listening.",
      },
    ],
  },
  {
    id: "pattern2",
    label: "Pattern Interrupt 2",
    shortLabel: "PI #2",
    lines: [
      { type: "speaker", text: "YOU:" },
      {
        type: "dialogue",
        text: '"Before I get ahead of myself... are you guys mostly focused on residential roof replacements right now, or are you doing more of the commercial stuff?"',
      },
      { type: "blank" },
      { type: "speaker", text: "PROSPECT:" },
      { type: "stage", text: '(They say: "Residential.")' },
      { type: "blank" },
      { type: "speaker", text: "YOU:" },
      {
        type: "dialogue",
        text: '"Gotcha... okay, so this should be right in your wheelhouse, but again... cut me off if I\'m off base here."',
      },
      { type: "blank" },
      {
        type: "cue",
        text: "🎯 Tonality: Genuine curiosity. Their answer doesn't matter much — you're qualifying them into the pitch. The 'cut me off' line is another control giver.",
      },
    ],
  },
  {
    id: "pitch",
    label: "Main Pitch",
    shortLabel: "Pitch",
    lines: [
      { type: "speaker", text: "YOU (The Macro Riff):" },
      {
        type: "dialogue",
        text: '"So, quick thumbnail on us... HomeField Hub... we\'re essentially a performance-based growth partner for roofing contractors.',
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text:
          "And just so you know where I'm coming from... I actually worked for American Home Remodeling Company here in Charlotte. Started as a canvasser back in 2016... moved into in-home sales... and eventually ended up running their whole marketing team doing exactly this — lead generation.",
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text:
          "So I've literally been on every side of this thing... knocking doors, sitting at kitchen tables, and then building the machine that fills the pipeline.",
      },
      { type: "stage", text: "(pause)" },
      {
        type: "cue",
        text: "🎯 Tonality: Matter-of-fact, not bragging. You're establishing that you're a peer who came up through the trades — not some agency kid. Let it land, then transition into the industry observation.",
      },
      { type: "blank" },
      {
        type: "dialogue",
        text:
          "And what we're seeing from a high-level in the industry right now... is that the shared lead platforms... you know, the Angis and HomeAdvisors... they've become a total race to the bottom.",
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text:
          "Most owners I talk to are just... they're exhausted. They're tired of paying for leads sold to five other guys, driving an hour out to a job, knocking on the door, and no one even answers. It's a massive waste of time and gas.",
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text:
          "And so to cut to it... our 'superpower' is a hybrid system. We run exclusive local ads so you aren't fighting five other guys... but then we pair it with a 'speed-to-lead' AI.",
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text:
          "It hits the lead in under 60 seconds and actually books the appointment directly on your calendar while the homeowner is still hot.",
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text:
          "And we do it in a way that... honestly, makes most marketing agencies pretty mad at us. We threw the whole 'monthly retainer and setup fee' model in the trash.",
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text:
          "We waive our five-thousand-dollar setup fee until we've actually generated you fifty-thousand in revenue... and you only pay us two-hundred dollars per booked appointment.",
      },
      { type: "stage", text: "(pause)" },
      { type: "dialogue", text: "Pretty bananas for this space.\"" },
      { type: "blank" },
      {
        type: "cue",
        text: '🎯 Tonality: The "Exhausted" Label — sympathetic, almost tired. You\'re on THEIR side looking at the stupid marketing industry. Waive the fee QUICKLY and casually — overexplaining makes it a gimmick.',
      },
    ],
  },
  {
    id: "close",
    label: "Downsell & Close",
    shortLabel: "Close",
    lines: [
      { type: "speaker", text: "YOU (The Downsell):" },
      {
        type: "dialogue",
        text:
          '"And so [Name]... look, my timing\'s probably off here, and I know you might already have your lead-gen handled... but that\'s exactly why we\'ve been hosting these brief 15-minute walkthroughs... just to show you the AI in action and how the math works... and then from there, you can just keep us in the back pocket for down the road if you ever need a spark.',
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text: 'So... yeah... you game to loop up for a quick peek... say... tomorrow afternoon?"',
      },
      { type: "blank" },
      {
        type: "cue",
        text: '🎯 Tonality: Relaxed, low-pressure. You\'re almost GIVING them an out ("keep us in the back pocket"). This is the downsell — it lowers resistance. Pause before the close question and let it breathe.',
      },
    ],
  },
  {
    id: "discovery",
    label: "Post-Close Discovery",
    shortLabel: "Discovery",
    lines: [
      { type: "speaker", text: "YOU (The Transition):" },
      {
        type: "dialogue",
        text:
          '"Okay, tomorrow at 2:00 works. Look, just so we can keep that chat short and sweet and ensure I\'m not wasting your time... is it cool if I ask just a couple of quick questions to get a better idea of what you guys have going on?"',
      },
      { type: "blank" },
      { type: "speaker", text: "DISCOVERY QUESTIONS (Low & Slow Tonality):" },
      { type: "blank" },
      {
        type: "dialogue",
        text: '"How\'s business actually going for you guys right now? I know the market\'s been a bit weird lately."',
      },
      { type: "blank" },
      {
        type: "dialogue",
        text:
          '"And just for context... where are most of your jobs coming from atm? Is it mainly referrals or are you still fighting the Angi battle?"',
      },
      { type: "blank" },
      {
        type: "dialogue",
        text:
          '"Gotcha. And what does a good month look like for you in terms of completed replacements? Like, how many did you guys put on the board last month?"',
      },
      { type: "blank" },
      {
        type: "dialogue",
        text:
          '"Okay... so if there were a way to get you to [Goal], how soon would you actually be looking to ramp things up? Are we talking \'yesterday\' or are you just looking for a spring/summer spark?"',
      },
      { type: "blank" },
      {
        type: "cue",
        text: "🎯 Tonality: Sound like a DOCTOR diagnosing, not a form filler. If they give a vague answer, dig deeper. Genuine curiosity. Slow down — let the silence work for you.",
      },
    ],
  },
  {
    id: "label",
    label: "The Label",
    shortLabel: "Label",
    lines: [
      { type: "speaker", text: "YOU (Establishing Authority):" },
      {
        type: "dialogue",
        text:
          '"Got it. So you\'re doing about [Result] but you want to get to [Goal]... and the main thing stopping you is [Problem]. Honestly, [Name], based on what you\'ve told me, you actually crushed my interview.',
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text: "Most guys I talk to don't have their crews or their margins that locked in.\"",
      },
      { type: "blank" },
      {
        type: "cue",
        text: '🎯 Tonality: Warm, genuine. The "crushed my interview" flip makes THEM feel qualified. Authority shift complete — now you\'re the gatekeeper, not the one seeking approval.',
      },
    ],
  },
  {
    id: "finalset",
    label: "Final Set",
    shortLabel: "Final Set",
    lines: [
      { type: "speaker", text: "YOU (Locking It In):" },
      {
        type: "dialogue",
        text:
          '"I\'ll be honest with you—we don\'t work with everyone. We need people that are action-takers because our AI moves fast. But based on this, you\'re definitely qualified for a partnership.',
      },
      { type: "stage", text: "(pause)" },
      {
        type: "dialogue",
        text:
          "This was the 'IF' call—to see if we're a fit. Tomorrow will be the 'HOW' call, where I'll show you exactly how we'll plug this into your business. Check your email for that invite from HomeField Hub... go ahead and hit 'Yes' on that now so it doesn't get buried.",
      },
      { type: "stage", text: "(pause)" },
      { type: "dialogue", text: 'Talk to you tomorrow at 2:00. Appreciate it, [Name]."' },
      { type: "blank" },
      {
        type: "cue",
        text: "🎯 Tonality: Confident, decisive. You don't work with everyone — this is the authority close. IF call → HOW call framing removes any remaining anxiety. Get the calendar confirmation NOW.",
      },
    ],
  },
]

// ─── Font Size Config ─────────────────────────────────────────────────────────

const FONT_SIZES: Record<FontSize, { label: string; class: string; lineClass: string }> = {
  sm: { label: "S", class: "text-sm", lineClass: "leading-6" },
  md: { label: "M", class: "text-base", lineClass: "leading-7" },
  lg: { label: "L", class: "text-lg", lineClass: "leading-8" },
}

// ─── Script Line Renderer ─────────────────────────────────────────────────────

function ScriptLine({ line, fontSize }: { line: ScriptLine; fontSize: FontSize }) {
  const { class: fsClass, lineClass } = FONT_SIZES[fontSize]

  if (line.type === "blank") return <div className="h-3" />

  if (line.type === "speaker") {
    return (
      <div className={cn("font-bold text-orange-400 tracking-wide mt-4 first:mt-0", fsClass, lineClass)}>
        {line.text}
      </div>
    )
  }

  if (line.type === "stage") {
    return (
      <div className={cn("italic text-muted-foreground/70 pl-4", fsClass, lineClass)}>
        {line.text}
      </div>
    )
  }

  if (line.type === "cue") {
    return (
      <div
        className={cn(
          "mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300",
          fsClass,
          lineClass,
        )}
      >
        {line.text}
      </div>
    )
  }

  // dialogue
  return (
    <div className={cn("text-foreground/90 pl-1", fsClass, lineClass)}>
      {line.text}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScriptTeleprompter() {
  const [activeSection, setActiveSection] = useState(SCRIPT_SECTIONS[0].id)
  const [fontSize, setFontSize] = useState<FontSize>("md")
  const [autoScroll, setAutoScroll] = useState(false)
  const [compact, setCompact] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const currentIndex = SCRIPT_SECTIONS.findIndex((s) => s.id === activeSection)

  // ── Auto-scroll logic ──────────────────────────────────────────────────────
  const startAutoScroll = useCallback(() => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current)
    autoScrollRef.current = setInterval(() => {
      const el = scrollRef.current
      if (!el) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        setAutoScroll(false)
        clearInterval(autoScrollRef.current!)
        return
      }
      el.scrollTop += 1
    }, 60)
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current)
      autoScrollRef.current = null
    }
  }, [])

  useEffect(() => {
    if (autoScroll) startAutoScroll()
    else stopAutoScroll()
    return stopAutoScroll
  }, [autoScroll, startAutoScroll, stopAutoScroll])

  // ── Jump to section ────────────────────────────────────────────────────────
  const jumpToSection = useCallback(
    (id: string) => {
      setActiveSection(id)
      if (!compact) {
        // scroll to section anchor in full view
        setTimeout(() => {
          const el = sectionRefs.current[id]
          if (el && scrollRef.current) {
            scrollRef.current.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" })
          }
        }, 50)
      } else {
        // in compact mode, reset scroll to top when switching
        if (scrollRef.current) scrollRef.current.scrollTop = 0
      }
    },
    [compact],
  )

  const goNext = () => {
    const next = SCRIPT_SECTIONS[currentIndex + 1]
    if (next) jumpToSection(next.id)
  }

  const goPrev = () => {
    const prev = SCRIPT_SECTIONS[currentIndex - 1]
    if (prev) jumpToSection(prev.id)
  }

  const reset = () => {
    jumpToSection(SCRIPT_SECTIONS[0].id)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  // ── Sections to render ─────────────────────────────────────────────────────
  const sectionsToRender = compact
    ? SCRIPT_SECTIONS.filter((s) => s.id === activeSection)
    : SCRIPT_SECTIONS

  return (
    <TooltipProvider>
      <Card className="flex flex-col border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* ── Header ── */}
        <CardHeader className="flex-shrink-0 pb-0 pt-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Scroll className="h-4 w-4 text-orange-400" />
              Script Teleprompter
            </CardTitle>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {/* Font size */}
              <div className="flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/40 p-0.5">
                {(["sm", "md", "lg"] as FontSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setFontSize(sz)}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                      fontSize === sz
                        ? "bg-orange-500/20 text-orange-400"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {FONT_SIZES[sz].label}
                  </button>
                ))}
              </div>

              {/* Auto-scroll */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7",
                      autoScroll ? "text-orange-400 bg-orange-500/10" : "text-muted-foreground",
                    )}
                    onClick={() => setAutoScroll((v) => !v)}
                  >
                    {autoScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{autoScroll ? "Stop auto-scroll" : "Start auto-scroll"}</TooltipContent>
              </Tooltip>

              {/* Compact mode */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7",
                      compact ? "text-orange-400 bg-orange-500/10" : "text-muted-foreground",
                    )}
                    onClick={() => setCompact((v) => !v)}
                  >
                    {compact ? (
                      <Maximize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Minimize2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{compact ? "Full script" : "Compact mode"}</TooltipContent>
              </Tooltip>

              {/* Reset */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={reset}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset to start</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
            {SCRIPT_SECTIONS.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => jumpToSection(section.id)}
                className={cn(
                  "flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap border",
                  activeSection === section.id
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <span className="text-muted-foreground/50 mr-1">{idx + 1}.</span>
                {section.shortLabel}
              </button>
            ))}
          </div>

          <Separator className="mt-0" />
        </CardHeader>

        {/* ── Script body ── */}
        <CardContent className="flex-1 p-0 min-h-0">
          <div
            ref={scrollRef}
            className="h-[420px] overflow-y-auto px-4 py-4 space-y-0 scroll-smooth"
          >
            {sectionsToRender.map((section) => (
              <div
                key={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el
                }}
              >
                {/* Section header */}
                {!compact && (
                  <div
                    className={cn(
                      "flex items-center gap-2 mb-3",
                      section.id !== sectionsToRender[0].id && "mt-8",
                    )}
                  >
                    <div
                      className={cn(
                        "h-px flex-1",
                        activeSection === section.id ? "bg-orange-500/40" : "bg-border/40",
                      )}
                    />
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold border",
                        activeSection === section.id
                          ? "border-orange-500/50 text-orange-400 bg-orange-500/10"
                          : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {section.label}
                    </Badge>
                    <div
                      className={cn(
                        "h-px flex-1",
                        activeSection === section.id ? "bg-orange-500/40" : "bg-border/40",
                      )}
                    />
                  </div>
                )}

                {/* Lines */}
                <div className="space-y-0.5">
                  {section.lines.map((line, i) => (
                    <ScriptLine key={i} line={line} fontSize={fontSize} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        {/* ── Footer nav ── */}
        <div className="flex-shrink-0 border-t border-border/40 px-4 py-2.5 flex items-center justify-between bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>

          <div className="flex items-center gap-1.5">
            {SCRIPT_SECTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => jumpToSection(SCRIPT_SECTIONS[i].id)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === currentIndex
                    ? "w-4 bg-orange-400"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={goNext}
            disabled={currentIndex === SCRIPT_SECTIONS.length - 1}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    </TooltipProvider>
  )
}
