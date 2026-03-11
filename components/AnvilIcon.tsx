import { SVGProps } from 'react'

/** Custom anvil SVG icon — drop-in replacement for lucide icons */
export function AnvilIcon({ className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Horn / beak pointing left */}
      <path d="M2 11 C2 9.5 3.5 8.5 5 9 L8 10" />
      {/* Top flat table */}
      <path d="M8 7 L20 7 L22 10 L22 12 L8 12 Z" />
      {/* Waist narrowing to base */}
      <path d="M9 12 L9 15 L15 15 L15 12" />
      {/* Base */}
      <rect x="7" y="15" width="10" height="3" rx="0.5" />
    </svg>
  )
}
