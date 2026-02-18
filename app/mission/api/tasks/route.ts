import { NextResponse } from "next/server"

const NOTION_TOKEN = process.env.NOTION_API_TOKEN
const NOTION_DB = process.env.NOTION_TODO_DB || "2d99cb3d-8484-8024-befa-f9e71640a5f6"

export async function GET() {
  if (!NOTION_TOKEN) {
    return NextResponse.json({ tasks: [], error: "No Notion token configured" })
  }

  try {
    const res = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_DB}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 100 }),
        next: { revalidate: 60 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ tasks: [], error: `Notion API error: ${res.status}` })
    }

    const data = await res.json()
    const tasks = data.results.map((page: any) => {
      const props = page.properties
      let title = ""
      let status = "Not started"
      let dueDate: string | null = null

      for (const [, v] of Object.entries(props) as any) {
        if (v.type === "title") {
          title = v.title?.map((t: any) => t.plain_text).join("") || ""
        }
        if (v.type === "status") {
          status = v.status?.name || "Not started"
        }
        if (v.type === "date" && v.date?.start) {
          dueDate = v.date.start
        }
      }

      return {
        id: page.id,
        title,
        status,
        dueDate,
        url: page.url,
        lastEdited: page.last_edited_time,
      }
    })

    return NextResponse.json({ tasks })
  } catch (err: any) {
    return NextResponse.json({ tasks: [], error: err.message })
  }
}
