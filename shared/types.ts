export type MovieStatus = "NOW_SHOWING" | "COMING_SOON" | "SPECIAL";

export type Movie = {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  posterUrl?: string;
  posterS3Key?: string;
  backdropUrl?: string;
  rating?: string;
  genre?: string;
  tmdbId?: number;
  status?: MovieStatus;
  releaseDate?: string;
  trailerUrl?: string;
  director?: string;
  cast?: string[];
  distributorSharePct?: number;
  lockedFields?: string[];
  isArchived?: boolean;
  archivedAt?: string;
  syncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Cinema = {
  id: string;
  name: string;
  address: string;
  city: string;
};

export type Screen = {
  id: string;
  cinemaId: string;
  name: string;
  rows: number;
  cols: number;
};

export type Showtime = {
  id: string;
  movieId: string;
  screenId: string;
  startsAt: string;
  price: number;
  isSpecial?: boolean;
};

export type BookingStatus = "PENDING" | "PAID" | "CONFIRMED" | "CANCELLED";

export type Booking = {
  id: string;
  showtimeId: string;
  userId: string;
  seats: string[];
  status: BookingStatus;
  /** Final amount charged (after voucher + gift card). */
  totalAmount: number;
  subtotalAmount?: number;
  discountAmount?: number;
  giftCardAmount?: number;
  voucherCode?: string;
  giftCardCode?: string;
  createdAt: string;
};

export type DiscountType = "PERCENT" | "FIXED";

export type Voucher = {
  code: string;
  name: string;
  discountType: DiscountType;
  value: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GiftCardStatus = "ACTIVE" | "LOCKED";

export type GiftCard = {
  code: string;
  balance: number;
  status: GiftCardStatus;
  issuedBy: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type GiftCardTxType = "ISSUE" | "REDEEM" | "ADJUST" | "LOCK" | "UNLOCK";

export type GiftCardTransaction = {
  id: string;
  giftCardCode: string;
  amount: number;
  type: GiftCardTxType;
  bookingId?: string;
  actor: string;
  note?: string;
  createdAt: string;
};

export type CheckoutFailureCode =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "WRONG_DAY"
  | "MIN_SEATS"
  | "LOCKED"
  | "INVALID_TYPE"
  | "INVALID_VALUE";

export type CheckoutQuote = {
  subtotalAmount: number;
  discountAmount: number;
  giftCardAmount: number;
  finalAmount: number;
  voucherCode?: string;
  giftCardCode?: string;
  voucherError?: { code: CheckoutFailureCode; message: string };
  giftCardError?: { code: CheckoutFailureCode; message: string };
};

export type Ticket = {
  id: string;
  bookingId: string;
  qrCode: string;
};

export type SeatLock = {
  showtimeId: string;
  seat: string;
  userId: string;
  expiresAt: number;
};

export type PaymentResult = {
  paymentId: string;
  status: "SUCCESS" | "FAILED";
  provider: "MOCK" | "VNPAY" | "MOMO";
  amount: number;
  userId: string;
};

export type AdminSettings = {
  cloudwatchDashboardUrl?: string;
  cloudwatchRumConsoleUrl?: string;
};

export type TrafficMetricPoint = { date: string; value: number };

export type TrafficMetrics = {
  from: string;
  to: string;
  summary: {
    pageViews: number;
    sessions: number;
    apiRequests: number;
    lambdaInvocations: number;
    lambdaErrors: number;
  };
  pageViewsByDay: TrafficMetricPoint[];
  apiRequestsByDay: TrafficMetricPoint[];
  lambdaInvocationsByDay: TrafficMetricPoint[];
  lambdaErrorsByDay: TrafficMetricPoint[];
};

export type RevenuePeriodRow = {
  period: string;
  total: number;
  bookings: number;
  tickets: number;
};

export type RevenueByMovieRow = {
  movieId: string;
  movieTitle: string;
  total: number;
  tickets: number;
  sharePct: number;
  distributorAmount: number;
};

export type RevenueByCinemaRow = {
  cinemaId: string;
  cinemaName: string;
  total: number;
  bookings: number;
  tickets: number;
};

export type RevenueReport = {
  from: string;
  to: string;
  groupBy: "day" | "week" | "month";
  summary: { total: number; bookings: number; tickets: number };
  byPeriod: RevenuePeriodRow[];
  byMovie: RevenueByMovieRow[];
  byCinema: RevenueByCinemaRow[];
};
