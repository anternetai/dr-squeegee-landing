// ─── Projects ─────────────────────────────────────────────
export type ProjectStatus = "Active" | "On Hold" | "Planning" | "Completed" | "Archived";
export type ProjectCategory =
  | "Development"
  | "Marketing"
  | "Sales"
  | "Operations"
  | "Client Work"
  | "Infrastructure"
  | "Strategy";

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  progress: number; // 0-100
  lastUpdated: string;
  notes: string;
  color: string; // tailwind color class
}

// ─── Tasks ────────────────────────────────────────────────
export type TaskStatus = "Not started" | "In progress" | "Done";
export type TaskPriority = "High" | "Medium" | "Low";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  priority: TaskPriority | null;
  projectId: string | null; // links to Project.id
  source: "notion" | "manual";
}

// ─── Leads ────────────────────────────────────────────────
export type PhoneType = "Mobile" | "Landline" | "VOIP";

export type LeadStatus =
  | "New"
  | "Called"
  | "No Answer"
  | "Callback"
  | "Demo Booked"
  | "Not Interested";

export interface Lead {
  id: string;
  companyName: string;
  ownerName: string;
  phone: string;
  state: string;
  website: string;
  phoneType: PhoneType;
  status: LeadStatus;
  lastCalled: string | null;
  notes: string;
}

// ─── Pipeline ─────────────────────────────────────────────
export type PipelineStage =
  | "Prospect"
  | "Demo Scheduled"
  | "Demo Completed"
  | "Proposal Sent"
  | "Signed"
  | "Active";

export interface PipelineDeal {
  id: string;
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  dealValue: number;
  stage: PipelineStage;
  notes: string;
}

// ─── Cold Call Logs ───────────────────────────────────────
export interface DailyCallLog {
  id: string;
  date: string;
  dials: number;
  contacts: number;
  conversations: number;
  demosBooked: number;
}

// ─── Systems ──────────────────────────────────────────────
export type SystemHealth = "Operational" | "Degraded" | "Down" | "Unknown";

export interface ConnectedSystem {
  id: string;
  name: string;
  description: string;
  url: string;
  health: SystemHealth;
  lastChecked: string;
  icon: string; // lucide icon name
  error: string | null;
}
