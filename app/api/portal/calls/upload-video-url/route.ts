/**
 * POST /api/portal/calls/upload-video-url
 *
 * Generates a signed upload URL for Supabase Storage (session-recordings bucket).
 * Client uploads the video directly to Supabase, bypassing Next.js body size limits.
 *
 * Body (JSON): { filename: string, contentType: string, leadId?: string, callHistoryId?: string }
 * Returns: { signedUrl: string, storagePath: string, token: string }
 */

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Auth check
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { filename, contentType, leadId, callHistoryId } = body as {
    filename?: string
    contentType?: string
    leadId?: string
    callHistoryId?: string
  }

  if (!filename) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 })
  }

  const mime = contentType || "video/webm"
  if (!["video/webm", "video/mp4"].includes(mime)) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
  }

  // Build storage path: session-recordings/{date}/{userId}_{timestamp}_{filename}
  const date = new Date().toISOString().slice(0, 10) // 2026-03-04
  const ts = Date.now()
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `${date}/${user.id}_${ts}_${safeName}`

  const admin = getAdmin()

  // Create a signed upload URL (valid for 10 minutes)
  const { data, error } = await admin.storage
    .from("session-recordings")
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    console.error("[upload-video-url] Signed URL error:", error)
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    storagePath,
    token: data.token,
    leadId,
    callHistoryId,
  })
}
