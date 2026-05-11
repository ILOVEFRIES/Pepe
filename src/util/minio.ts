import Minio from "minio";

export const minioClient = new Minio.Client({
  endPoint: process.env.S3_ENDPOINT!,
  port: 9091,
  useSSL: true,
  accessKey: process.env.S3_ACCESS_KEY_ID!,
  secretKey: process.env.S3_SECRET_ACCESS_KEY!,
});
