import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 access, via its S3-compatible API.
 *
 * Config comes from `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`
 * / `R2_BUCKET_NAME` (see `.env.example`). When any of those is missing the
 * upload/download routes report "not configured" rather than crashing, so the
 * rest of the app still runs in a fresh checkout.
 *
 * Objects are always served back through `/api/files/[id]` (a same-origin proxy
 * that sidesteps CORS and keeps the bucket private), so no public bucket URL is
 * required.
 */

function readConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/** True when every required R2 env var is set. */
export function isR2Configured(): boolean {
  return readConfig() !== null;
}

let cached: { client: S3Client; bucket: string } | null = null;

function getClient(): { client: S3Client; bucket: string } {
  const config = readConfig();
  if (!config) {
    throw new Error("R2 is not configured (missing R2_* environment variables).");
  }
  if (!cached) {
    cached = {
      bucket: config.bucket,
      client: new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    };
  }
  return cached;
}

/** Store an object, returning nothing. Throws on failure. */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export interface R2Object {
  /** Web stream of the object's bytes. */
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
}

/** Fetch an object for the download proxy. Throws when the key is missing. */
export async function getObject(key: string): Promise<R2Object> {
  const { client, bucket } = getClient();
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!result.Body) {
    throw new Error(`R2 object "${key}" has no body.`);
  }
  return {
    body: (result.Body as {
      transformToWebStream: () => ReadableStream<Uint8Array>;
    }).transformToWebStream(),
    contentType: result.ContentType ?? "application/octet-stream",
    contentLength: result.ContentLength ?? null,
  };
}

/** Best-effort delete — logs and swallows failures so item deletion still succeeds. */
export async function deleteObject(key: string): Promise<void> {
  try {
    const { client, bucket } = getClient();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error(`Failed to delete R2 object "${key}"`, error);
  }
}

/**
 * Normalise whatever is stored in `Item.fileUrl` down to a bare R2 object key.
 *
 * We write the bare key today, but the column is named `fileUrl` and a full URL
 * (a public bucket URL, or the S3 endpoint form
 * `https://<acct>.r2.cloudflarestorage.com/<bucket>/<key>`) is a plausible value
 * to find there — the S3 API needs the key alone, so strip the origin, any
 * leading slash, and a leading `<bucket>/` segment.
 */
export function toObjectKey(stored: string): string {
  let value = stored.trim();

  if (/^https?:\/\//i.test(value)) {
    try {
      value = decodeURIComponent(new URL(value).pathname);
    } catch {
      /* not a parseable URL — fall through and treat it as a key */
    }
  }

  value = value.replace(/^\/+/, "");

  const bucket = process.env.R2_BUCKET_NAME;
  if (bucket && value.startsWith(`${bucket}/`)) {
    value = value.slice(bucket.length + 1);
  }

  return value;
}

/**
 * Build the storage key for a new upload. Namespaced by user so one person's
 * objects are easy to spot / purge; the random segment keeps names unguessable.
 */
export function buildObjectKey(
  userId: string,
  kind: "image" | "file",
  extension: string,
): string {
  const random = crypto.randomUUID();
  return `uploads/${userId}/${kind}/${random}${extension}`;
}
