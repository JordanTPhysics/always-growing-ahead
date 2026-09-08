import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  canPostMarketplace,
  marketplaceDailyPostLimit,
} from "@/lib/entitlements";
import {
  countRecentMarketplaceListings,
  createMarketplaceListing,
  listMarketplaceListings,
} from "@/lib/db/repositories/marketplace-listings";
import { marketplacePosts } from "@/lib/marketplace/content";
import {
  MARKETPLACE_CATEGORIES,
  type MarketplacePost,
} from "@/lib/marketplace/types";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import {
  deleteStoredUpload,
  isObjectStorageConfigured,
  keyToStoredUrl,
  newUploadKey,
  putObject,
  resolveStoredFileUrl,
  writeLocalUpload,
} from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

const ALLOWED_MEDIA: Record<
  string,
  { mediaType: "image" | "video"; ext: string; maxBytes: number; mimeType: string }
> = {
  "image/jpeg": {
    mediaType: "image",
    ext: "jpg",
    maxBytes: IMAGE_MAX_BYTES,
    mimeType: "image/jpeg",
  },
  "image/png": {
    mediaType: "image",
    ext: "png",
    maxBytes: IMAGE_MAX_BYTES,
    mimeType: "image/png",
  },
  "image/webp": {
    mediaType: "image",
    ext: "webp",
    maxBytes: IMAGE_MAX_BYTES,
    mimeType: "image/webp",
  },
  "image/gif": {
    mediaType: "image",
    ext: "gif",
    maxBytes: IMAGE_MAX_BYTES,
    mimeType: "image/gif",
  },
  "video/mp4": {
    mediaType: "video",
    ext: "mp4",
    maxBytes: VIDEO_MAX_BYTES,
    mimeType: "video/mp4",
  },
  "video/webm": {
    mediaType: "video",
    ext: "webm",
    maxBytes: VIDEO_MAX_BYTES,
    mimeType: "video/webm",
  },
  "video/quicktime": {
    mediaType: "video",
    ext: "mov",
    maxBytes: VIDEO_MAX_BYTES,
    mimeType: "video/quicktime",
  },
};

const EXTENSIONS: Record<string, (typeof ALLOWED_MEDIA)[string]> = {
  jpg: ALLOWED_MEDIA["image/jpeg"],
  jpeg: ALLOWED_MEDIA["image/jpeg"],
  png: ALLOWED_MEDIA["image/png"],
  webp: ALLOWED_MEDIA["image/webp"],
  gif: ALLOWED_MEDIA["image/gif"],
  mp4: ALLOWED_MEDIA["video/mp4"],
  webm: ALLOWED_MEDIA["video/webm"],
  mov: ALLOWED_MEDIA["video/quicktime"],
};

const fieldsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().default(""),
  price: z.string().trim().max(40).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  category: z.enum(MARKETPLACE_CATEGORIES).optional().default("Other"),
});

function resolveAllowedMedia(fileName: string, contentType: string) {
  const mime = contentType.trim().toLowerCase();
  if (mime && mime !== "application/octet-stream" && ALLOWED_MEDIA[mime]) {
    return ALLOWED_MEDIA[mime];
  }
  const ext = path.extname(fileName).replace(/^\./, "").toLowerCase();
  return EXTENSIONS[ext] ?? null;
}

async function withResolvedMedia<T extends { mediaUrl: string }>(post: T) {
  return {
    ...post,
    mediaUrl: (await resolveStoredFileUrl(post.mediaUrl)) ?? post.mediaUrl,
  };
}

async function quotaForUser(userId: number, tier: Parameters<
  typeof marketplaceDailyPostLimit
>[0]) {
  const limit = marketplaceDailyPostLimit(tier);
  const used = await countRecentMarketplaceListings(userId);
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export async function GET() {
  let userPosts: MarketplacePost[] = [];
  try {
    userPosts = await listMarketplaceListings();
  } catch (err) {
    console.error("marketplace listings GET", err);
  }

  const posts = await Promise.all(
    [...userPosts, ...marketplacePosts].map(withResolvedMedia)
  );

  const session = await auth();
  const quota =
    session?.user?.id && isRemoteDatabaseConfigured()
      ? await quotaForUser(Number(session.user.id), session.user.tier)
      : null;

  return NextResponse.json({ posts, quota });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  if (!isRemoteDatabaseConfigured()) {
    return jsonError("Marketplace posting is unavailable in demo mode", 503);
  }

  if (!canPostMarketplace(session.user.tier)) {
    return jsonError("A paid Worker or Employer plan is required to post", 403);
  }

  const userId = Number(session.user.id);
  const quota = await quotaForUser(userId, session.user.tier);
  if (quota.remaining <= 0) {
    return NextResponse.json(
      {
        error: `Daily post limit reached (${quota.limit} per day on your plan)`,
        quota,
      },
      { status: 429 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError("Invalid listing");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return jsonError("A photo or video is required");
  }

  const allowed = resolveAllowedMedia(file.name, file.type);
  if (!allowed) {
    return jsonError("Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.");
  }
  if (file.size > allowed.maxBytes) {
    const maxMb = Math.round(allowed.maxBytes / (1024 * 1024));
    return jsonError(
      `${allowed.mediaType === "image" ? "Image" : "Video"} too large (max ${maxMb}MB)`
    );
  }

  const parsed = fieldsSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    location: String(formData.get("location") ?? ""),
    category: String(formData.get("category") ?? "Other"),
  });
  if (!parsed.success) return jsonError("Invalid listing details");

  const key = newUploadKey("marketplace", session.user.id, allowed.ext);
  const mediaUrl = keyToStoredUrl(key);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (isObjectStorageConfigured()) {
      await putObject(key, buffer, allowed.mimeType);
    } else {
      await writeLocalUpload(key, buffer);
    }

    const post = await createMarketplaceListing({
      userId,
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      location: parsed.data.location,
      category: parsed.data.category,
      mediaType: allowed.mediaType,
      mediaUrl,
    });

    return NextResponse.json(
      {
        post: await withResolvedMedia(post),
        quota: {
          used: quota.used + 1,
          limit: quota.limit,
          remaining: Math.max(0, quota.remaining - 1),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    await deleteStoredUpload(mediaUrl);
    console.error("marketplace listing POST", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not create listing",
      500
    );
  }
}
