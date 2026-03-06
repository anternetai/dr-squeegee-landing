export type DialerTimezone = "ET" | "CT" | "MT" | "PT"

export type DialerStatus = "queued" | "in_progress" | "callback" | "completed" | "archived"

export type DialerOutcome =
  | "no_answer"
  | "voicemail"
  | "gatekeeper"
  | "conversation"
  | "demo_booked"
  | "not_interested"
  | "wrong_number"
  | "callback"

export interface DialerLead {
  id: string
  created_at: string
  updated_at: string
  state: string | null
  business_name: string | null
  phone_number: string | null
  owner_name: string | null
  first_name: string | null
  website: string | null
  timezone: DialerTimezone | null
  status: DialerStatus
  attempt_count: number
  max_attempts: number
  last_called_at: string | null
  next_call_at: string | null
  last_outcome: DialerOutcome | null
  demo_booked: boolean
  demo_date: string | null
  not_interested: boolean
  wrong_number: boolean
  notes: string | null
  import_batch: string | null
  sheet_row_id: string | null
}

export interface DialerCallHistory {
  id: string
  created_at: string
  lead_id: string
  attempt_number: number
  outcome: DialerOutcome
  notes: string | null
  demo_date: string | null
  callback_at: string | null
  call_date: string
  call_time: string
}

export interface DialerQueueResponse {
  leads: DialerLead[]
  totalToday: number
  completedToday: number
  currentTimezone: DialerTimezone | null
  currentHourBlock: string | null
  callbacksDue: DialerLead[]
  breakdownByTimezone: Record<DialerTimezone, number>
  selectedNumber: SelectedNumber | null
}

export interface SelectedNumber {
  id: string
  phone_number: string
  friendly_name: string | null
  area_code: string | null
  calls_this_hour: number
  max_calls_per_hour: number
}

export interface PhonePoolNumber {
  id: string
  created_at: string
  phone_number: string
  friendly_name: string | null
  area_code: string | null
  state: string | null
  twilio_sid: string | null
  status: "active" | "cooling" | "retired"
  calls_today: number
  calls_this_hour: number
  last_used_at: string | null
  total_calls: number
  spam_reports: number
  max_calls_per_hour: number
  cooldown_minutes: number
}

export interface ImportResult {
  imported: number
  duplicates: number
  updated: number
  errors: string[]
}

export interface DailyDialerStats {
  totalLeads: number
  completedToday: number
  callbacksDueToday: number
  breakdownByTimezone: Record<DialerTimezone, number>
  breakdownByHour: { hour: string; timezone: DialerTimezone; count: number }[]
  todayOutcomes: Record<string, number>
}

// State → Timezone mapping
export const STATE_TIMEZONE_MAP: Record<string, DialerTimezone> = {
  // Eastern Time
  NC: "ET", FL: "ET", GA: "ET", SC: "ET", VA: "ET", NY: "ET", PA: "ET",
  OH: "ET", MI: "ET", IN: "ET", KY: "ET", TN: "ET", AL: "ET", MS: "ET",
  CT: "ET", DE: "ET", ME: "ET", MD: "ET", MA: "ET", NH: "ET", NJ: "ET",
  RI: "ET", VT: "ET", WV: "ET", DC: "ET",
  // Central Time
  TX: "CT", IL: "CT", WI: "CT", MN: "CT", IA: "CT", MO: "CT", AR: "CT",
  LA: "CT", KS: "CT", NE: "CT", ND: "CT", SD: "CT", OK: "CT",
  // Mountain Time
  AZ: "MT", CO: "MT", ID: "MT", MT: "MT", NM: "MT", UT: "MT", WY: "MT",
  // Pacific Time
  CA: "PT", NV: "PT", OR: "PT", WA: "PT",
  // Territories / others → default ET
  HI: "PT", AK: "PT", PR: "ET", VI: "ET", GU: "PT",
}

// Timezone cascade schedule: ET hour → timezone to call
// Strategy: hit each timezone at 7:30 AM local time (THE MOVE — early morning blitz)
// Lunch window at noon, EOD follow-ups at 4 PM ET. Gaps = PW job hours (manual TZ select).

// Mon-Thu: full schedule with 1-hour blocks per timezone
export const TIMEZONE_SCHEDULE: { etHour: number; timezone: DialerTimezone; label: string }[] = [
  { etHour: 7, timezone: "ET", label: "7-8 AM ET → Eastern leads (7:30 AM their time)" },
  { etHour: 8, timezone: "CT", label: "8-9 AM ET → Central leads (7:30 AM their time)" },
  { etHour: 9, timezone: "MT", label: "9-10 AM ET → Mountain leads (7:30 AM their time)" },
  { etHour: 10, timezone: "PT", label: "10-11 AM ET → Pacific leads (7:30 AM their time)" },
  { etHour: 12, timezone: "ET", label: "12-12:30 PM ET → Eastern/Central lunch window" },
  { etHour: 16, timezone: "ET", label: "4-5 PM ET → Eastern EOD (Tue-Fri)" },
]

// Friday: compressed 7:30-8:30 AM local windows (30 min each)
export const FRIDAY_TIMEZONE_SCHEDULE: { etHour: number; timezone: DialerTimezone; label: string }[] = [
  { etHour: 7, timezone: "ET", label: "7:30-8 AM ET → Eastern (7:30 AM their time)" },
  { etHour: 8, timezone: "ET", label: "8-8:30 AM ET → Eastern (continued)" },
  { etHour: 8, timezone: "CT", label: "8:30-9 AM ET → Central (7:30 AM their time)" },
  { etHour: 9, timezone: "CT", label: "9-9:30 AM ET → Central (continued)" },
  { etHour: 9, timezone: "MT", label: "9:30-10 AM ET → Mountain (7:30 AM their time)" },
  { etHour: 10, timezone: "MT", label: "10-10:30 AM ET → Mountain (continued)" },
  { etHour: 10, timezone: "PT", label: "10:30-11 AM ET → Pacific (7:30 AM their time)" },
  { etHour: 11, timezone: "PT", label: "11-11:30 AM ET → Pacific (continued)" },
]

export function getCurrentETHour(): number {
  const now = new Date()
  // Convert to ET (America/New_York)
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  return etTime.getHours()
}

export function isFriday(): boolean {
  const now = new Date()
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  return etTime.getDay() === 5
}

export function getActiveSchedule() {
  return isFriday() ? FRIDAY_TIMEZONE_SCHEDULE : TIMEZONE_SCHEDULE
}

export function getTimezoneForHour(etHour: number): DialerTimezone | null {
  const schedule = getActiveSchedule()
  const entry = schedule.find((s) => s.etHour === etHour)
  return entry?.timezone ?? null
}

export function getScheduleForHour(etHour: number) {
  const schedule = getActiveSchedule()
  return schedule.find((s) => s.etHour === etHour) ?? null
}

// Call transcript types
export interface CallTranscript {
  id: string
  created_at: string
  lead_id: string | null
  call_log_id: string | null
  phone_number: string | null
  duration_seconds: number | null
  raw_transcript: string | null
  ai_summary: string | null
  ai_disposition: DialerOutcome | null
  ai_notes: string | null
}

export interface AISummaryResponse {
  summary: string
  disposition: DialerOutcome
  notes: string
  keyPoints: string[]
}

// Call state for in-browser dialer
export type CallState = "idle" | "connecting" | "ringing" | "connected" | "disconnected"
