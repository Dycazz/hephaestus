import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const date = searchParams.get("date");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch booking link
    const { data: link, error: linkError } = await supabase
      .from("booking_links")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: "Booking link not found" }, { status: 404 });
    }

    // If date provided, return available slots for that date
    if (date) {
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();

      // Get availability for this day
      const { data: availability } = await supabase
        .from("booking_availability")
        .select("*")
        .eq("booking_link_id", link.id)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      // Get override for this date
      const { data: override } = await supabase
        .from("booking_overrides")
        .select("*")
        .eq("booking_link_id", link.id)
        .eq("date", date)
        .single();

      // Get already booked slots
      const { data: bookings } = await supabase
        .from("portal_bookings")
        .select("scheduled_time")
        .eq("booking_link_id", link.id)
        .eq("scheduled_date", date)
        .in("status", ["pending", "confirmed"]);

      const bookedTimes = new Set(bookings?.map((b) => b.scheduled_time) || []);

      // Generate slots
      const slots: { time: string; available: boolean }[] = [];

      if (override?.is_available && override.start_time && override.end_time) {
        // Special hours
        const start = parseInt(override.start_time.replace(":", ""));
        const end = parseInt(override.end_time.replace(":", ""));
        for (let t = start; t < end; t += link.slot_duration_minutes) {
          const hour = Math.floor(t / 60);
          const minute = t % 60;
          const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          slots.push({ time: timeStr, available: !bookedTimes.has(timeStr) });
        }
      } else if (availability && availability.length > 0) {
        // Regular hours
        availability.forEach((a) => {
          const startHour = parseInt(a.start_time.split(":")[0]);
          const startMin = parseInt(a.start_time.split(":")[1]);
          const endHour = parseInt(a.end_time.split(":")[0]);
          const endMin = parseInt(a.end_time.split(":")[1]);

          let currentHour = startHour;
          let currentMin = startMin;

          while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
            const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
            slots.push({ time: timeStr, available: !bookedTimes.has(timeStr) });

            currentMin += link.slot_duration_minutes;
            if (currentMin >= 60) {
              currentHour += 1;
              currentMin = 0;
            }
          }
        });
      }

      return NextResponse.json({ link, slots, override });
    }

    // Otherwise, return basic link info
    return NextResponse.json({ link });
  } catch (error) {
    console.error("Availability API error:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
