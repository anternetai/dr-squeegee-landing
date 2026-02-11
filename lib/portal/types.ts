export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "appointment_booked"
  | "closed_won"
  | "closed_lost"

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "showed"
  | "no_show"
  | "rescheduled"
  | "completed"
  | "cancelled"

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded"

export interface Client {
  id: string
  legal_business_name: string
  first_name: string
  last_name: string
  business_email_for_leads: string
  email_for_notifications: string
  business_phone: string
  service_type: string | null
  auth_user_id: string | null
  role: "client" | "admin"
  created_at: string
  onboarding_status: string | null
  notify_email: boolean
  notify_sms: boolean
}

export interface Lead {
  id: string
  client_id: string
  name: string
  phone: string
  email: string | null
  status: LeadStatus
  source: string
  created_at: string
  updated_at: string
  notes: string | null
}

export interface Appointment {
  id: string
  client_id: string
  lead_id: string
  scheduled_at: string
  status: AppointmentStatus
  duration_minutes: number
  outcome_quote_given: boolean | null
  outcome_quote_amount: number | null
  outcome_job_sold: boolean | null
  outcome_job_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
  lead?: Lead
}

export interface Payment {
  id: string
  client_id: string
  appointment_id: string | null
  amount_cents: number
  status: PaymentStatus
  stripe_payment_intent_id: string | null
  refund_reason: string | null
  created_at: string
  lead?: Lead
}

// sms_conversations table stores individual messages (role/content),
// not a separate thread. This represents one message row.
export interface SmsConversationRow {
  id: string
  lead_id: string
  role: "user" | "assistant" | "system"
  content: string
  phone_number: string | null
  is_unknown_lead: boolean
  created_at: string
}

// Derived type for the conversations list UI
export interface ConversationThread {
  lead_id: string
  lead_name: string
  lead_phone: string
  last_message: string | null
  last_message_at: string | null
  message_count: number
}

export interface KpiData {
  total_leads: number
  appointments_booked: number
  show_rate: number
  total_charged: number
}

export interface PipelineStage {
  status: LeadStatus
  label: string
  count: number
}

export interface AdminClientMetrics extends Client {
  lead_count: number
  appointment_count: number
  show_rate: number
  total_charged: number
  last_lead_at: string | null
  pipeline_stage: ClientPipelineStage
  pipeline_stage_changed_at: string | null
  next_call_at: string | null
  next_call_type: string | null
}

// CRM Pipeline stages for client lifecycle
export type ClientPipelineStage = "demo" | "onboarding" | "setup" | "launch" | "active"

export interface ClientDetail extends Client {
  pipeline_stage: ClientPipelineStage
  pipeline_stage_changed_at: string | null
  demo_call_at: string | null
  onboarding_call_at: string | null
  launch_call_at: string | null
  next_call_at: string | null
  next_call_type: string | null
  slack_channel_id: string | null
  cell_phone_for_notifications: string
  street_address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  website_url: string | null
  stripe_customer_id: string | null
  facebook_page_id: string | null
  ad_account_id: string | null
  calendar_id: string | null
  differentiator: string | null
  offer: string | null
}

export interface ClientTask {
  id: string
  client_id: string
  title: string
  completed: boolean
  completed_at: string | null
  due_at: string | null
  pipeline_stage: ClientPipelineStage | null
  sort_order: number
  created_at: string
}

export interface ClientActivity {
  id: string
  client_id: string
  type: "slack_message" | "email_sent" | "call" | "stage_change" | "task_completed" | "note" | "lead_in" | "appointment" | "payment"
  title: string
  detail: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface CrmProspect {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  call_outcome: "answered" | "no_answer" | "voicemail" | "callback" | "not_interested" | null
  follow_up_at: string | null
  last_called_at: string | null
  import_batch: string | null
  created_at: string
}

export type TeamMemberRole = "viewer" | "manager"

export interface TeamMember {
  id: string
  client_id: string
  auth_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: TeamMemberRole
  invited_by: string | null
  created_at: string
}
