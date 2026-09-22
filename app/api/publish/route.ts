import {
  publishSettings,
  submissionServices,
} from "@/lib/server/submission-services";
import {
  submit,
  submissionFailure,
  submissionResponse,
} from "@/lib/server/submissions";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const settings = publishSettings();
  return submissionResponse({
    enabled: !!settings,
    siteKey: settings?.siteKey || null,
  });
}
export async function POST(request: Request) {
  let services: ReturnType<typeof submissionServices> | undefined;
  try {
    services = submissionServices(true);
    return submissionResponse(await submit(request, services.deps), 201);
  } catch (error) {
    return submissionFailure(error);
  } finally {
    services?.close();
  }
}
