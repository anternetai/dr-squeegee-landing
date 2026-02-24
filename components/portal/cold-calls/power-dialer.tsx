"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Phone,
  PhoneOff,
  Pause,
  Play,
  Zap,
  Loader2,
  CheckCircle2,
  Settings2,
  MicOff,
  Mic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DialerLead } from "@/lib/dialer/types"
import { useTelnyxWebRTC } from "@/lib/dialer/use-telnyx-webrtc"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PowerDialerProps {
  lead: DialerLead | null
  onCallComplete?: (callControlId: string | null) => void
  onSkipToNext?: () => void
  countdownSeconds?: number
  autoDialActive?: boolean
  onCancelAutoDial?: () => void
  className?: string
}

// ─── Circular Countdown ───────────────────────────────────────────────────────

function CircularCountdown({
  remaining,
  total,
  size = 56,
}: {
  remaining: number
  total: number
  size?: number
}) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const progress = remaining / total
  const strokeDashoffset = circumference * (1 - progress)
  const color = remaining <= 1 ? "#ef4444" : remaining <= 2 ? "#f97316" : "#22c55e"

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
        />
      </svg>
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

  const makeCall = useCallback(
    (phoneNumber: string) => webrtcMakeCall(phoneNumber),
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
        makeCall(lead.phone_number)
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
    makeCall(lead.phone_number)
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

  const handleHangUp = useCallback(() => {
    hangUp()
  }, [hangUp])

  const handleManualDial = useCallback(() => {
    if (!lead?.phone_number) return
    makeCall(lead.phone_number)
  }, [lead, makeCall])

  // ─── Derived state ────────────────────────────────────────────────────────

  const isInCall =
    callState === "connecting" ||
    callState === "ringing" ||
    callState === "connected"

  const callEnded = callState === "disconnected"

  const businessName = lead?.business_name || "Unknown Business"
  const durationFormatted = `${Math.floor(callDuration / 60)}:${String(callDuration % 60).padStart(2, "0")}`

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!lead) {
    return (
      <div className={cn("flex items-center justify-center p-4 text-muted-foreground text-sm", className)}>
        No lead selected
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>

      {/* ── Countdown Mode ─────────────────────────────────────────── */}
      {isCountingDown && !isInCall && (
        <div className="flex items-center gap-3">
          <CircularCountdown remaining={countdown} total={configuredSeconds} size={48} />
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDialNow}
              size="sm"
              className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white border-0"
            >
              <Phone className="h-3.5 w-3.5" />
              Dial Now
            </Button>
            <Button onClick={handlePause} variant="outline" size="sm" className="gap-1.5">
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <Settings2 className="h-3 w-3 inline mr-0.5" />
            {configuredSeconds}s
          </button>
          {showSettings && (
            <div className="flex items-center gap-1">
              {[3, 5, 7, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => { setConfiguredSeconds(s); setCountdown(s) }}
                  className={cn(
                    "px-1.5 py-0.5 rounded border text-[10px] transition-colors",
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
        <div className="flex items-center gap-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            {callState === "connecting" && <Loader2 className="h-4 w-4 text-orange-400 animate-spin" />}
            {callState === "ringing" && <Phone className="h-4 w-4 text-orange-400 animate-bounce" />}
            {callState === "connected" && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />}
            <span className={cn(
              "text-sm font-medium tabular-nums",
              callState === "connected" ? "text-emerald-400" : "text-orange-400"
            )}>
              {callState === "connecting" && "Connecting..."}
              {callState === "ringing" && "Ringing..."}
              {callState === "connected" && durationFormatted}
            </span>
          </div>

          {/* Mute toggle (only when connected) */}
          {callState === "connected" && (
            <Button
              onClick={toggleMute}
              variant="outline"
              size="sm"
              className={cn("gap-1.5", isMuted && "border-red-500/50 text-red-400")}
            >
              {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
          )}

          {/* End Call */}
          <Button
            onClick={handleHangUp}
            variant="destructive"
            size="sm"
            className="gap-1.5 bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-900/30"
          >
            <PhoneOff className="h-4 w-4" />
            End Call
          </Button>
        </div>
      )}

      {/* ── Call Ended State ────────────────────────────────────────── */}
      {callEnded && (
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Call Ended</span>
          <span className="text-xs text-muted-foreground tabular-nums">{durationFormatted}</span>
        </div>
      )}

      {/* ── Idle: big dial button ────────────────────────────────────── */}
      {callState === "idle" && !isCountingDown && !callEnded && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleManualDial}
            disabled={!isReady || !lead.phone_number}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0 font-bold px-6"
          >
            <Phone className="h-4 w-4" />
            Dial {businessName}
          </Button>

          {onSkipToNext && (
            <Button
              onClick={onSkipToNext}
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1.5 hover:text-foreground"
            >
              <Play className="h-3.5 w-3.5" />
              Auto-Dial
            </Button>
          )}
        </div>
      )}

      {/* Error */}
      {telnyxError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5">
          <p className="text-xs text-red-400">{telnyxError}</p>
        </div>
      )}
    </div>
  )
}
