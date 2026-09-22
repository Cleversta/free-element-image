import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SubmissionError, checkOrigin } from "./submissions.ts";
export const OWNER_COOKIE = "freelement_owner";
const HOURS = 8 * 60 * 60;
function key() {
  const value = process.env.ADMIN_ACCESS_KEY?.trim();
  if (!value || value.length < 32)
    throw new SubmissionError(503, "Owner access is not configured.");
  return value;
}
export function equalSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function ownerSession(secret: string, now = Date.now()) {
  const expires = String(Math.floor(now / 1000) + HOURS);
  return `${expires}.${createHmac("sha256", secret).update(`owner:${expires}`).digest("hex")}`;
}
export function validOwnerSession(
  value: string,
  secret: string,
  now = Date.now(),
) {
  if (!/^\d{10}\.[a-f0-9]{64}$/.test(value)) return false;
  const [expires, signature] = value.split(".");
  if (
    !/^\d{10}$/.test(expires || "") ||
    !/^[a-f0-9]{64}$/.test(signature || "")
  )
    return false;
  const seconds = Math.floor(now / 1000);
  if (Number(expires) <= seconds || Number(expires) > seconds + HOURS)
    return false;
  return equalSecret(
    signature,
    createHmac("sha256", secret).update(`owner:${expires}`).digest("hex"),
  );
}
export function requireOwner(request: Request) {
  const cookie =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${OWNER_COOKIE}=`))
      ?.slice(OWNER_COOKIE.length + 1) || "";
  if (!validOwnerSession(cookie, key()))
    throw new SubmissionError(401, "Sign in with your owner access key.");
}
export function ownerOrigin(request: Request) {
  const site = process.env.SITE_URL;
  if (!site)
    throw new SubmissionError(503, "Configure the website address first.");
  checkOrigin(request, site);
}
export function loginCookie(value: unknown) {
  const secret = key();
  if (typeof value !== "string" || !equalSecret(value, secret))
    throw new SubmissionError(401, "The owner access key is incorrect.");
  return cookieHeader(ownerSession(secret), HOURS);
}
export function cookieHeader(value: string, age: number) {
  const secure = process.env.SITE_URL?.startsWith("https://") ? "; Secure" : "";
  return `${OWNER_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`;
}
