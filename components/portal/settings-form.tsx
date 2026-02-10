"use client"

import { use } from "react"
import { User, Building2, BellRing } from "lucide-react"
import { PortalAuthContext } from "./portal-auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export function SettingsForm() {
  const { user } = use(PortalAuthContext)

  if (!user) return null

  const name = `${user.first_name} ${user.last_name}`.trim()
  const email = user.email_for_notifications || user.business_email_for_leads
  const businessName = user.legal_business_name

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} readOnly className="bg-muted" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact your account manager to update your profile information.
          </p>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            Business Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input id="business-name" value={businessName} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-type">Service Type</Label>
              <Input id="service-type" value={user.service_type ?? "Not set"} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-phone">Business Phone</Label>
              <Input id="business-phone" value={user.business_phone} readOnly className="bg-muted" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Business information is managed during onboarding. Reach out if anything needs updating.
          </p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="size-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive email alerts for new leads and appointments
                </p>
              </div>
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SMS notifications</p>
                <p className="text-xs text-muted-foreground">
                  Get text message alerts for new leads
                </p>
              </div>
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Notification preferences will be customizable in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
