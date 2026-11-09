"use client";

import { useRef, useState } from "react";
import { Check, LoaderCircle, Upload, X } from "lucide-react";
import { Avatar } from "./avatar";
import { palette, type Person } from "@/lib/wheel";
import { preparePhoto } from "@/lib/prepare-photo";
import type { PersonUpdate } from "@/lib/profile";

export function PersonEditor({
  person,
  disabled,
  onSave,
  onCancel,
}: {
  person: Person;
  disabled: boolean;
  onSave: (values: PersonUpdate) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(person.name);
  const [color, setColor] = useState(person.color);
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [preview, setPreview] = useState(person.photoUrl);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const busy = disabled || preparing;
  const selectedColor = color ?? person.defaultColor;
  return (
    <form
      className="person-editor"
      aria-label={`Edit ${person.name}`}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        if (
          await onSave({
            name: name.trim(),
            color,
            ...(photo !== undefined ? { photo } : {}),
          })
        )
          onCancel();
      }}
    >
      <label className="editor-label">
        Name
        <input
          aria-label={`Name for ${person.name}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          required
          disabled={busy}
          autoFocus
        />
      </label>
      <div className="editor-label">
        Color
        <div
          className="color-options"
          role="group"
          aria-label={`Color for ${person.name}`}
        >
          {palette.map((value) => (
            <button
              type="button"
              key={value}
              className="color-swatch"
              aria-label={`Use color ${value}`}
              aria-pressed={value.toLowerCase() === selectedColor.toLowerCase()}
              style={{ backgroundColor: value }}
              disabled={busy}
              onClick={() => setColor(value)}
            />
          ))}
          <label className="custom-color">
            <input
              type="color"
              aria-label={`Custom color for ${person.name}`}
              value={selectedColor}
              disabled={busy}
              onChange={(event) => setColor(event.target.value)}
            />
            <span>Custom</span>
          </label>
        </div>
        <button
          type="button"
          className="text-button default-color"
          disabled={busy || color === null}
          onClick={() => setColor(null)}
        >
          Use default color
        </button>
      </div>
      <div className="photo-editor">
        <Avatar
          id={person.id}
          name={name}
          color={selectedColor}
          photoUrl={preview}
          className="profile-preview"
        />
        <div className="photo-actions">
          <input
            ref={upload}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setPreparing(true);
              setError("");
              try {
                const next = await preparePhoto(file);
                setPhoto(next);
                setPreview(next);
              } catch (issue) {
                setError(
                  issue instanceof Error
                    ? issue.message
                    : "This photo could not be opened.",
                );
              } finally {
                setPreparing(false);
              }
            }}
          />
          <div>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => upload.current?.click()}
            >
              {preparing ? (
                <LoaderCircle size={13} className="loading-icon" />
              ) : (
                <Upload size={13} />
              )}
              {preparing
                ? "Preparing photo…"
                : preview
                  ? "Change photo"
                  : "Upload photo"}
            </button>
            {preview && (
              <button
                type="button"
                className="text-button remove-photo"
                disabled={busy}
                onClick={() => {
                  setPhoto(null);
                  setPreview(null);
                  setError("");
                }}
              >
                Remove
              </button>
            )}
          </div>
          <span className="photo-hint">JPG, PNG or WebP · up to 10 MB</span>
        </div>
      </div>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      <div className="editor-actions">
        <button className="button editor-save" disabled={busy || !name.trim()}>
          {disabled ? (
            <LoaderCircle size={14} className="loading-icon" />
          ) : (
            <Check size={14} />
          )}
          Save changes
        </button>
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={onCancel}
        >
          <X size={13} />
          Cancel
        </button>
      </div>
    </form>
  );
}
