"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Phone,
  PhoneOff,
  Pause,
  Play,
  Zap,
  Clock,
  Loader2,
  CheckCircle2,
  Settings2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DialerLead } from "@/lib/dialer/types"
import { useTelnyxWebRTC } from "@/lib/dialer/use-telnyx-webrtc"
import { CallTimer } from "./call-timer"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PowerDialerProps {
  /** The current lead to call */
  lead: DialerLead | null
  /** Called when a call is completed (hang up, disconnect, or ended) */
  onCallComplete?: (callControlId: string | null) => void
  /** Called to advance to the next lead */
  onSkipToNext?: () => void
  /** Countdown duration in seconds (3–10, default 5) */
  countdownSeconds?: number
  /** Whether auto-dial is active (shown after disposition) */
  autoDialActive?: boolean
  /** Cancel the auto-dial countdown */
  onCancelAutoDial?: () => void
  className?: string
}

// ─── Circular Countdown ───────────────────────────────────────────────────────

interface CircularCountdownProps {
  remaining: number
  total: number
  size?: number
}

function CircularCountdown({ remaining, total, size = 80 }: CircularCountdownProps) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = remaining / total
  const strokeDashoffset = circumference * (1 - progress)

  const color =
    remaining <= 1
      ? "#ef4444" // red
      : remaining <= 2
        ? "#f97316" // orange
        : "#22c55e" // green

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={4}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
        />
      </svg>
      {/* Number in center */}
      <div
        className="absolute inset-0 flex items-center justify-center font-bold font-mono"
        style={{ color, fontSize: size * 0.35 }}
      >
        {remaining}
      </div>
    </div>
  )
}

// ─── PowerDialer Component ────────────────────────────────────────────────────

/**
 * PowerDialer — handles auto-dial countdown + in-call UI.
 *
 * Two modes:
 * 1. Countdown mode (autoDialActive=true): shows circular countdown, Dial Now, Pause
 * 2. Active call mode: shows call state, timer, big End Call button
 */
export function PowerDialer({
  lead,
  onCallComplete,
  onSkipToNext,
  countdownSeconds = 5,
  autoDialActive = false,
  onCancelAutoDial,
  className,
}: PowerDialerProps) {
  const [countdown, setCountdown] = useState(countdownSeconds)
  const [isCountingDown, setIsCountingDown] = useState(false)
  const [localAutoDial, setLocalAutoDial] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [configuredSeconds, setConfiguredSeconds] = useState(countdownSeconds)

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasAutoDialedRef = useRef(false)

  const {
    callState,
    callDuration,
    isReady,
    error: telnyxError,
    makeCall: webrtcMakeCall,
    hangUp,
    toggleMute,
    isMuted,
  } = useTelnyxWebRTC()

  // Wrap makeCall to match expected signature (WebRTC doesn't need leadId)
  const makeCall = useCallback(
    (phoneNumber: string, _leadId?: string) => webrtcMakeCall(phoneNumber),
    [webrtcMakeCall]
  )

  // ─── Sync external autoDialActive prop ──────────────────────────────────

  useEffect(() => {
    if (autoDialActive && lead) {
      setLocalAutoDial(true)
      setCountdown(configuredSeconds)
      hasAutoDialedRef.current = false
    } else {
      setLocalAutoDial(false)
    }
  }, [autoDialActive, lead, configuredSeconds])

  // ─── Countdown timer logic ────────────────────────────────────────────────

  useEffect(() => {
    if (!localAutoDial || !lead || callState !== "idle") {
      setIsCountingDown(false)
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      return
    }

    setIsCountingDown(true)
    hasAutoDialedRef.current = false

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          countdownRef.current = null
          setIsCountingDown(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [localAutoDial, lead, callState, configuredSeconds])

  // ─── Auto-fire when countdown hits 0 ─────────────────────────────────────

  useEffect(() => {
    if (countdown === 0 && localAutoDial && lead && callState === "idle" && !hasAutoDialedRef.current) {
      hasAutoDialedRef.current = true
      setLocalAutoDial(false)
      if (lead.phone_number) {
        makeCall(lead.phone_number, lead.id)
      }
    }
  }, [countdown, localAutoDial, lead, callState, makeCall])

  // ─── Notify parent when call ends ─────────────────────────────────────────

  useEffect(() => {
    if (callState === "disconnected") {
      onCallComplete?.(null)
    }
  }, [callState, onCallComplete])

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleDialNow = useCallback(() => {
    if (!lead?.phone_number) return
    setLocalAutoDial(false)
    setIsCountingDown(false)
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    makeCall(lead.phone_number, lead.id)
  }, [lead, makeCall])

  const handlePause = useCallback(() => {
    setLocalAutoDial(false)
    setIsCountingDown(false)
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setCountdown(configuredSeconds)
    onCancelAutoDial?.()
  }, [configuredSeconds, onCancelAutoDial])

  const handleHangUp = useCallback(async () => {
    await hangUp()
  }, [hangUp])

  const handleManualDial = useCallback(() => {
    if (!lead?.phone_number) return
    makeCall(lead.phone_number, lead.id)
  }, [lead, makeCall])

  // ─── Derived state ────────────────────────────────────────────────────────

  const isInCall =
    callState === "connecting" ||
    callState === "ringing" ||
    callState === "connected"

  const callEnded = callState === "disconnected"

  const businessName = lead?.business_name || "Unknown Business"
  const ownerName = lead?.first_name || lead?.owner_name || "Owner"
  const state = lead?.state || ""
  const phoneFormatted = lead?.phone_number
    ? lead.phone_number.replace(/\D/g, "").replace(/^1?(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")
    : "—"

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!lead) {
    return (
      <div className={cn("flex items-center justify-center p-6 text-muted-foreground text-sm", className)}>
        No lead selected
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Lead Info */}
      <div className="flex flex-col gap-0.5 px-1">
        <p className="text-base font-semibold text-foreground leading-tight">{businessName}</p>
        <p className="text-sm text-muted-foreground">
          {ownerName}
          {state ? <span className="text-zinc-500"> · {state}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">{phoneFormatted}</p>
      </div>

      {/* ── Countdown Mode ─────────────────────────────────────────── */}
      {isCountingDown && !isInCall && (
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Label */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-orange-400" />
            <span>Auto-dialing next lead in…</span>
          </div>

          {/* Circular countdown */}
          <CircularCountdown
            remaining={countdown}
            total={configuredSeconds}
            size={88}
          />

          {/* Actions */}
          <div className="flex items-center gap-2 w-full">
            <Button
              onClick={handleDialNow}
              variant="default"
              className="flex-1 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white border-0"
              size="sm"
            >
              <Phone className="h-3.5 w-3.5" />
              Dial Now
            </Button>
            <Button
              onClick={handlePause}
              variant="outline"
              size="sm"
              className="gap-1.5 border-zinc-700"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
          </div>

          {/* Settings row */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            <span>Delay: {configuredSeconds}s</span>
          </button>

          {showSettings && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Countdown:</span>
              {[3, 5, 7, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setConfiguredSeconds(s)
                    setCountdown(s)
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded border text-xs transition-colors",
                    configuredSeconds === s
                      ? "border-orange-500 text-orange-400 bg-orange-500/10"
                      : "border-zinc-700 text-muted-foreground hover:border-zinc-500"
                  )}
                >
                  {s}s
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active Call Mode ────────────────────────────────────────── */}
      {isInCall && (
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Call state indicator */}
          <div className="flex items-center gap-2">
            {callState === "connecting" && (
              <Loader2 className="h-4 w-4 text-orange-400 animate-spin" />
            )}
            {callState === "ringing" && (
              <Phone className="h-4 w-4 text-orange-400 animate-bounce" />
            )}
            {callState === "connected" && (
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                callState === "connected" ? "text-emerald-400" : "text-orange-400"
              )}
            >
              {callState === "connecting" && "Connecting..."}
              {callState === "ringing" && "Ringing..."}
              {callState === "connected" && "Connected"}
            </span>
          </div>

          {/* Call Timer */}
          <CallTimer duration={callDuration} callState={callState} />

          {/* End Call button */}
          <Button
            onClick={handleHangUp}
            variant="destructive"
            className="w-full h-12 text-base font-bold gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/30"
          >
            <PhoneOff className="h-5 w-5" />
            End Call
          </Button>
        </div>
      )}

      {/* ── Call Ended State ────────────────────────────────────────── */}
      {callEnded && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Call Ended</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Duration: {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, "0")}
          </p>
        </div>
      )}

      {/* ── Idle + not counting down: manual dial button ────────────── */}
      {callState === "idle" && !isCountingDown && !callEnded && (
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleManualDial}
            disabled={!isReady || !lead.phone_number}
            className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0"
          >
            <Phone className="h-4 w-4" />
            Dial {businessName}
          </Button>

          {onSkipToNext && (
            <Button
              onClick={onSkipToNext}
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground gap-1.5 hover:text-foreground"
            >
              <Play className="h-3.5 w-3.5" />
              Start Auto-Dial
            </Button>
          )}
        </div>
      )}

      {/* Error message */}
      {telnyxError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2">
          <Clock className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400 leading-snug">{telnyxError}</p>
        </div>
      )}
    </div>
  )
}
