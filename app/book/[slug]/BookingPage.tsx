"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  Phone,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import type {
  BookingLink,
  BookingService,
  BookingAvailability,
  BookingOverride,
} from "@/types";

// Steps in the booking flow
type BookingStep = "service" | "datetime" | "details" | "confirm" | "success" | "waitlist";

interface BookingPageProps {
  link: BookingLink;
  services: BookingService[];
  availability: BookingAvailability[];
  overrides: BookingOverride[];
}

// Default Mon–Fri 9am–5pm schedule used when none is configured
const DEFAULT_AVAILABILITY: BookingAvailability[] = [1, 2, 3, 4, 5].map((day) => ({
  id: '',
  booking_link_id: '',
  day_of_week: day,
  start_time: '09:00',
  end_time: '17:00',
  is_active: true,
}))

// Generate available dates within the booking window
function getAvailableDates(
  link: BookingLink,
  availability: BookingAvailability[],
  overrides: BookingOverride[]
): Date[] {
  const schedule = availability.length > 0 ? availability : DEFAULT_AVAILABILITY
  const dates: Date[] = [];
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + link.booking_window_days);

  // Create override lookup
  const overrideMap = new Map<string, BookingOverride>();
  overrides.forEach((o) => {
    overrideMap.set(o.date, o);
  });

  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const override = overrideMap.get(dateStr);

    // Skip if explicitly blocked
    if (override && !override.is_available) continue;

    // Check if there's availability on this day
    const dayOfWeek = d.getDay();
    const dayAvailability = schedule.filter((a) => a.day_of_week === dayOfWeek);

    if (dayAvailability.length > 0 || (override && override.is_available)) {
      dates.push(new Date(d));
    }
  }

  return dates;
}

// Generate time slots for a specific date
function getTimeSlots(
  date: Date,
  link: BookingLink,
  availability: BookingAvailability[],
  overrides: BookingOverride[],
  bookedSlots: { date: string; time: string }[]
): { time: string; available: boolean }[] {
  const slots: { time: string; available: boolean }[] = [];
  const dayOfWeek = date.getDay();
  const dateStr = date.toISOString().split("T")[0];

  const override = overrides.find((o) => o.date === dateStr);
  const schedule = availability.length > 0 ? availability : DEFAULT_AVAILABILITY;
  const dayAvailability = schedule.filter((a) => a.day_of_week === dayOfWeek);

  // Check what's already booked
  const bookedTimes = new Set(
    bookedSlots
      .filter((b) => b.date === dateStr)
      .map((b) => b.time)
  );

  // If override with special hours
  if (override?.is_available && override.start_time && override.end_time) {
    const start = parseInt(override.start_time.replace(":", ""));
    const end = parseInt(override.end_time.replace(":", ""));
    for (let t = start; t < end; t += link.slot_duration_minutes) {
      const hour = Math.floor(t / 60);
      const minute = t % 60;
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push({
        time: timeStr,
        available: !bookedTimes.has(timeStr),
      });
    }
  } else {
    // Regular availability
    dayAvailability.forEach((a) => {
      const startHour = parseInt(a.start_time.split(":")[0]);
      const startMin = parseInt(a.start_time.split(":")[1]);
      const endHour = parseInt(a.end_time.split(":")[0]);
      const endMin = parseInt(a.end_time.split(":")[1]);

      let currentHour = startHour;
      let currentMin = startMin;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMin < endMin)
      ) {
        const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
        slots.push({
          time: timeStr,
          available: !bookedTimes.has(timeStr),
        });

        currentMin += link.slot_duration_minutes;
        if (currentMin >= 60) {
          currentHour += 1;
          currentMin = 0;
        }
      }
    });
  }

  return slots;
}

export default function BookingPage({
  link,
  services,
  availability,
  overrides,
}: BookingPageProps) {
  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    bookingId: string;
    date: string;
    time: string;
    serviceName: string;
  } | null>(null);

  const availableDates = useMemo(
    () => getAvailableDates(link, availability, overrides),
    [link, availability, overrides]
  );

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return getTimeSlots(selectedDate, link, availability, overrides, []);
  }, [selectedDate, link, availability, overrides]);

  const handleServiceSelect = (service: BookingService) => {
    setSelectedService(service);
    setStep("datetime");
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      setError("Please complete all required fields");
      return;
    }

    if (!customerName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (link.require_customer_email && !customerEmail.trim()) {
      setError("Please enter your email");
      return;
    }

    if (link.require_customer_phone && !customerPhone.trim()) {
      setError("Please enter your phone number");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build a proper UTC ISO timestamp from the local date + time the customer picked.
      // Using new Date(y, m, d, h, min) gives a local-time Date so .toISOString() is
      // the correct UTC equivalent — avoiding the timezone-shift bug from naive strings.
      const dateStr = selectedDate.toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time
      const [y, mo, dy] = dateStr.split("-").map(Number);
      const [h, min] = selectedTime.split(":").map(Number);
      const scheduledAt = new Date(y, mo - 1, dy, h, min, 0).toISOString();

      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingLinkId: link.id,
          serviceId: selectedService.id,
          date: dateStr,
          time: selectedTime,
          scheduledAt,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerNotes: customerNotes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      setSuccessData({
        bookingId: data.bookingId,
        date: selectedDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: selectedTime,
        serviceName: selectedService.name,
      });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaitlistSubmit = async () => {
    if (!customerName.trim()) {
      setError("Please enter your name");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingLinkId: link.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          serviceId: selectedService?.id,
          notes: customerNotes.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join waitlist");
      }

      setSuccessData({
        bookingId: "WAITLIST",
        date: "Waitlist",
        time: "N/A",
        serviceName: selectedService?.name || "General Service",
      });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("service");
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerNotes("");
    setError(null);
    setSuccessData(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // ========================================
  // RENDER: Success Step
  // ========================================
  if (step === "success" && successData) {
    return (
      <div
        className="booking-portal min-h-screen"
        style={{ background: link.background_color, color: link.text_color }}
      >
        <div className="container" style={{ paddingTop: "4rem" }}>
          <div
            className="card text-center animate-fadeIn"
            style={{ maxWidth: "450px", margin: "0 auto" }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(52, 211, 153, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <Check size={40} style={{ color: "#34d399" }} />
            </div>

            <h2 style={{ marginBottom: "0.5rem" }}>
              {successData.bookingId === "WAITLIST" ? "Joined Waitlist!" : "Booking Confirmed!"}
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              {successData.bookingId === "WAITLIST" 
                ? "We'll notify you if a spot opens up."
                : "We'll be in touch to confirm your appointment."}
            </p>

            <div
              style={{
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-lg)",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                textAlign: "left",
              }}
            >
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Service</p>
              <p style={{ fontWeight: 600, marginBottom: "1rem" }}>{successData.serviceName}</p>

              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Status</p>
              <p style={{ fontWeight: 600, marginBottom: "1rem" }}>
                {successData.bookingId === "WAITLIST" ? "On Waiting List" : "Confirmed"}
              </p>

              {successData.bookingId !== "WAITLIST" && (
                <>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Date &amp; Time</p>
                  <p style={{ fontWeight: 600, marginBottom: "1rem" }}>
                    {successData.date}
                    <br />
                    {formatTime(successData.time)}
                  </p>
                </>
              )}

              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Reference</p>
              <p style={{ fontWeight: 600, fontFamily: "monospace" }}>
                {successData.bookingId === "WAITLIST" 
                  ? "W-" + Math.random().toString(36).substring(7).toUpperCase()
                  : "#" + successData.bookingId.slice(0, 8).toUpperCase()}
              </p>
            </div>

            {link.business_phone && (
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Questions? Call{" "}
                <a href={`tel:${link.business_phone}`} style={{ color: link.accent_color }}>
                  {link.business_phone}
                </a>
              </p>
            )}

            <button onClick={handleReset} className="btn btn-secondary w-full mt-lg">
              Book Another Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: Main Booking Flow
  // ========================================
  return (
    <div
      className="booking-portal min-h-screen"
      style={{ background: link.background_color, color: link.text_color }}
    >
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", padding: "1rem 0" }}>
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {link.business_logo_url ? (
                <Image
                  src={link.business_logo_url}
                  alt={link.business_name}
                  width={40}
                  height={40}
                  className="rounded-lg"
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    background: link.accent_color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "1.25rem",
                  }}
                >
                  {link.business_name.charAt(0)}
                </div>
              )}
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                {link.business_name}
              </span>
            </div>
            {link.business_phone && (
              <a
                href={`tel:${link.business_phone}`}
                className="btn btn-ghost"
                style={{ fontSize: "0.875rem" }}
              >
                <Phone size={16} />
                {link.business_phone}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="container" style={{ paddingTop: "2rem" }}>
        {/* Progress indicator */}
        <div className="flex items-center gap-sm mb-xl" style={{ fontSize: "0.875rem" }}>
          {(["service", "datetime", "details", "confirm"] as const).map((s, i, arr) => (
            <>
              <span
                key={s}
                style={{
                  color: step === s || (i < arr.indexOf(step as typeof s)) ? link.accent_color : "var(--text-muted)",
                  fontWeight: step === s ? 600 : 400,
                }}
              >
                {s === "service" ? "Service" : s === "datetime" ? "Date & Time" : s === "details" ? "Your Details" : "Confirm"}
              </span>
              {i < arr.length - 1 && (
                <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
              )}
            </>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message mb-lg flex items-center gap-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* ======================================== */}
        {/* STEP 1: Select Service */}
        {/* ======================================== */}
        {step === "service" && (
          <div className="animate-fadeIn">
            <h2 style={{ marginBottom: "0.5rem" }}>Select a Service</h2>
            <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              Choose the type of service you need
            </p>

            <div className="flex flex-col gap-md">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="card flex items-center justify-between"
                  style={{ cursor: "pointer", textAlign: "left" }}
                >
                  <div>
                    <h4 style={{ marginBottom: "0.25rem" }}>{service.name}</h4>
                    {service.description && (
                      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        {service.description}
                      </p>
                    )}
                    <div
                      className="flex items-center gap-md mt-sm"
                      style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}
                    >
                      <span className="flex items-center gap-xs">
                        <Clock size={14} />
                        {service.duration_minutes} min
                      </span>
                      {link.show_pricing && service.price_cents > 0 && (
                        <span>${(service.price_cents / 100).toFixed(2)}</span>
                      )}
                      {link.show_pricing && service.price_cents === 0 && (
                        <span>Contact for pricing</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                </button>
              ))}

              {services.length === 0 && (
                <div className="card text-center">
                  <p style={{ color: "var(--text-secondary)" }}>
                    No services available. Please contact us directly.
                  </p>
                  {link.business_phone && (
                    <a href={`tel:${link.business_phone}`} className="btn btn-primary mt-md">
                      Call {link.business_phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================== */}
        {/* STEP 2: Select Date & Time */}
        {/* ======================================== */}
        {(step === "datetime" || step === "details") && (
          <div className="animate-fadeIn">
            <button
              onClick={() => setStep("service")}
              className="btn btn-ghost mb-md"
              style={{ marginLeft: "-0.5rem" }}
            >
              <ArrowLeft size={18} />
              Back to services
            </button>

            <h2 style={{ marginBottom: "0.5rem" }}>Choose Date &amp; Time</h2>
            <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              {selectedService?.name}
            </p>

            <div className="flex flex-col gap-lg">
              {/* Date Selection */}
              <div>
                <label className="mb-sm block" style={{ color: "var(--text-secondary)" }}>
                  <Calendar size={16} className="inline mr-1" />
                  Select a Date
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                    gap: "0.5rem",
                  }}
                >
                  {availableDates.slice(0, 14).map((date) => {
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => handleDateSelect(date)}
                        className="card"
                        style={{
                          cursor: "pointer",
                          padding: "0.75rem",
                          textAlign: "center",
                          borderColor: isSelected ? link.accent_color : "var(--border-light)",
                          background: isSelected ? `${link.accent_color}15` : "transparent",
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                          {date.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: 600,
                            color: isSelected ? link.accent_color : "var(--text)",
                          }}
                        >
                          {date.getDate()}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {date.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <label className="mb-sm block" style={{ color: "var(--text-secondary)" }}>
                    <Clock size={16} className="inline mr-1" />
                    Available Times
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                      gap: "0.5rem",
                    }}
                  >
                    {timeSlots
                      .filter((slot) => slot.available)
                      .map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            onClick={() => handleTimeSelect(slot.time)}
                            className="card"
                            style={{
                              cursor: "pointer",
                              padding: "0.75rem",
                              textAlign: "center",
                              borderColor: isSelected ? link.accent_color : "var(--border-light)",
                              background: isSelected ? `${link.accent_color}15` : "transparent",
                              color: isSelected ? link.accent_color : "var(--text)",
                              fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            {formatTime(slot.time)}
                          </button>
                        );
                      })}

                    {timeSlots.filter((s) => s.available).length === 0 && (
                      <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem 0" }}>
                        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
                          No available times for this date
                        </p>
                        <button 
                          onClick={() => setStep("waitlist")}
                          className="btn btn-secondary"
                          style={{ borderColor: link.accent_color, color: link.accent_color }}
                        >
                          Join Waitlist for this Day
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {availableDates.length > 0 && selectedDate && timeSlots.filter(s => s.available).length > 0 && (
              <div className="mt-xl text-center">
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                  Can&apos;t find a time that works?
                </p>
                <button 
                  onClick={() => setStep("waitlist")}
                  style={{ color: link.accent_color, fontSize: "0.875rem", fontWeight: 600, textDecoration: "underline" }}
                >
                  Join our general waitlist
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================== */}
        {/* STEP: Waitlist Form */}
        {/* ======================================== */}
        {step === "waitlist" && (
          <div className="animate-fadeIn">
            <button
              onClick={() => setStep(selectedDate ? "datetime" : "service")}
              className="btn btn-ghost mb-md"
              style={{ marginLeft: "-0.5rem" }}
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <h2 style={{ marginBottom: "0.5rem" }}>Join the Waitlist</h2>
            <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              We&apos;ll notify you immediately if a spot opens up for {selectedService?.name || "our services"}.
            </p>

            <div className="flex flex-col gap-md">
              <div>
                <label htmlFor="waitlistName">Name *</label>
                <input
                  id="waitlistName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="waitlistPhone">Phone *</label>
                <input
                  id="waitlistPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              <div>
                <label htmlFor="waitlistEmail">Email</label>
                <input
                  id="waitlistEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="waitlistAddress">Address</label>
                <input
                  id="waitlistAddress"
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Service address"
                />
              </div>

              <div>
                <label htmlFor="waitlistNotes">Preferred Day/Times or Notes</label>
                <textarea
                  id="waitlistNotes"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="e.g. afternoons work best, or any day next week..."
                  rows={3}
                />
              </div>

              <button
                onClick={handleWaitlistSubmit}
                className="btn btn-primary w-full mt-md"
                disabled={isSubmitting || !customerName.trim() || !customerPhone.trim()}
                style={{ background: link.accent_color }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======================================== */}
        {/* STEP 3: Customer Details */}
        {/* ======================================== */}
        {step === "details" && (
          <div className="animate-fadeIn" style={{ marginTop: "2rem" }}>
            <button
              onClick={() => setStep("datetime")}
              className="btn btn-ghost mb-md"
              style={{ marginLeft: "-0.5rem" }}
            >
              <ArrowLeft size={18} />
              Back to date selection
            </button>

            <h2 style={{ marginBottom: "0.5rem" }}>Your Details</h2>
            <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              {selectedService?.name} on{" "}
              {selectedDate?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              at {selectedTime && formatTime(selectedTime)}
            </p>

            <div className="flex flex-col gap-md">
              <div>
                <label htmlFor="customerName">Name *</label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              {link.require_customer_email && (
                <div>
                  <label htmlFor="customerEmail">Email *</label>
                  <input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              )}

              {link.require_customer_phone && (
                <div>
                  <label htmlFor="customerPhone">Phone *</label>
                  <input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="customerAddress">Address</label>
                <input
                  id="customerAddress"
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Service address (if different)"
                />
              </div>

              <div>
                <label htmlFor="customerNotes">Notes</label>
                <textarea
                  id="customerNotes"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Any special instructions or details..."
                  rows={3}
                />
              </div>

              <button
                onClick={() => setStep("confirm")}
                className="btn btn-primary w-full mt-md"
                disabled={!customerName.trim()}
                style={{ background: link.accent_color }}
              >
                Continue to Confirmation
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================== */}
        {/* STEP 4: Confirmation */}
        {/* ======================================== */}
        {step === "confirm" && (
          <div className="animate-fadeIn">
            <button
              onClick={() => setStep("details")}
              className="btn btn-ghost mb-md"
              style={{ marginLeft: "-0.5rem" }}
            >
              <ArrowLeft size={18} />
              Back to details
            </button>

            <h2 style={{ marginBottom: "0.5rem" }}>Confirm Booking</h2>
            <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              Please review your appointment
            </p>

            <div className="card mb-lg" style={{ background: "var(--bg-tertiary)", border: "none" }}>
              <div className="flex flex-col gap-md">
                <div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Service
                  </p>
                  <p style={{ fontWeight: 600 }}>{selectedService?.name}</p>
                </div>

                <div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Date &amp; Time
                  </p>
                  <p style={{ fontWeight: 600 }}>
                    {selectedDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    <br />
                    {selectedTime && formatTime(selectedTime)}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Your Information
                  </p>
                  <p style={{ fontWeight: 600 }}>{customerName}</p>
                  {customerEmail && (
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{customerEmail}</p>
                  )}
                  {customerPhone && (
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{customerPhone}</p>
                  )}
                  {customerAddress && (
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      {customerAddress}
                    </p>
                  )}
                </div>

                {customerNotes && (
                  <div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                      Notes
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{customerNotes}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="btn btn-primary w-full"
              disabled={isSubmitting}
              style={{
                background: link.accent_color,
                boxShadow: `0 4px 20px ${link.accent_color}40`,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-pulse" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "1.5rem 0", marginTop: "3rem" }}>
        <div className="container text-center">
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            Powered by{" "}
            <span style={{ color: link.accent_color }}>hephaestus.work</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
