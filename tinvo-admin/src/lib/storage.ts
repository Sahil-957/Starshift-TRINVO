import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Neon Object Storage (private bucket from neon.ts). Credentials, endpoint and
 * region come from the AWS_* vars `neon deploy` pulls into .env.local.
 */
export const BUCKET = "assets";

// Neon requires path-style addressing
export const s3 = new S3Client({ forcePathStyle: true });

export const putFile = (key: string, body: Uint8Array | string, contentType: string) =>
  s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));

/** A time-limited link to a private file, e.g. a print file for Qikink. */
export const signedUrl = (key: string, expiresIn = 3600) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
