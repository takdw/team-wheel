"use client";

import { useState } from "react";
import { personColor, textColor } from "@/lib/wheel";

export function Avatar({
  id,
  name,
  color,
  photoUrl,
  className = "avatar",
}: {
  id: string;
  name: string;
  color?: string | null;
  photoUrl?: string | null;
  className?: string;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const background = personColor(id, color);
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase();
  return (
    <span
      className={className}
      style={{ backgroundColor: background, color: textColor(background) }}
      aria-hidden="true"
    >
      {photoUrl && failedPhoto !== photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedPhoto(photoUrl)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
