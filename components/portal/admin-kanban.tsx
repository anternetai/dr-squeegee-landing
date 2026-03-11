"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CLIENT_PIPELINE_STAGES,
  CLIENT_PIPELINE_CONFIG,
} from "@/lib/portal/constants"
import type { AdminClientMetrics, ClientPipelineStage } from "@/lib/portal/types"

interface AdminKanbanProps {
  clients: AdminClientMetrics[]
  onStageChange: (clientId: string, stage: ClientPipelineStage) => void
}

function getDaysInStage(changedAt: string | null): number {
  if (!changedAt) return 0
  const diff = Date.now() - new Date(changedAt).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getHealthColor(changedAt: string | null): string {
  const days = getDaysInStage(changedAt)
  if (days >= 7) return "bg-red-500"
  if (days >= 3) return "bg-yellow-500"
  return "bg-green-500"
}

function KanbanCard({
  client,
  onStageChange,
}: {
  client: AdminClientMetrics
  onStageChange: AdminKanbanProps["onStageChange"]
}) {
  const router = useRouter()
  const days = getDaysInStage(client.pipeline_stage_changed_at)
  const config = CLIENT_PIPELINE_CONFIG[client.pipeline_stage ?? "contacted"]

  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("clientId", client.id)
        e.dataTransfer.setData("fromStage", client.pipeline_stage ?? "contacted")
        e.dataTransfer.effectAllowed = "move"
      }}
      onClick={() => router.push(`/portal/admin/clients/${client.id}`)}
      className="cursor-grab select-none p-3 transition-all hover:shadow-lg dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)] dark:hover:border-orange-500/20 active:cursor-grabbing active:shadow-xl"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {client.legal_business_name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {client.first_name} {client.last_name}
          </p>
        </div>
        <span
          className={cn(
            "mt-1 size-2.5 shrink-0 rounded-full",
            getHealthColor(client.pipeline_stage_changed_at)
          )}
          title={
            days >= 7
              ? `${days} days in stage (overdue)`
              : days >= 3
                ? `${days} days in stage (attention)`
                : `${days} day${days === 1 ? "" : "s"} in stage`
          }
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{config.nextAction}</p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {days}d in stage
        </span>
        {client.service_type && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {client.service_type}
          </Badge>
        )}
      </div>
    </Card>
  )
}

function KanbanColumn({
  stage,
  clients,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onStageChange,
}: {
  stage: ClientPipelineStage
  clients: AdminClientMetrics[]
  dragOver: ClientPipelineStage | null
  onDragOver: (e: React.DragEvent, stage: ClientPipelineStage) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, stage: ClientPipelineStage) => void
  onStageChange: AdminKanbanProps["onStageChange"]
}) {
  const config = CLIENT_PIPELINE_CONFIG[stage]

  return (
    <div
      onDragOver={(e) => onDragOver(e, stage)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage)}
      className={cn(
        "flex min-h-[400px] w-[240px] shrink-0 flex-col rounded-lg bg-muted/50 p-2 transition-colors xl:w-full xl:min-w-0",
        dragOver === stage && "bg-primary/5 ring-2 ring-primary/20"
      )}
    >
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{config.label}</h3>
          <Badge
            variant="secondary"
            className="size-5 justify-center rounded-full p-0 text-[10px]"
          >
            {clients.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2">
        {clients.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-muted-foreground">No clients</p>
          </div>
        ) : (
          clients.map((client) => (
            <KanbanCard
              key={client.id}
              client={client}
              onStageChange={onStageChange}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function AdminKanban({ clients, onStageChange }: AdminKanbanProps) {
  const [dragOver, setDragOver] = useState<ClientPipelineStage | null>(null)

  // Group clients by pipeline stage
  const clientsByStage = CLIENT_PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = clients.filter(
        (c) => (c.pipeline_stage ?? "contacted") === stage
      )
      return acc
    },
    {} as Record<ClientPipelineStage, AdminClientMetrics[]>
  )

  function handleDragOver(e: React.DragEvent, stage: ClientPipelineStage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOver(stage)
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  function handleDrop(e: React.DragEvent, stage: ClientPipelineStage) {
    e.preventDefault()
    const clientId = e.dataTransfer.getData("clientId")
    const fromStage = e.dataTransfer.getData("fromStage")
    setDragOver(null)

    if (clientId && fromStage !== stage) {
      onStageChange(clientId, stage)
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 xl:grid xl:grid-cols-8 xl:overflow-x-visible">
      {CLIENT_PIPELINE_STAGES.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          clients={clientsByStage[stage]}
          dragOver={dragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onStageChange={onStageChange}
        />
      ))}
    </div>
  )
}
