export const MOVE_TARGET_DATE = new Date("2026-12-01T00:00:00-05:00")
export const PLAN_START_DATE = new Date("2026-03-01T00:00:00-05:00")

export const MOVE_ADDRESS = "85 JAY ST"
export const MOVE_NEIGHBORHOOD = "DUMBO, BROOKLYN"
export const MOVE_CITY = "NEW YORK CITY"

export const CLIENT_GOAL = 8
export const PHASE_THRESHOLD = 3 // 3 clients = green light to move

export const WEEKLY_DIAL_TARGET = 477
export const WEEKLY_KNOCK_TARGET = 160
export const WEEKLY_PW_REVENUE_TARGET = 700

// Conversion funnel targets (per week)
export const FUNNEL_TARGETS = {
  dials: 477,
  conversations: 72,
  demos: 6,
  clients: 1,
}

export const NEIGHBORHOODS = [
  "Sardis Plantation",
  "Providence Rd",
  "Matthews",
  "Stallings",
  "Monroe",
  "Indian Trail",
] as const

export const PHASES = [
  {
    name: "IGNITION",
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    milestones: ["Sign 2 HFH clients", "100+ doors/week", "Build PW pipeline"],
  },
  {
    name: "TRACTION",
    startDate: "2026-05-01",
    endDate: "2026-07-31",
    milestones: ["3 clients = move threshold", "Consistent $1,500/wk PW", "Start apartment search"],
  },
  {
    name: "PREPARATION",
    startDate: "2026-08-01",
    endDate: "2026-10-31",
    milestones: ["6+ clients signed", "Taper PW income", "Secure apartment & logistics"],
  },
  {
    name: "THE MOVE",
    startDate: "2026-11-01",
    endDate: "2026-12-01",
    milestones: ["8 clients = $7,200/mo", "Final PW jobs", "Move to 85 Jay St"],
  },
] as const

export function getCurrentPhase(): (typeof PHASES)[number] {
  const now = new Date()
  const today = now.toISOString().split("T")[0]
  for (const phase of PHASES) {
    if (today >= phase.startDate && today <= phase.endDate) return phase
  }
  return PHASES[0]
}

export function getDaysUntilMove(): number {
  const now = new Date()
  const diff = MOVE_TARGET_DATE.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function getWeeksUntilMove(): number {
  return Math.ceil(getDaysUntilMove() / 7)
}

export function getProgressPercent(): number {
  const now = new Date()
  const total = MOVE_TARGET_DATE.getTime() - PLAN_START_DATE.getTime()
  const elapsed = now.getTime() - PLAN_START_DATE.getTime()
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}
