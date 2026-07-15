import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { computeCheckoutQuote } from "../../../shared/checkout";
import type {
  Booking,
  CheckoutQuote,
  GiftCard,
  GiftCardTransaction,
  Voucher,
} from "../../../shared/types";

const TABLE = process.env.STORE_TABLE_NAME ?? "";
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const PK = {
  VOUCHER: "VOUCHER",
  GIFTCARD: "GIFTCARD",
  GIFTCARD_TX: "GIFTCARD_TX",
  META: "META",
} as const;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getItem<T>(pk: string, sk: string): Promise<T | null> {
  const res = await doc.send(new GetCommand({ TableName: TABLE, Key: { pk, sk } }));
  return (res.Item?.data as T) ?? null;
}

async function putItem(pk: string, sk: string, data: unknown, extra?: Record<string, unknown>) {
  await doc.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk, sk, data, ...extra },
    })
  );
}

async function listByPk<T>(pk: string): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of res.Items ?? []) items.push(item.data as T);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

export async function listVouchers() {
  return listByPk<Voucher>(PK.VOUCHER);
}

export async function getVoucher(code: string) {
  return getItem<Voucher>(PK.VOUCHER, code.trim().toUpperCase());
}

export async function listActivePromotions() {
  const nowIso = new Date().toISOString();
  const items = await listVouchers();
  return items.filter((v) => v.isActive && nowIso >= v.startsAt && nowIso <= v.endsAt);
}

export async function putVoucher(voucher: Voucher) {
  const code = voucher.code.trim().toUpperCase();
  const saved = { ...voucher, code };
  await putItem(PK.VOUCHER, code, saved);
  return saved;
}

export async function deleteVoucher(code: string) {
  await doc.send(
    new DeleteCommand({ TableName: TABLE, Key: { pk: PK.VOUCHER, sk: code.trim().toUpperCase() } })
  );
}

export async function listGiftCards() {
  return listByPk<GiftCard>(PK.GIFTCARD);
}

export async function getGiftCard(code: string) {
  return getItem<GiftCard>(PK.GIFTCARD, code.trim().toUpperCase());
}

export async function putGiftCard(card: GiftCard) {
  const code = card.code.trim().toUpperCase();
  const saved = { ...card, code };
  await putItem(PK.GIFTCARD, code, saved);
  return saved;
}

export async function addGiftCardTx(tx: GiftCardTransaction) {
  await putItem(PK.GIFTCARD_TX, `${tx.giftCardCode}#${tx.createdAt}#${tx.id}`, tx, {
    giftCardCode: tx.giftCardCode,
  });
}

export async function listGiftCardHistory(code: string) {
  const all = await listByPk<GiftCardTransaction>(PK.GIFTCARD_TX);
  return all
    .filter((tx) => tx.giftCardCode.toUpperCase() === code.trim().toUpperCase())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function quoteForCheckout(input: {
  subtotalAmount: number;
  voucherCode?: string;
  giftCardCode?: string;
  seatCount?: number;
}): Promise<CheckoutQuote> {
  const voucher = input.voucherCode ? await getVoucher(input.voucherCode) : null;
  const giftCard = input.giftCardCode ? await getGiftCard(input.giftCardCode) : null;
  return computeCheckoutQuote({
    subtotalAmount: input.subtotalAmount,
    voucherCode: input.voucherCode,
    giftCardCode: input.giftCardCode,
    voucher,
    giftCard,
    seatCount: input.seatCount,
  });
}

export function quoteHasBlockingErrors(quote: CheckoutQuote) {
  return Boolean(quote.voucherError || quote.giftCardError);
}

export async function redeemGiftCardForBooking(booking: Booking, actor: string) {
  if (!booking.giftCardCode || !(booking.giftCardAmount && booking.giftCardAmount > 0)) return;
  const history = await listGiftCardHistory(booking.giftCardCode);
  if (history.some((tx) => tx.bookingId === booking.id && tx.type === "REDEEM")) return;
  const card = await getGiftCard(booking.giftCardCode);
  if (!card) return;
  card.balance = Math.max(0, Math.round((card.balance - booking.giftCardAmount) * 100) / 100);
  card.updatedAt = new Date().toISOString();
  await putGiftCard(card);
  await addGiftCardTx({
    id: createId("gtx"),
    giftCardCode: card.code,
    amount: booking.giftCardAmount,
    type: "REDEEM",
    bookingId: booking.id,
    actor,
    note: "Checkout redemption",
    createdAt: new Date().toISOString(),
  });
}

/** Bump when the demo voucher set changes so existing deployments migrate. */
const COMMERCE_SEED_VERSION = 2;

export async function ensureCommerceSeeded() {
  const meta = await getItem<{ seeded: boolean; version?: number }>(PK.META, "COMMERCE_SEEDED");
  if (meta?.seeded && (meta.version ?? 1) >= COMMERCE_SEED_VERSION) return;
  const nowIso = new Date().toISOString();
  const vouchers: Voucher[] = [
    {
      code: "TUESDAY10",
      name: "Tuesday 10% Off",
      discountType: "PERCENT",
      value: 10,
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      code: "FAMILY4",
      name: "Family Pack Discount",
      discountType: "FIXED",
      value: 4,
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
  // Only create missing vouchers so admin edits survive migrations.
  for (const v of vouchers) {
    if (!(await getVoucher(v.code))) await putVoucher(v);
  }
  // v2: the STUDENT demo voucher was retired.
  if (await getVoucher("STUDENT")) await deleteVoucher("STUDENT");

  if (!(await getGiftCard("GIFT100"))) {
    const card: GiftCard = {
      code: "GIFT100",
      balance: 100,
      status: "ACTIVE",
      issuedBy: "admin-seed",
      note: "Demo gift card",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putGiftCard(card);
    await addGiftCardTx({
      id: createId("gtx"),
      giftCardCode: card.code,
      amount: 100,
      type: "ISSUE",
      actor: "admin-seed",
      createdAt: nowIso,
    });
  }
  await putItem(PK.META, "COMMERCE_SEEDED", { seeded: true, version: COMMERCE_SEED_VERSION });
}

export { createId as createCommerceId };
