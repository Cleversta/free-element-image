import { reserveOwnerLogin } from "@/lib/server/login-limit";
import {
  requireOwner,
  ownerOrigin,
  loginCookie,
  cookieHeader,
} from "@/lib/server/owner";
import {
  readBody,
  submissionResponse,
  submissionFailure,
} from "@/lib/server/submissions";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    requireOwner(request);
    return submissionResponse({ signedIn: true });
  } catch (error) {
    return submissionFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    ownerOrigin(request);
    const body = await readBody(request, 1024);
    await reserveOwnerLogin(request);
    const response = submissionResponse({ signedIn: true });
    response.headers.set("Set-Cookie", loginCookie(body.key));
    return response;
  } catch (error) {
    return submissionFailure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    ownerOrigin(request);
    const response = submissionResponse({ signedIn: false });
    response.headers.set("Set-Cookie", cookieHeader("", 0));
    return response;
  } catch (error) {
    return submissionFailure(error);
  }
}
