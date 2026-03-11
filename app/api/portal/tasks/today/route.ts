import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// XP values per category
const XP_VALUES: Record<string, number> = {
  HFH: 100,
  SQUEEGEE: 50,
  DAILY: 25,
  PERSONAL: 25,
}

// Helper: convert a Date to YYYY-MM-DD in Eastern Time
function toETDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

// Helper: convert a Date to HH:MM:SS in Eastern Time
function toETTimeStr(date: Date): string {
  const etStr = date.toLocaleString("en-US", { timeZone: "America/New_York" })
  const etDate = new Date(etStr)
  const h = String(etDate.getHours()).padStart(2, "0")
  const m = String(etDate.getMinutes()).padStart(2, "0")
  return `${h}:${m}:00`
}

// Helper: parse "HH:MM:SS" → minutes since midnight
function timeToMins(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

// Standard daily blocks (weekdays only)
const WEEKDAY_BLOCKS = [
  {
    title: "Cold calls 7–11:30 AM",
    category: "HFH",
    scheduled_time: "07:00:00",
    xp_value: 75,
    source: "auto_daily",
  },
  {
    title: "Door knocks 4–6 PM",
    category: "SQUEEGEE",
    scheduled_time: "16:00:00",
    xp_value: 50,
    source: "auto_daily",
  },
]

// Daily personal block (every day, including weekends)
const GYM_BLOCK = {
  title: "Gym (45 min)",
  category: "PERSONAL",
  scheduled_time: null, // flexible time — no fixed slot
  xp_value: 25,
  source: "auto_gym",
}

// GET /api/portal/tasks/today — returns today's tasks, auto-generates if needed
export async function GET() {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()

  // Use ET timezone for date/weekday detection (user is in Eastern Time)
  const now = new Date()
  const today = toETDateStr(now)
  const nowInET = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  const dayOfWeek = nowInET.getDay() // 0 = Sunday, 6 = Saturday
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

  // Fetch existing tasks for today
  const { data: existingTasks } = await admin
    .from("daily_tasks")
    .select("*")
    .eq("task_date", today)
    .order("scheduled_time", { ascending: true, nullsFirst: false })

  const tasksToInsert: Array<Record<string, unknown>> = []

  // Check which auto sources already have tasks today
  const existingAutoDaily = existingTasks?.some((t) => t.source === "auto_daily") ?? false
  const existingAutoGym = existingTasks?.some((t) => t.source === "auto_gym") ?? false
  const existingDemoIds = new Set(
    existingTasks?.filter((t) => t.source === "auto_demo").map((t) => String(t.source_id)) ?? []
  )
  const existingSqueegeeIds = new Set(
    existingTasks?.filter((t) => t.source === "auto_squeegee").map((t) => String(t.source_id)) ?? []
  )

  // -- Fetch demos first (needed for conflict detection) --
  const { data: allDemos } = await admin
    .from("dialer_leads")
    .select("id, business_name, owner_name, demo_date")
    .eq("demo_booked", true)
    .not("demo_date", "is", null)

  // Filter demos to today (in ET) and compute their ET time strings
  const todaysDemos: Array<{ id: string; title: string; timeStr: string; timeMins: number }> = []
  if (allDemos) {
    for (const demo of allDemos) {
      if (!demo.demo_date) continue
      const demoDate = new Date(demo.demo_date)
      // Compare using ET date (fixes UTC-vs-ET timezone bug)
      const demoDateStr = toETDateStr(demoDate)
      if (demoDateStr !== today) continue

      const timeStr = toETTimeStr(demoDate)
      const timeMins = timeToMins(timeStr) ?? 0

      todaysDemos.push({
        id: demo.id,
        title: `HFH Demo Call — ${demo.business_name ?? demo.owner_name ?? "Unknown"}`,
        timeStr,
        timeMins,
      })
    }
  }

  // -- 1. Standard daily blocks (weekdays only) --
  // Cold call block: 7:00 AM – 11:30 AM = 420–690 mins since midnight
  const COLD_CALL_START = 7 * 60      // 420
  const COLD_CALL_END   = 11 * 60 + 30 // 690

  if (isWeekday) {
    if (!existingAutoDaily) {
      for (const block of WEEKDAY_BLOCKS) {
        // Annotate cold calls block if a demo overlaps the window
        let blockTitle = block.title
        if (block.scheduled_time === "07:00:00") {
          const overlappingDemos = todaysDemos.filter(
            (d) => d.timeMins >= COLD_CALL_START && d.timeMins < COLD_CALL_END
          )
          if (overlappingDemos.length > 0) {
            const demoNotes = overlappingDemos.map((d) => {
              const [hh, mm] = d.timeStr.split(":")
              const h = parseInt(hh)
              const suffix = h >= 12 ? "PM" : "AM"
              const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
              return `demo at ${h12}${mm !== "00" ? `:${mm}` : ""} ${suffix}`
            })
            blockTitle = `Cold calls 7–11:30 AM (${demoNotes.join(", ")})`
          }
        }
        tasksToInsert.push({
          task_date: today,
          ...block,
          title: blockTitle,
        })
      }
    } else {
      // Blocks already exist — check if cold calls task needs a demo annotation update
      const coldCallTask = existingTasks?.find(
        (t) => t.source === "auto_daily" && t.scheduled_time === "07:00:00"
      )
      if (coldCallTask) {
        const overlappingDemos = todaysDemos.filter(
          (d) => d.timeMins >= COLD_CALL_START && d.timeMins < COLD_CALL_END
        )
        if (overlappingDemos.length > 0) {
          const demoNotes = overlappingDemos.map((d) => {
            const [hh, mm] = d.timeStr.split(":")
            const h = parseInt(hh)
            const suffix = h >= 12 ? "PM" : "AM"
            const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
            return `demo at ${h12}${mm !== "00" ? `:${mm}` : ""} ${suffix}`
          })
          const annotatedTitle = `Cold calls 7–11:30 AM (${demoNotes.join(", ")})`
          // Only update if title changed
          if (coldCallTask.title !== annotatedTitle) {
            await admin
              .from("daily_tasks")
              .update({ title: annotatedTitle })
              .eq("id", coldCallTask.id)
          }
        }
      }
    }
  }

  // -- 2. Gym block (every day) --
  if (!existingAutoGym) {
    tasksToInsert.push({
      task_date: today,
      ...GYM_BLOCK,
    })
  }

  // -- 3. HFH demo calls booked for today --
  for (const demo of todaysDemos) {
    if (existingDemoIds.has(demo.id)) continue
    tasksToInsert.push({
      task_date: today,
      title: demo.title,
      category: "HFH",
      scheduled_time: demo.timeStr,
      xp_value: 100,
      source: "auto_demo",
      source_id: demo.id,
    })
  }

  // -- 4. Squeegee jobs today --
  // appointment_date is a plain `date` column — no timezone conversion needed
  const { data: squeegeeJobs } = await admin
    .from("squeegee_jobs")
    .select("id, client_name, service_type, appointment_time")
    .eq("appointment_date", today)

  if (squeegeeJobs) {
    for (const job of squeegeeJobs) {
      if (existingSqueegeeIds.has(job.id)) continue
      tasksToInsert.push({
        task_date: today,
        title: `Squeegee Job — ${job.client_name ?? "Client"} (${job.service_type ?? "Service"})`,
        category: "SQUEEGEE",
        scheduled_time: job.appointment_time ?? null,
        xp_value: 50,
        source: "auto_squeegee",
        source_id: job.id,
      })
    }
  }

  // Insert new auto-generated tasks
  if (tasksToInsert.length > 0) {
    await admin.from("daily_tasks").insert(tasksToInsert)
  }

  // Fetch final list of today's tasks (after inserts)
  const { data: tasks, error } = await admin
    .from("daily_tasks")
    .select("*")
    .eq("task_date", today)
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total = tasks?.length ?? 0
  const completed = tasks?.filter((t) => t.completed).length ?? 0
  const totalXp = tasks?.reduce((sum, t) => sum + (t.completed ? t.xp_value : 0), 0) ?? 0

  return NextResponse.json({
    tasks: tasks ?? [],
    summary: { total, completed, totalXp },
    date: today,
  })
}
