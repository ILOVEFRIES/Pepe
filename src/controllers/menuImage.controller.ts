import { bucket } from "../util/firebase";

export async function uploadMenuImage(
  buffer: Buffer,
  sku: string,
  mime: string
) {
  const path = `menu/${sku}.webp`;
  const file = bucket.file(path);

  await file.save(buffer, {
    contentType: mime,
    resumable: false,
    public: true,
  });

  return {
    url: `https://storage.googleapis.com/${bucket.name}/${path}`,
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
