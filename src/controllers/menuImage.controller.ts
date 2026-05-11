import { bucket } from "../util/firebase";
import { minioClient } from "../util/minio";

export async function uploadMenuImage(
  buffer: Buffer,
  sku: string,
  mime: string,
) {
  const S3Endpoint = process.env.S3_ENDPOINT;
  const S3Bucket = process.env.S3_BUCKET_NAME;

  const path = `menu/${sku}.webp`;
  const file = bucket.file(path);

  // await file.save(buffer, {
  //   contentType: mime,
  //   resumable: false,
  //   public: true,
  // });

  await minioClient.putObject(S3Bucket, `${path}`, buffer);

  return {
    url: `${S3Endpoint}/${path}`,
    path,
  };
}

export async function deleteMenuImage(path: string) {
  if (!path) return;

  const file = bucket.file(path);

  try {
    await file.delete({ ignoreNotFound: true });
  } catch (err) {
    console.error("Failed to delete menu image:", err);
    throw err;
  }
}
