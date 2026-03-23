// src/lib/storage/index.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.STORAGE_REGION!,
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
  forcePathStyle: true, // needed for non-AWS S3-compatible services
});

const BUCKET = process.env.STORAGE_BUCKET!;
const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL!;

export async function uploadFile(
  file: Buffer,
  mimeType: string,
  folder: string = "uploads"
): Promise<{ key: string; url: string }> {
  const ext = mimeType.split("/")[1] || "bin";
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: mimeType,
    })
  );

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
  };
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

export async function getPresignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}
