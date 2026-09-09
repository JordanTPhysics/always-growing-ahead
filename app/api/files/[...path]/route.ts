import { serveStoredUpload } from "@/lib/serve-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

type Params = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Params) {
  const { path } = await params;
  return serveStoredUpload(request, path, "GET");
}

export async function HEAD(request: Request, { params }: Params) {
  const { path } = await params;
  return serveStoredUpload(request, path, "HEAD");
}
