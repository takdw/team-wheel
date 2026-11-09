"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export function Modal({
  id,
  labelledBy,
  className,
  open,
  onClose,
  returnFocusRef,
  children,
}: {
  id: string;
  labelledBy: string;
  className: string;
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) {
      if (element.open) element.close();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!element.open) {
      const focused = document.activeElement;
      opener.current =
        focused instanceof HTMLElement && focused !== document.body
          ? focused
          : null;
      element.showModal();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialog}
      id={id}
      className={className}
      aria-labelledby={labelledBy}
      onClose={(event) => {
        if (event.currentTarget.open) return;
        onClose();
        const previous = opener.current;
        if (previous?.isConnected) previous.focus();
        // The opener can be removed or disabled while the dialog is open.
        if (!previous || document.activeElement !== previous)
          returnFocusRef.current?.focus();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      {children}
    </dialog>
  );
}
