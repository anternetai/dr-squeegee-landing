export interface DoorKnockSession {
  id: string
  created_at: string
  knocked_at: string
  session_date: string
  neighborhood: string
  street: string | null
  notes: string | null
  doors_knocked: number
  doors_opened: number
  pitches_given: number
  jobs_closed: number
  revenue_closed: number
  session_minutes: number | null
  weather: string | null
}

export interface MoveStats {
  // Client progress
  activeClients: number
  clientNames: string[]

  // Cold calls — this week
  weekDials: number
  weekConversations: number
  weekDemos: number

  // Cold calls — today
  todayDials: number

  // Door knocks — this week
  weekDoorsKnocked: number
  weekDoorsOpened: number
  weekPitchesGiven: number
  weekJobsClosed: number

  // PW bridge income — this month
  monthPWRevenue: number
  monthPWJobs: number

  // Computed
  daysUntilMove: number
  currentPhase: string
}
