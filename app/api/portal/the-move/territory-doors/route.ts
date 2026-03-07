import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const neighborhood = searchParams.get("neighborhood")

  const admin = getAdmin()

  if (neighborhood) {
    const { data, error } = await admin
      .from("territory_doors")
      .select("*")
      .eq("neighborhood", neighborhood)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // No neighborhood = return summary of all territories
  const { data, error } = await admin
    .from("territory_doors")
    .select("neighborhood, created_at, updated_at")
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by neighborhood
  const territories: Record<string, { name: string; total_doors: number; last_visited: string }> = {}
  for (const row of data) {
    const n = row.neighborhood
    if (!territories[n]) {
      territories[n] = { name: n, total_doors: 0, last_visited: row.updated_at }
    }
    territories[n].total_doors++
    if (row.updated_at > territories[n].last_visited) {
      territories[n].last_visited = row.updated_at
    }
  }

  return NextResponse.json(Object.values(territories))
}

export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { neighborhood, lat, lng } = body

  if (!neighborhood || lat == null || lng == null) {
    return NextResponse.json({ error: "neighborhood, lat, lng required" }, { status: 400 })
  }

  const admin = getAdmin()
  const { data, error } = await admin
    .from("territory_doors")
    .insert({ neighborhood, lat, lng })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
