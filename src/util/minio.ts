var Minio = require("minio");

const S3Endpoint = process.env.S3_ENDPOINT;
const S3Port = process.env.S3_PORT;
const accessKey = process.env.S3_ACCESS_KEY;
const secretKey = process.env.S3_SECRET_KEY;
const bucketName = process.env.S3_BUCKET;

export const minioClient = new Minio.Client({
  endPoint: S3Endpoint,
  port: S3Port,
  useSSL: true,
  accessKey: accessKey,
  secretKey: secretKey,
});
