"use client"

import { Mail, MessageSquare, Phone, Pencil, Users, CalendarCheck, TrendingUp, DollarSign } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatPhone, formatCurrency, formatPercent, googleVoiceUrl } from "@/lib/portal/format"
import { CLIENT_PIPELINE_CONFIG } from "@/lib/portal/constants"
import type { ClientDetail } from "@/lib/portal/types"

interface ClientDetailHeaderProps {
  client: ClientDetail
  metrics: {
    lead_count: number
    appointment_count: number
    show_rate: number
    total_charged: number
  }
}

const METRIC_CARDS = [
  { key: "lead_count" as const, label: "Leads", icon: Users, format: (v: number, _appts: number) => String(v) },
  { key: "appointment_count" as const, label: "Appointments", icon: CalendarCheck, format: (v: number, _appts: number) => String(v) },
  { key: "show_rate" as const, label: "Show Rate", icon: TrendingUp, format: (v: number, appts: number) => appts > 0 ? formatPercent(v) : "\u2014" },
  { key: "total_charged" as const, label: "Charged", icon: DollarSign, format: (v: number, _appts: number) => formatCurrency(v) },
]

export function ClientDetailHeader({ client, metrics }: ClientDetailHeaderProps) {
  const pipelineConfig = CLIENT_PIPELINE_CONFIG[client.pipeline_stage]

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Top row: Business name + pipeline badge + actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{client.legal_business_name}</h1>
              <Badge className={pipelineConfig.color}>{pipelineConfig.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {client.first_name} {client.last_name}
              {client.service_type && (
                <>
                  {" "}&middot;{" "}
                  <span className="capitalize">{client.service_type}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick action buttons */}
          <TooltipProvider delayDuration={300}>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="size-9" disabled={!client.slack_channel_id}>
                    <MessageSquare className="size-4" />
                    <span className="sr-only">Slack</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {client.slack_channel_id ? "Open Slack" : "No Slack channel"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    asChild
                    disabled={!client.email_for_notifications}
                  >
                    <a href={`mailto:${client.email_for_notifications || client.business_email_for_leads}`}>
                      <Mail className="size-4" />
                      <span className="sr-only">Email</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Email</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="size-9" asChild>
                    <a
                      href={googleVoiceUrl(client.business_phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Phone className="size-4" />
                      <span className="sr-only">Call</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Call via Google Voice</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="size-9" asChild>
                    <Link href={`/portal/settings`}>
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit in Settings</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* Contact info row */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {(client.email_for_notifications || client.business_email_for_leads) && (
            <span>{client.email_for_notifications || client.business_email_for_leads}</span>
          )}
          {client.business_phone && <span>{formatPhone(client.business_phone)}</span>}
          {(client.city || client.state) && (
            <span>
              {[client.city, client.state].filter(Boolean).join(", ")}
            </span>
          )}
        </div>

        <Separator className="my-4" />

        {/* Metric cards row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {METRIC_CARDS.map(({ key, label, icon: Icon, format }) => (
            <div key={key} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p
                  className="text-lg font-semibold"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {format(metrics[key], metrics.appointment_count)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
