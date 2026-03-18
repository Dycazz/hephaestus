import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bookingSchema = z.object({
  bookingLinkId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  scheduledAt: z.string().datetime().optional(), // UTC ISO computed in browser
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().max(50).optional().or(z.literal("")),
  customerAddress: z.string().optional().or(z.literal("")),
  customerNotes: z.string().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = bookingSchema.parse(body);

    // Use service role to bypass RLS for public booking submissions
    const supabase = await createClient(true);

    // Fetch the booking link to verify it's active
    const { data: link, error: linkError } = await supabase
      .from("booking_links")
      .select("*")
      .eq("id", validatedData.bookingLinkId)
      .eq("is_active", true)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        { error: "Booking link not found or inactive" },
        { status: 404 }
      );
    }

    // Fetch service details if provided
    let serviceName = "General Service";
    let durationMinutes = link.slot_duration_minutes;

    if (validatedData.serviceId) {
      const { data: service } = await supabase
        .from("booking_services")
        .select("name, duration_minutes")
        .eq("id", validatedData.serviceId)
        .single();

      if (service) {
        serviceName = service.name;
        durationMinutes = service.duration_minutes;
      }
    }

    // Create the portal booking record (for analytics / portal tracking)
    const { data: booking, error: bookingError } = await supabase
      .from("portal_bookings")
      .insert({
        booking_link_id: validatedData.bookingLinkId,
        customer_name: validatedData.customerName,
        customer_email: validatedData.customerEmail || null,
        customer_phone: validatedData.customerPhone || null,
        customer_address: validatedData.customerAddress || null,
        customer_notes: validatedData.customerNotes || null,
        service_id: validatedData.serviceId || null,
        scheduled_date: validatedData.date,
        scheduled_time: validatedData.time,
        duration_minutes: durationMinutes,
        status: "pending",
        utm_source: request.nextUrl.searchParams.get("utm_source") || null,
        utm_medium: request.nextUrl.searchParams.get("utm_medium") || null,
        utm_campaign: request.nextUrl.searchParams.get("utm_campaign") || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking error:", bookingError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    // ── Mirror to appointments table so it shows on the dashboard ──────────

    // Find or create a client record
    let clientId: string | null = null;
    const phone = validatedData.customerPhone || null;

    if (phone) {
      // Try to match an existing client by phone within this org
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("org_id", link.org_id)
        .eq("phone", phone)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({
            org_id: link.org_id,
            name: validatedData.customerName,
            phone,
            email: validatedData.customerEmail || null,
            address: validatedData.customerAddress || null,
          })
          .select("id")
          .single();
        clientId = newClient?.id ?? null;
      }
    } else {
      // No phone — create a fresh client using booking ID as a unique phone placeholder
      const { data: newClient } = await supabase
        .from("clients")
        .insert({
          org_id: link.org_id,
          name: validatedData.customerName,
          phone: `portal:${booking.id.slice(0, 8)}`,
          email: validatedData.customerEmail || null,
          address: validatedData.customerAddress || null,
        })
        .select("id")
        .single();
      clientId = newClient?.id ?? null;
    }

    // Insert the appointment so it appears on the dashboard.
    // Prefer the browser-computed UTC timestamp (scheduledAt) which correctly
    // reflects the customer's local timezone. Fall back to treating date+time as UTC.
    const scheduledAt = validatedData.scheduledAt ?? `${validatedData.date}T${validatedData.time}:00Z`;
    const { error: apptError } = await supabase
      .from("appointments")
      .insert({
        org_id: link.org_id,
        client_id: clientId,
        technician_id: null,
        service: serviceName,
        service_icon: "📅",
        service_color: link.accent_color || "#d97706",
        scheduled_at: scheduledAt,
        status: "scheduled",
        address: validatedData.customerAddress || null,
        prep_checklist: [],
        duration_minutes: durationMinutes,
        notes: validatedData.customerNotes || null,
      });

    if (apptError) {
      // Non-fatal: portal booking was already saved; just log the error
      console.error("Failed to mirror portal booking to appointments:", apptError);
    }

    // ───────────────────────────────────────────────────────────────────────

    // Increment booking count on the link (fire-and-forget)
    void supabase
      .rpc("increment_booking_link_bookings", { link_id: validatedData.bookingLinkId })
      .then(() => {}, () => {});

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      serviceName,
      date: validatedData.date,
      time: validatedData.time,
      customerName: validatedData.customerName,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
