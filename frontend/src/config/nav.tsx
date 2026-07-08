import type { ReactNode } from "react";

export type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

const iconProps = { width: 36, height: 36, viewBox: "0 0 48 48", fill: "currentColor" };

export const gvNav: NavItem[] = [
  {
    to: "/gold-class",
    label: "GOLD CLASS",
    icon: (
      <svg {...iconProps}>
        <text x="4" y="30" fontSize="14" fontWeight="900" fill="currentColor">
          GOLD
        </text>
      </svg>
    ),
  },
  {
    to: "/movies",
    label: "Movies",
    icon: (
      <svg {...iconProps}>
        <rect x="6" y="12" width="36" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M6 18h36M14 12V8h8v4M26 12V8h8v4" stroke="currentColor" strokeWidth="2" fill="none" />
        <polygon points="22,24 22,32 30,28" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: "/cinemas",
    label: "Cinemas",
    icon: (
      <svg {...iconProps}>
        <path d="M8 38V14l16-8 16 8v24H8z" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="24" cy="22" r="5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: "/buy-tickets",
    label: "Buy Tickets",
    icon: (
      <svg {...iconProps}>
        <rect x="8" y="14" width="32" height="22" rx="3" fill="url(#ticketGrad)" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="25" r="4" fill="#f5f5f5" />
        <circle cx="40" cy="25" r="4" fill="#f5f5f5" />
        <defs>
          <linearGradient id="ticketGrad" x1="8" y1="14" x2="40" y2="36">
            <stop offset="0%" stopColor="#f5d442" />
            <stop offset="100%" stopColor="#e8a317" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    to: "/dining",
    label: "Dining",
    icon: (
      <svg {...iconProps}>
        <ellipse cx="24" cy="30" rx="14" ry="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16 12v16M16 12c0 4 3 6 6 6M32 12v16M32 12c0 4-3 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M10 34h28" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    to: "/shop",
    label: "Shop Merchandise",
    icon: (
      <svg {...iconProps}>
        <path d="M12 18l4-8h16l4 8v20H12V18z" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M18 18c0-4 3-6 6-6s6 2 6 6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    to: "/promotions",
    label: "Promotions",
    icon: (
      <svg {...iconProps}>
        <rect x="10" y="20" width="28" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M24 20V12M18 12h12" stroke="currentColor" strokeWidth="2" />
        <path d="M24 12c-4 0-6 3-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    to: "/vouchers",
    label: "Movie Vouchers & Cards",
    icon: (
      <svg {...iconProps}>
        <rect x="6" y="16" width="30" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="12" width="30" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    to: "/group-bookings",
    label: "Group Bookings & Venue Hire",
    icon: (
      <svg {...iconProps}>
        <rect x="8" y="14" width="32" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="38" r="3" fill="currentColor" />
        <circle cx="24" cy="38" r="3" fill="currentColor" />
        <circle cx="32" cy="38" r="3" fill="currentColor" />
      </svg>
    ),
  },
];
