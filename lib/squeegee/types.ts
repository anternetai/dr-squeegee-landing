export type JobStatus = "new" | "quoted" | "approved" | "scheduled" | "complete"

export interface SqueegeeJob {
  id: string
  created_at: string
  client_name: string
  client_phone: string
  client_email: string
  address: string
  service_type: string
  notes: string | null
  price: number | null
  status: JobStatus
  appointment_date: string | null
  appointment_time: string | null
}

export const STATUS_ORDER: JobStatus[] = ["new", "quoted", "approved", "scheduled", "complete"]

export const STATUS_LABELS: Record<JobStatus, string> = {
  new: "New",
  quoted: "Quoted",
  approved: "Approved",
  scheduled: "Scheduled",
  complete: "Complete",
}

export const SERVICE_TYPES = [
  "House Washing",
  "Roof Washing",
  "Driveway",
  "Gutters",
  "Other",
] as const

export type ServiceType = (typeof SERVICE_TYPES)[number]
