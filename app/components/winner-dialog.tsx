"use client";

import type { CSSProperties, RefObject } from "react";
import { LoaderCircle, Pause, Shuffle, X } from "lucide-react";
import { palette, type Person, type Pick } from "@/lib/wheel";
import { Avatar } from "./avatar";
import { Modal } from "./modal";

const confetti = Array.from({ length: 28 }, (_, index) => {
  const angle = (index / 28) * 2 * Math.PI;
  const distance = 74 + ((index * 37) % 66);
  return {
    backgroundColor: palette[index % palette.length],
    "--burst-x": `${Math.cos(angle) * distance}px`,
    "--burst-y": `${Math.sin(angle) * distance * 0.65}px`,
    "--burst-turn": `${(index % 2 ? 1 : -1) * (120 + index * 17)}deg`,
    animationDelay: `${(index % 5) * 20}ms`,
  } as CSSProperties;
});

export function WinnerDialog({
  pick,
  person,
  open,
  busy,
  canSpin,
  canSpinWithoutWinner,
  error,
  onClose,
  onSpin,
  onSitOut,
  returnFocusRef,
}: {
  pick: Pick | undefined;
  person: Person | undefined;
  open: boolean;
  busy: boolean;
  canSpin: boolean;
  canSpinWithoutWinner: boolean;
  error: string;
  onClose: () => void;
  onSpin: () => void;
  onSitOut: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <Modal
      id="winner-dialog"
      className="winner-dialog"
      labelledBy="winner-heading"
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    >
      {pick && (
        <>
          {open && (
            <div className="winner-confetti" aria-hidden="true">
              {confetti.map((style, index) => (
                <span key={index} style={style} />
              ))}
            </div>
          )}
          <button
            className="icon-button winner-close"
            aria-label="Close result"
            onClick={onClose}
          >
            <X size={20} />
          </button>
          <div className="winner-dialog-content">
            <Avatar
              id={pick.personId}
              name={pick.personName}
              color={person?.color ?? person?.defaultColor}
              photoUrl={person?.photoUrl}
              className="winner-avatar winner-dialog-avatar"
            />
            <div>
              <p className="result-caption">You’re up next</p>
              <h2 id="winner-heading">{pick.personName}</h2>
            </div>
            {error && (
              <p className="winner-error" role="alert">
                {error}
              </p>
            )}
            <div className="winner-actions">
              <button
                className="button spin-button"
                disabled={busy || !canSpin}
                onClick={onSpin}
              >
                <Shuffle size={17} /> Spin again
              </button>
              {person?.active && (
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={onSitOut}
                >
                  {busy ? (
                    <LoaderCircle size={16} className="loading-icon" />
                  ) : (
                    <Pause size={16} />
                  )}
                  {busy
                    ? "Pausing…"
                    : canSpinWithoutWinner
                      ? "Sit out & spin again"
                      : "Sit out"}
                </button>
              )}
            </div>
            {person?.active && (
              <p className="winner-sit-out-help">
                Sitting out pauses this teammate for everyone. Resume them from
                Team.
              </p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
