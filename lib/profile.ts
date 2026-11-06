import { z } from "zod";

export const maxPhotoBytes = 48_000;
export const maxUploadBytes = 10 * 1024 * 1024;
export const photoTypes = ["image/jpeg", "image/png", "image/webp"];

export function decodePhoto(
  value: string,
): { contentType: string; bytes: Uint8Array<ArrayBuffer> } | null {
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    );
  if (!match || value.length > 65_000) return null;
  try {
    const bytes = Uint8Array.from(atob(match[2]), (character) =>
      character.charCodeAt(0),
    );
    if (bytes.length > maxPhotoBytes || bytes.length < 12) return null;
    const signature = Array.from(bytes.slice(0, 12));
    const valid =
      match[1] === "image/png"
        ? signature.slice(0, 8).join() === "137,80,78,71,13,10,26,10"
        : match[1] === "image/jpeg"
          ? signature[0] === 255 && signature[1] === 216 && signature[2] === 255
          : String.fromCharCode(...signature.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
    return valid ? { contentType: match[1], bytes } : null;
  } catch {
    return null;
  }
}

export const personUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name.")
      .max(60, "Keep names to 60 characters.")
      .optional(),
    active: z.boolean().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i, "Choose a valid color.")
      .nullable()
      .optional(),
    photo: z
      .string()
      .max(65_000, "Choose a smaller photo.")
      .refine(
        (value) => decodePhoto(value) !== null,
        "Choose a JPG, PNG, or WebP photo.",
      )
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Choose a change to save.");

export type PersonUpdate = z.infer<typeof personUpdateSchema>;
