import { submissionServices } from "@/lib/server/submission-services";
import {
  manage,
  submissionFailure,
  submissionResponse,
} from "@/lib/server/submissions";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let services: ReturnType<typeof submissionServices> | undefined;
  try {
    services = submissionServices();
    return submissionResponse(await manage(request, services.deps));
  } catch (error) {
    return submissionFailure(error);
  } finally {
    services?.close();
  }
}
