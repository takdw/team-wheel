"use client";

import { useId, useRef } from "react";
import {
  Ellipsis,
  Hand,
  Shield,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import type { Person } from "@/lib/wheel";

export function PersonModifiers({
  person,
  disabled,
  onAttendance,
  onVolunteer,
  onShield,
}: {
  person: Person;
  disabled: boolean;
  onAttendance: () => void;
  onVolunteer?: () => void;
  onShield?: () => void;
}) {
  const id = useId();
  const anchor = `--modifiers-${id.replaceAll(":", "")}`;
  const popover = useRef<HTMLDivElement>(null);
  const AttendanceIcon = person.absent ? UserRoundCheck : UserRoundX;

  function choose(action: () => void) {
    popover.current?.hidePopover();
    action();
  }

  return (
    <div className="person-modifiers">
      <button
        type="button"
        className="icon-button modifier-trigger"
        style={{ anchorName: anchor }}
        popoverTarget={id}
        aria-label={`Modifiers for ${person.name}`}
        title="Modifiers"
      >
        <Ellipsis size={18} />
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        className="modifier-popover"
        style={{ positionAnchor: anchor }}
        role="group"
        aria-label={`Modifiers for ${person.name}`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => choose(onAttendance)}
        >
          <AttendanceIcon size={15} />
          {person.absent ? "Mark present" : "Mark absent"}
        </button>
        {onVolunteer && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => choose(onVolunteer)}
          >
            <Hand size={15} /> I’ll go first
          </button>
        )}
        {onShield && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => choose(onShield)}
          >
            <Shield size={15} />{" "}
            {person.shieldArmed ? "Disarm shield" : "Arm shield"}
          </button>
        )}
      </div>
    </div>
  );
}
