import type {
  CheckoutFailureCode,
  CheckoutQuote,
  GiftCard,
  Voucher,
} from "./types";

function fail(code: CheckoutFailureCode, message: string) {
  return { code, message };
}

export function validateVoucher(
  voucher: Voucher | null | undefined,
  nowIso = new Date().toISOString(),
  context?: { seatCount?: number }
): { ok: true; voucher: Voucher } | { ok: false; error: { code: CheckoutFailureCode; message: string } } {
  if (!voucher) return { ok: false, error: fail("NOT_FOUND", "Voucher code was not found.") };
  if (!voucher.isActive) return { ok: false, error: fail("INACTIVE", "This voucher is inactive.") };
  if (voucher.startsAt && nowIso < voucher.startsAt) {
    return { ok: false, error: fail("NOT_STARTED", "This voucher is not active yet.") };
  }
  if (voucher.endsAt && nowIso > voucher.endsAt) {
    return { ok: false, error: fail("EXPIRED", "This voucher has expired.") };
  }
  if (voucher.discountType !== "PERCENT" && voucher.discountType !== "FIXED") {
    return { ok: false, error: fail("INVALID_TYPE", "Unsupported voucher discount type.") };
  }
  if (!(voucher.value > 0)) {
    return { ok: false, error: fail("INVALID_VALUE", "Voucher value must be greater than zero.") };
  }
  if (voucher.code.toUpperCase() === "TUESDAY10") {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "short",
    }).format(new Date(nowIso));
    if (weekday !== "Tue") {
      return {
        ok: false,
        error: fail("WRONG_DAY", "Tuesday 10% Off is only valid on Tuesdays."),
      };
    }
  }
  if (voucher.code.toUpperCase() === "FAMILY4" && (context?.seatCount ?? 0) < 2) {
    return {
      ok: false,
      error: fail("MIN_SEATS", "Family Pack Discount requires at least 2 tickets."),
    };
  }
  return { ok: true, voucher };
}

export function validateGiftCard(
  card: GiftCard | null | undefined
): { ok: true; card: GiftCard } | { ok: false; error: { code: CheckoutFailureCode; message: string } } {
  if (!card) return { ok: false, error: fail("NOT_FOUND", "Gift card code was not found.") };
  if (card.status === "LOCKED") {
    return { ok: false, error: fail("LOCKED", "This gift card is locked by admin.") };
  }
  if (card.status !== "ACTIVE") {
    return { ok: false, error: fail("INACTIVE", "This gift card is inactive.") };
  }
  if (!(card.balance >= 0)) {
    return { ok: false, error: fail("INVALID_VALUE", "Gift card balance is invalid.") };
  }
  return { ok: true, card };
}

export function voucherDiscountAmount(voucher: Voucher, subtotal: number): number {
  if (!(subtotal > 0)) return 0;
  if (voucher.discountType === "PERCENT") {
    return Math.min(subtotal, Math.round(((subtotal * voucher.value) / 100) * 100) / 100);
  }
  return Math.min(subtotal, Math.round(voucher.value * 100) / 100);
}

export function computeCheckoutQuote(input: {
  subtotalAmount: number;
  voucher?: Voucher | null;
  giftCard?: GiftCard | null;
  voucherCode?: string;
  giftCardCode?: string;
  nowIso?: string;
  seatCount?: number;
}): CheckoutQuote {
  const subtotalAmount = Math.max(0, Math.round((input.subtotalAmount || 0) * 100) / 100);
  const quote: CheckoutQuote = {
    subtotalAmount,
    discountAmount: 0,
    giftCardAmount: 0,
    finalAmount: subtotalAmount,
  };

  const requestedVoucher = (input.voucherCode ?? "").trim().toUpperCase();
  if (requestedVoucher) {
    const checked = validateVoucher(input.voucher, input.nowIso, {
      seatCount: input.seatCount,
    });
    if (!checked.ok) {
      quote.voucherError = checked.error;
    } else {
      quote.voucherCode = checked.voucher.code.toUpperCase();
      quote.discountAmount = voucherDiscountAmount(checked.voucher, subtotalAmount);
    }
  }

  let remaining = Math.max(0, Math.round((subtotalAmount - quote.discountAmount) * 100) / 100);
  const requestedGift = (input.giftCardCode ?? "").trim().toUpperCase();
  if (requestedGift) {
    const checked = validateGiftCard(input.giftCard);
    if (!checked.ok) {
      quote.giftCardError = checked.error;
    } else {
      quote.giftCardCode = checked.card.code.toUpperCase();
      quote.giftCardAmount = Math.min(remaining, Math.round(checked.card.balance * 100) / 100);
      remaining = Math.max(0, Math.round((remaining - quote.giftCardAmount) * 100) / 100);
    }
  }

  quote.finalAmount = remaining;
  return quote;
}
