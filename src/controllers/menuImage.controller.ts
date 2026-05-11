import { bucket } from "../util/firebase";
import { minioClient } from "../util/minio";
import { Readable } from "stream";

export async function uploadMenuImage(
  buffer: Buffer,
  sku: string,
  mime: string,
) {
  const path = `menu/${sku}.webp`;
  const file = bucket.file(path);

  // await file.save(buffer, {
  //   contentType: mime,
  //   resumable: false,
  //   public: true,
  // });

  const stream = Readable.from(buffer);

  const bucketName = process.env.S3_BUCKET_NAME;

  console.log("bucketName:", bucketName);

  const result = await minioClient.putObject(
    bucket,
    path,
    stream,
    buffer.length,
    {
      "Content-Type": mime,
    },
  );

  console.log("upload result:", result);

  return {
    url: `https://${process.env.S3_ENDPOINT}/${bucketName}/${path}`,
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
