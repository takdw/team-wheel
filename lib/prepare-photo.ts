import { maxPhotoBytes, maxUploadBytes, photoTypes } from "./profile";

export async function preparePhoto(file: File): Promise<string> {
  if (!photoTypes.includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (file.size > maxUploadBytes)
    throw new Error("Choose a photo smaller than 10 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "This photo could not be opened. Try another JPG, PNG, or WebP.",
    );
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Photo processing is unavailable. Try a different browser.",
      );
    const size = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - size) / 2,
      (bitmap.height - size) / 2,
      size,
      size,
      0,
      0,
      128,
      128,
    );
    const photo = canvas.toDataURL("image/webp", 0.82);
    if (photo.length > Math.ceil((maxPhotoBytes * 4) / 3) + 30)
      throw new Error("Choose a simpler or smaller photo.");
    return photo;
  } finally {
    bitmap.close();
  }
}
