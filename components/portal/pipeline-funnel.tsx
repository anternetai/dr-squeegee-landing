"use client"

import { useRouter } from "next/navigation"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PIPELINE_STAGES, LEAD_STATUS_CONFIG } from "@/lib/portal/constants"
import type { PipelineStage } from "@/lib/portal/types"

interface PipelineFunnelProps {
  clientId: string
  from: string
  to: string
}

async function fetchPipeline([, clientId, from, to]: [string, string, string, string]): Promise<PipelineStage[]> {
  const supabase = createClient()

  const { data: leads } = await supabase
    .from("leads")
    .select("status")
    .eq("client_id", clientId)
    .gte("created_at", from)
    .lte("created_at", `${to}T23:59:59`)

  const counts = new Map<string, number>()
  for (const lead of leads ?? []) {
    counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1)
  }

  return PIPELINE_STAGES.map((status) => ({
    status,
    label: LEAD_STATUS_CONFIG[status].label,
    count: counts.get(status) ?? 0,
  }))
}

export function PipelineFunnel({ clientId, from, to }: PipelineFunnelProps) {
  const router = useRouter()
  const { data: stages } = useSWR(
    ["pipeline", clientId, from, to],
    fetchPipeline,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  // Build display stages — use fetched data or default to 0 counts
  const displayStages = stages ?? PIPELINE_STAGES.map((status) => ({
    status,
    label: LEAD_STATUS_CONFIG[status].label,
    count: 0,
  }))

  const maxCount = Math.max(...displayStages.map((s) => s.count), 1)

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {displayStages.map((stage) => {
          const config = LEAD_STATUS_CONFIG[stage.status]
          const heightPercent = Math.max((stage.count / maxCount) * 100, 20)
          return (
            <Tooltip key={stage.status}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push(`/portal/leads?status=${stage.status}`)}
                  className="group flex min-w-[5rem] flex-1 flex-col items-center gap-1 rounded-lg border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ touchAction: "manipulation" }}
                >
                  <div
                    className="w-full rounded-sm bg-orange-100 transition-all group-hover:bg-orange-200 dark:bg-orange-900/30 dark:group-hover:bg-orange-800/40"
                    style={{ height: `${heightPercent}%`, minHeight: "0.5rem" }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {config.label}
                  </span>
                  <Badge variant="secondary" className="tabular-nums">
                    {stage.count}
                  </Badge>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Click to see all {config.label.toLowerCase()} leads
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
