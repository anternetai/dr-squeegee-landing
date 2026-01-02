import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    // Save to Supabase
    const { error } = await supabase.from("vsl_submissions").insert({
      type, // 'watched_vsl' or 'new_lead'
      name: data.name,
      email: data.email,
      business_name: data.businessName || null,
      service_type: data.serviceType || null,
      service_area: data.serviceArea || null,
      current_leads: data.currentLeads || null,
      phone: data.phone || null,
      submitted_at: data.timestamp,
    });

    if (error) {
      console.error("Supabase error:", error);
      // Still return success - we don't want to break the UX
    }

    // TODO: Add email notification via Resend when configured
    // await resend.emails.send({
    //   from: 'HomeField Hub <notifications@homefieldhub.com>',
    //   to: 'your-email@example.com',
    //   subject: type === 'watched_vsl'
    //     ? `${data.name} watched the VSL`
    //     : `New lead: ${data.name} from ${data.businessName}`,
    //   html: `...`
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
