"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

type PasswordForm = z.infer<typeof passwordSchema>

export default function AcceptInvitePage() {
  const supabase = createClient()
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading")
  const [email, setEmail] = useState("")
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    async function processInvite() {
      // Sign out any existing session first so the invite tokens take over
      await supabase.auth.signOut()

      // The hash fragment contains access_token, refresh_token, type=invite
      // Supabase client auto-detects these on page load via detectSessionInUrl
      // We need to wait a tick for it to process
      const hash = window.location.hash
      if (!hash || !hash.includes("access_token")) {
        setServerError("Invalid or expired invite link. Please ask your admin to resend the invitation.")
        setStatus("error")
        return
      }

      // Give Supabase client time to process the hash tokens
      // Listen for the session to be established
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (session?.user) {
            setEmail(session.user.email ?? "")
            setStatus("ready")
            subscription.unsubscribe()
          }
        }
      )

      // Also check if session is already set (race condition)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setEmail(session.user.email ?? "")
        setStatus("ready")
        subscription.unsubscribe()
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        setStatus((prev) => {
          if (prev === "loading") {
            setServerError("Could not process invite link. It may have expired.")
            return "error"
          }
          return prev
        })
        subscription.unsubscribe()
      }, 5000)
    }

    processInvite()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: PasswordForm) {
    setServerError("")

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (error) {
      setServerError(error.message)
      return
    }

    setStatus("success")

    // Redirect to dashboard after a brief moment
    setTimeout(() => {
      window.location.href = "/portal/dashboard"
    }, 1500)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center space-y-2 pb-2">
          <Image src="/favicon.svg" alt="HomeField Hub" width={48} height={48} />
          {status === "success" ? (
            <>
              <CheckCircle2 className="size-10 text-green-500" />
              <h1 className="text-xl font-semibold">You&apos;re all set!</h1>
              <p className="text-sm text-muted-foreground">
                Taking you to your dashboard...
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Set your password</h1>
              <p className="text-sm text-muted-foreground">
                Create a password to access your HomeField Hub portal
              </p>
            </>
          )}
        </CardHeader>

        {status === "loading" && (
          <CardContent className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        )}

        {status === "error" && (
          <CardContent>
            <p className="text-sm text-destructive">{serverError}</p>
          </CardContent>
        )}

        {status === "ready" && (
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  autoFocus
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Type it again"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Set password &amp; continue
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
