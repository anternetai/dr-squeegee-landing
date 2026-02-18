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
export const TIMEZONE_SCHEDULE: { etHour: number; timezone: DialerTimezone; label: string }[] = [
  { etHour: 8, timezone: "ET", label: "8-9 AM ET → Eastern leads" },
  { etHour: 9, timezone: "ET", label: "9-10 AM ET → Eastern leads" },
  { etHour: 10, timezone: "CT", label: "10-11 AM ET → Central leads (9 AM their time)" },
  { etHour: 11, timezone: "MT", label: "11 AM-12 PM ET → Mountain leads (9 AM their time)" },
  { etHour: 12, timezone: "PT", label: "12-1 PM ET → Pacific leads (9 AM their time)" },
  { etHour: 13, timezone: "PT", label: "1-2 PM ET → Pacific leads (10 AM their time)" },
  { etHour: 14, timezone: "MT", label: "2-3 PM ET → Mountain leads (12 PM their time)" },
  { etHour: 15, timezone: "CT", label: "3-4 PM ET → Central leads (2 PM their time)" },
  { etHour: 16, timezone: "PT", label: "4-5 PM ET → Pacific leads (1 PM their time)" },
  { etHour: 17, timezone: "MT", label: "5-6 PM ET → Mountain leads (3 PM their time)" },
  { etHour: 18, timezone: "CT", label: "6-7 PM ET → Central leads (5 PM their time)" },
  { etHour: 19, timezone: "ET", label: "7-8 PM ET → Eastern leads (7 PM their time)" },
]

export function getCurrentETHour(): number {
  const now = new Date()
  // Convert to ET (America/New_York)
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  return etTime.getHours()
}

export function getTimezoneForHour(etHour: number): DialerTimezone | null {
  const entry = TIMEZONE_SCHEDULE.find((s) => s.etHour === etHour)
  return entry?.timezone ?? null
}

export function getScheduleForHour(etHour: number) {
  return TIMEZONE_SCHEDULE.find((s) => s.etHour === etHour) ?? null
}
