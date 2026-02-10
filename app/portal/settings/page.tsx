"use client"

import { Suspense } from "react"
import { SettingsForm } from "@/components/portal/settings-form"
import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
        <SettingsForm />
      </div>
    </Suspense>
  )
}
