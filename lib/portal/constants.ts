import type { LeadStatus, AppointmentStatus, PaymentStatus, ClientPipelineStage, TeamMemberRole } from "./types"

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string }
> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  qualified: { label: "Qualified", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  appointment_booked: { label: "Booked", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  closed_won: { label: "Won", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  closed_lost: { label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
}

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string }
> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  confirmed: { label: "Confirmed", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300" },
  showed: { label: "Showed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  no_show: { label: "No-Show", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  rescheduled: { label: "Rescheduled", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
}

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string }
> = {
  succeeded: { label: "Paid", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
}

export const PIPELINE_STAGES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "closed_won",
  "closed_lost",
]

// Client lifecycle pipeline (admin CRM)
export const CLIENT_PIPELINE_STAGES: ClientPipelineStage[] = [
  "demo",
  "onboarding",
  "setup",
  "launch",
  "active",
]

export const CLIENT_PIPELINE_CONFIG: Record<
  ClientPipelineStage,
  { label: string; color: string; nextAction: string }
> = {
  demo: {
    label: "Demo Call",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    nextAction: "Schedule onboarding call",
  },
  onboarding: {
    label: "Onboarding",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    nextAction: "Complete account setup",
  },
  setup: {
    label: "Setup",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    nextAction: "Schedule launch call",
  },
  launch: {
    label: "Launch",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    nextAction: "Go live with ads",
  },
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    nextAction: "Monitor performance",
  },
}

// Default tasks auto-created for each pipeline stage
export const PIPELINE_STAGE_TASKS: Record<ClientPipelineStage, string[]> = {
  demo: ["Schedule demo call", "Send intro email"],
  onboarding: [
    "Schedule onboarding call",
    "Get calendar access",
    "Send service agreement",
    "Collect business info",
  ],
  setup: [
    "Set up Facebook page access",
    "Create ad account",
    "Build ad creatives",
    "Configure lead form",
  ],
  launch: [
    "Schedule launch call",
    "Review ad setup with client",
    "Launch ads",
  ],
  active: ["Monitor ad performance", "Weekly check-in"],
}

export const TEAM_ROLE_CONFIG: Record<
  TeamMemberRole,
  { label: string; description: string; allowedRoutes: string[] }
> = {
  manager: {
    label: "Manager",
    description: "Full access to all portal features",
    allowedRoutes: ["/portal/dashboard", "/portal/leads", "/portal/conversations", "/portal/appointments", "/portal/billing"],
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to dashboard and leads",
    allowedRoutes: ["/portal/dashboard", "/portal/leads"],
  },
  contractor: {
    label: "Contractor",
    description: "Access to assigned appointments and job details",
    allowedRoutes: ["/portal/dashboard", "/portal/appointments"],
  },
  inspector: {
    label: "Inspector",
    description: "Access to inspection requests and lead details",
    allowedRoutes: ["/portal/dashboard", "/portal/leads", "/portal/appointments"],
  },
}

export const CALL_OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  answered: { label: "Answered", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  no_answer: { label: "No Answer", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  voicemail: { label: "Voicemail", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  callback: { label: "Callback", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  not_interested: { label: "Not Interested", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
}
