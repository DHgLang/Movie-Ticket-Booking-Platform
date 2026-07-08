import crypto from "crypto";

export type VnpayConfig = {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  returnUrl: string;
  ipnUrl: string;
};

export function getVnpayConfig(apiBaseUrl: string, frontendUrl: string): VnpayConfig | null {
  const tmnCode = (process.env.VNPAY_TMN_CODE ?? "").trim();
  const hashSecret = (process.env.VNPAY_HASH_SECRET ?? "").trim();
  if (!tmnCode || !hashSecret) return null;

  const base = apiBaseUrl.replace(/\/$/, "");
  const front = frontendUrl.replace(/\/$/, "");

  return {
    tmnCode,
    hashSecret,
    paymentUrl:
      process.env.VNPAY_URL ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl:
      process.env.VNPAY_RETURN_URL ?? `${front}/payment/result`,
    ipnUrl: process.env.VNPAY_IPN_URL ?? `${base}/payments/vnpay/ipn`,
  };
}

function buildSearchParams(params: Record<string, string>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== undefined && value !== "") sp.append(key, String(value));
  }
  return sp;
}

export function signParams(params: Record<string, string>, hashSecret: string): string {
  const qs = buildSearchParams(params).toString();
  return crypto.createHmac("sha512", hashSecret).update(qs, "utf-8").digest("hex");
}

export function verifyVnpayCallback(
  params: Record<string, string>,
  hashSecret: string
): boolean {
  const secureHash = params.vnp_SecureHash ?? params["vnp_SecureHash"];
  if (!secureHash) return false;
  const copy = { ...params };
  delete copy.vnp_SecureHash;
  delete copy["vnp_SecureHash"];
  delete copy.vnp_SecureHashType;
  delete copy["vnp_SecureHashType"];
  const expected = signParams(copy, hashSecret);
  return secureHash.toLowerCase() === expected.toLowerCase();
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
  config: VnpayConfig,
  input: {
    txnRef: string;
    amountVnd: number;
    orderInfo: string;
    ipAddr: string;
    locale?: string;
  }
): string {
  const now = new Date();
  const createDate = formatVnpayDate(now);
  const expireDate = formatVnpayDate(new Date(now.getTime() + 15 * 60 * 1000));

  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(Math.round(input.amountVnd * 100)),
    vnp_CurrCode: "VND",
    vnp_TxnRef: input.txnRef,
    vnp_OrderInfo: input.orderInfo.slice(0, 255),
    vnp_OrderType: "other",
    vnp_Locale: input.locale ?? "vn",
    vnp_ReturnUrl: config.returnUrl,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
    vnp_IpAddr: input.ipAddr || "127.0.0.1",
  };

  const qs = buildSearchParams(params).toString();
  const secureHash = crypto.createHmac("sha512", config.hashSecret).update(qs, "utf-8").digest("hex");
  return `${config.paymentUrl}?${qs}&vnp_SecureHash=${secureHash}`;
}

export function isVnpaySuccess(params: Record<string, string>): boolean {
  return params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00";
}

/** USD list prices → VND for VNPay (demo rate). */
export function usdToVnd(usd: number): number {
  const rate = Number(process.env.VND_PER_USD ?? 25000);
  return Math.round(usd * rate);
}
