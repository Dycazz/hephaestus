import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingPage from "./BookingPage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: link } = await supabase
    .from("booking_links")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!link) {
    return { title: "Booking Not Found" };
  }

  return {
    title: `Book ${link.business_name} - Appointment Scheduling`,
    description: `Schedule your ${link.business_name} appointment online`,
  };
}

export default async function BookingPortalPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  // Fetch booking link
  const { data: link, error } = await supabase
    .from("booking_links")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !link) {
    notFound();
  }

  // Increment view count (fire-and-forget)
  void supabase.rpc("increment_booking_link_views", { link_id: link.id }).then(() => {}, () => {});

  // Fetch services
  const { data: services } = await supabase
    .from("booking_services")
    .select("*")
    .eq("booking_link_id", link.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // Fetch availability
  const { data: availability } = await supabase
    .from("booking_availability")
    .select("*")
    .eq("booking_link_id", link.id)
    .eq("is_active", true);

  // Fetch overrides (next N days)
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + link.booking_window_days);

  const { data: overrides } = await supabase
    .from("booking_overrides")
    .select("*")
    .eq("booking_link_id", link.id)
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0]);

  return (
    <BookingPage
      link={link}
      services={services || []}
      availability={availability || []}
      overrides={overrides || []}
    />
  );
}
