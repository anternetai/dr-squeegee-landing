import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    // Insert into Supabase
    const { error } = await getSupabase().from("vsl_submissions").insert({
      type,
      name: data.name || null,
      email: data.email || null,
      business_name: data.businessName || null,
      service_type: data.serviceType || null,
      service_area: data.serviceArea || null,
      current_leads: data.currentLeads || null,
      phone: data.phone || null,
      submitted_at: data.timestamp || new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase error:", error);
      // Still return success to not break UX - data logged to console
    }

    // Log for Vercel logs as backup
    console.log("VSL Submission:", { type, ...data });

    // TODO: Add Resend email to anthony@homefieldhub.com

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
