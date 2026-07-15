import { computeCheckoutQuote } from "../../../shared/checkout.ts";
import type { Booking, CheckoutQuote, GiftCard, GiftCardTransaction, Voucher } from "../../../shared/types.ts";
import { createId, db } from "./mockStore.ts";

export function findVoucher(code?: string) {
  const key = (code ?? "").trim().toUpperCase();
  if (!key) return null;
  return db.vouchers.find((v) => v.code.toUpperCase() === key) ?? null;
}

export function findGiftCard(code?: string) {
  const key = (code ?? "").trim().toUpperCase();
  if (!key) return null;
  return db.giftCards.find((c) => c.code.toUpperCase() === key) ?? null;
}

export function activePromotions() {
  const nowIso = new Date().toISOString();
  return db.vouchers
    .filter((v) => v.isActive && nowIso >= v.startsAt && nowIso <= v.endsAt)
    .map((v) => ({ ...v }));
}

export function quoteCheckout(input: {
  subtotalAmount: number;
  voucherCode?: string;
  giftCardCode?: string;
  seatCount?: number;
}): CheckoutQuote {
  return computeCheckoutQuote({
    subtotalAmount: input.subtotalAmount,
    voucherCode: input.voucherCode,
    giftCardCode: input.giftCardCode,
    voucher: findVoucher(input.voucherCode),
    giftCard: findGiftCard(input.giftCardCode),
    seatCount: input.seatCount,
  });
}

export function quoteHasBlockingErrors(quote: CheckoutQuote) {
  return Boolean(quote.voucherError || quote.giftCardError);
}

export function applyGiftCardRedeem(booking: Booking, actor: string) {
  if (!booking.giftCardCode || !(booking.giftCardAmount && booking.giftCardAmount > 0)) return;
  const card = findGiftCard(booking.giftCardCode);
  if (!card) return;
  // Idempotent: if REDEEM for booking already exists, skip.
  const existed = db.giftCardTxs.some(
    (tx) => tx.bookingId === booking.id && tx.type === "REDEEM" && tx.giftCardCode === card.code
  );
  if (existed) return;
  card.balance = Math.max(0, Math.round((card.balance - booking.giftCardAmount) * 100) / 100);
  card.updatedAt = new Date().toISOString();
  const tx: GiftCardTransaction = {
    id: createId("gtx"),
    giftCardCode: card.code,
    amount: booking.giftCardAmount,
    type: "REDEEM",
    bookingId: booking.id,
    actor,
    note: "Checkout redemption",
    createdAt: new Date().toISOString(),
  };
  db.giftCardTxs.push(tx);
}

export function normalizeVoucherInput(body: Record<string, unknown>, existing?: Voucher): Voucher {
  const code = String(body.code ?? existing?.code ?? "")
    .trim()
    .toUpperCase();
  const nowIso = new Date().toISOString();
  return {
    code,
    name: String(body.name ?? existing?.name ?? code),
    discountType: (body.discountType as Voucher["discountType"]) ?? existing?.discountType ?? "PERCENT",
    value: Number(body.value ?? existing?.value ?? 0),
    startsAt: String(body.startsAt ?? existing?.startsAt ?? nowIso),
    endsAt: String(body.endsAt ?? existing?.endsAt ?? "2099-12-31T23:59:59.000Z"),
    isActive: body.isActive == null ? (existing?.isActive ?? true) : Boolean(body.isActive),
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}

export function issueGiftCard(input: {
  code?: string;
  balance: number;
  issuedBy: string;
  note?: string;
}): GiftCard {
  const nowIso = new Date().toISOString();
  const code = (input.code?.trim() || createId("GIFT")).toUpperCase().replace(/^GIFT_/, "GIFT");
  const card: GiftCard = {
    code,
    balance: Math.max(0, Math.round(input.balance * 100) / 100),
    status: "ACTIVE",
    issuedBy: input.issuedBy,
    note: input.note,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  db.giftCards.push(card);
  db.giftCardTxs.push({
    id: createId("gtx"),
    giftCardCode: card.code,
    amount: card.balance,
    type: "ISSUE",
    actor: input.issuedBy,
    note: input.note ?? "Issued",
    createdAt: nowIso,
  });
  return card;
}
