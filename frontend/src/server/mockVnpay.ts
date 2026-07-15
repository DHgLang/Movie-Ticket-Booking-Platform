import { createHmac } from "node:crypto";

/**
 * Real VNPay sandbox integration for the local dev server.
 * Mirrors amplify/functions/_shared/vnpay.ts but returns to localhost.
 */

export type MockVnpayConfig = {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  returnUrl: string;
  vndPerUsd: number;
};

let config: MockVnpayConfig | null = null;

export function configureMockVnpay(input: {
  tmnCode?: string;
  hashSecret?: string;
  paymentUrl?: string;
  vndPerUsd?: number;
}) {
  const tmnCode = (input.tmnCode ?? "").trim();
  const hashSecret = (input.hashSecret ?? "").trim();
  if (!tmnCode || !hashSecret) {
    config = null;
    return;
  }
  config = {
    tmnCode,
    hashSecret,
    paymentUrl: input.paymentUrl || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl: "http://localhost:5173/payment/result",
    vndPerUsd: input.vndPerUsd || 25000,
  };
}

export function getMockVnpay(): MockVnpayConfig | null {
  return config;
}

export function usdToVnd(usd: number): number {
  return Math.round(usd * (config?.vndPerUsd ?? 25000));
}

function buildSearchParams(params: Record<string, string>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== undefined && value !== "") sp.append(key, String(value));
  }
  return sp;
}

function signParams(params: Record<string, string>, hashSecret: string): string {
  const qs = buildSearchParams(params).toString();
  return createHmac("sha512", hashSecret).update(qs, "utf-8").digest("hex");
}

export function verifyVnpayCallback(params: Record<string, string>, hashSecret: string): boolean {
  const secureHash = params.vnp_SecureHash;
  if (!secureHash) return false;
  const copy = { ...params };
  delete copy.vnp_SecureHash;
  delete copy.vnp_SecureHashType;
  return signParams(copy, hashSecret).toLowerCase() === secureHash.toLowerCase();
}

function formatVnpayDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

export function buildVnpayPaymentUrl(
  cfg: MockVnpayConfig,
  input: { txnRef: string; amountVnd: number; orderInfo: string }
): string {
  const now = new Date();
  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: cfg.tmnCode,
    vnp_Amount: String(Math.round(input.amountVnd * 100)),
    vnp_CurrCode: "VND",
    vnp_TxnRef: input.txnRef,
    vnp_OrderInfo: input.orderInfo.slice(0, 255),
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: cfg.returnUrl,
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(new Date(now.getTime() + 15 * 60 * 1000)),
    vnp_IpAddr: "127.0.0.1",
  };
  const qs = buildSearchParams(params).toString();
  const secureHash = createHmac("sha512", cfg.hashSecret).update(qs, "utf-8").digest("hex");
  return `${cfg.paymentUrl}?${qs}&vnp_SecureHash=${secureHash}`;
}

export function isVnpaySuccess(params: Record<string, string>): boolean {
  return params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00";
}
