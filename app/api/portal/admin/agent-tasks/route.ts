import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/admin/agent-tasks — list all agent tasks
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const limit = parseInt(url.searchParams.get("limit") || "50")

  let query = admin
    .from("agent_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: data || [] })
}

// POST /api/portal/admin/agent-tasks — create or update a task
export async function POST(req: NextRequest) {
  const admin = getAdmin()
  const body = await req.json()
  const { id, task_name, task_description, status, progress, current_step, logs, result, error: taskError, session_key } = body

  if (id) {
    // Update existing task
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status !== undefined) update.status = status
    if (progress !== undefined) update.progress = progress
    if (current_step !== undefined) update.current_step = current_step
    if (logs !== undefined) update.logs = logs
    if (result !== undefined) update.result = result
    if (taskError !== undefined) update.error = taskError
    if (status === "running" && !body.started_at) update.started_at = new Date().toISOString()
    if (status === "completed" || status === "failed") update.completed_at = new Date().toISOString()

    const { data, error: updateError } = await admin
      .from("agent_tasks")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    return NextResponse.json({ task: data })
  } else {
    // Create new task
    const { data, error: insertError } = await admin
      .from("agent_tasks")
      .insert({
        task_name: task_name || "Untitled Task",
        task_description,
        status: status || "pending",
        progress: progress || 0,
        current_step,
        session_key,
        started_at: status === "running" ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    return NextResponse.json({ task: data })
  }
}
