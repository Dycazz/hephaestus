import type { Metadata } from "next";
import { Syne, Instrument_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "hephaestus.work — Field Service Management",
  description: "Appointment scheduling, automated SMS reminders, and job management for field service businesses.",
};

function getCfEnv(): Record<string, string | undefined> {
  try {
    const cfCtx = (globalThis as Record<symbol, unknown>)[
      Symbol.for("__cloudflare-context__")
    ] as { env?: Record<string, string | undefined> } | undefined;
    return cfCtx?.env ?? {};
  } catch {
    return {};
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publicEnv = {
    NEXT_PUBLIC_SUPABASE_URL:
      getCfEnv().NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      getCfEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL:
      getCfEnv().NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  };
  const envScript = `window.__HEPH_ENV=${JSON.stringify(publicEnv).replace(
    /</g,
    "\\u003c"
  )};`;

  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${instrumentSans.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: envScript }} />
        {children}
      </body>
    </html>
  );
}
