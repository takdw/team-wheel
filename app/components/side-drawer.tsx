"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export function SideDrawer({
  id,
  labelledBy,
  side = "left",
  open,
  onClose,
  returnFocusRef,
  children,
}: {
  id: string;
  labelledBy: string;
  side?: "left" | "right";
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
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
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
      className="side-drawer"
      data-side={side}
      aria-labelledby={labelledBy}
      onClose={() => {
        onClose();
        // The empty-wheel opener disappears when the first teammate is added.
        const target =
          opener.current?.isConnected && !opener.current.matches(":disabled")
            ? opener.current
            : returnFocusRef.current;
        target?.focus();
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
