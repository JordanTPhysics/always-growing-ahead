import { Client } from "minio";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const PUT_EXPIRES_SECONDS = 15 * 60;
const GET_EXPIRES_SECONDS = 60 * 60;

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim() &&
      process.env.S3_BUCKET_NAME?.trim()
  );
}

export function isStoredUploadUrl(url: string): boolean {
  return url.startsWith("/uploads/");
}

export function storedUrlToKey(url: string): string {
  return url.replace(/^\//, "");
}

export function newUploadKey(
  folder: string,
  userId: string,
  ext: string
): string {
  return `uploads/${folder}/${userId}/${randomUUID()}.${ext}`;
}

export function keyToStoredUrl(key: string): string {
  return `/${key}`;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function endpointOptions() {
  const endpoint = new URL(required("S3_ENDPOINT"));
  const useSSL = endpoint.protocol === "https:";
  return {
    endPoint: endpoint.hostname,
    port: endpoint.port
      ? Number(endpoint.port)
      : useSSL
        ? 443
        : 80,
    useSSL,
  };
}

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    const { endPoint, port, useSSL } = endpointOptions();
    client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey: required("S3_ACCESS_KEY_ID"),
      secretKey: required("S3_SECRET_ACCESS_KEY"),
      region: process.env.S3_REGION?.trim() || "eu-west-2",
      pathStyle: process.env.S3_FORCE_PATH_STYLE !== "0",
    });
  }
  return client;
}

function bucket(): string {
  return required("S3_BUCKET_NAME");
}

export function resolveLocalUploadPath(key: string): string | null {
  if (key.includes("..") || path.isAbsolute(key)) return null;
  const absolute = path.resolve(process.cwd(), "public", key);
  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const relative = path.relative(uploadsRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return absolute;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await getClient().putObject(bucket(), key, body, body.byteLength, {
    "Content-Type": contentType,
  });
}

function toPublicUrl(signedUrl: string): string {
  const base = process.env.S3_PUBLIC_URL?.trim();
  if (!base) return signedUrl;
  const signed = new URL(signedUrl);
  const pub = new URL(base);
  signed.protocol = pub.protocol;
  signed.host = pub.host;
  return signed.toString();
}

export async function presignPutUrl(key: string): Promise<string> {
  const url = await getClient().presignedPutObject(
    bucket(),
    key,
    PUT_EXPIRES_SECONDS
  );
  return toPublicUrl(url);
}

export async function presignGetUrl(key: string): Promise<string> {
  const url = await getClient().presignedGetObject(
    bucket(),
    key,
    GET_EXPIRES_SECONDS
  );
  return toPublicUrl(url);
}

export async function resolveStoredFileUrl(
  url: string | null | undefined
): Promise<string | null> {
  if (!url) return null;
  if (!isObjectStorageConfigured() || !isStoredUploadUrl(url)) return url;
  return presignGetUrl(storedUrlToKey(url));
}

export async function writeLocalUpload(
  key: string,
  body: Buffer
): Promise<void> {
  const absolute = resolveLocalUploadPath(key);
  if (!absolute) throw new Error("Invalid upload key");
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, body);
}

export async function deleteStoredUpload(url: string): Promise<void> {
  if (!isStoredUploadUrl(url)) return;
  if (isObjectStorageConfigured()) {
    await getClient()
      .removeObject(bucket(), storedUrlToKey(url))
      .catch(() => undefined);
    return;
  }
  const absolute = resolveLocalUploadPath(storedUrlToKey(url));
  if (!absolute) return;
  await unlink(absolute).catch(() => undefined);
}
