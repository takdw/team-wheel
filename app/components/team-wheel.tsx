"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Copy,
  Hand,
  History,
  Link2,
  LoaderCircle,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  getCandidates,
  legacyPalette,
  personColor,
  textColor,
  secureFraction,
  spinModes,
  type Candidate,
  type HistoryPage,
  type Mode,
  type Person,
  type Snapshot,
  type SpinResult,
  type TurnResult,
} from "@/lib/wheel";
import { animateWheel, spinRotation } from "@/lib/motion";
import {
  createSpinAudio,
  playSpinClicks,
  type SpinAudio,
} from "@/lib/spin-audio";
import { requestJson, RequestError } from "@/lib/client-request";
import { formatTeamCode, teamApiBase, type TeamAccess } from "@/lib/team";
import { Avatar } from "./avatar";
import { PersonEditor } from "./person-editor";
import { PersonModifiers } from "./person-modifiers";
import { Modal } from "./modal";
import { WinnerDialog } from "./winner-dialog";

const modeInfo = {
  random: {
    label: "Random",
    Icon: Shuffle,
    description: "Equal chance for everyone.",
  },
  balanced: {
    label: "Balanced",
    Icon: Users,
    description: "Higher odds for people with fewer turns.",
  },
  wildcard: {
    label: "Wild Card",
    Icon: Sparkles,
    description: "Set attendance, volunteer, or arm a shield in Team.",
  },
};

function percentage(probability: number) {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(probability);
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
function Wheel({
  candidates,
  people,
  outcome,
  revealed,
  onFinish,
  onOpenTeam,
  emptyNote,
  hub,
  hubIcon,
  buttonIcon,
  audio,
}: {
  candidates: Candidate[];
  people: Person[];
  outcome: SpinResult | null;
  revealed: boolean;
  onFinish: () => void;
  onOpenTeam: () => void;
  emptyNote: string;
  hub: ReactNode;
  hubIcon: RefObject<SVGSVGElement | null>;
  buttonIcon: RefObject<SVGSVGElement | null>;
  audio: RefObject<SpinAudio | null>;
}) {
  const rotor = useRef<HTMLDivElement>(null);
  const pointer = useRef<SVGPathElement>(null);
  const angle = useRef(0);
  const finish = useRef(onFinish);
  const slices = useMemo(() => {
    const entries: Candidate[] = candidates.length
      ? candidates
      : legacyPalette.map((_, index) => ({
          id: `empty-${index}`,
          name: "",
          probability: 1 / 8,
        }));
    let start = 0;
    return entries.map((candidate) => {
      const end = start + candidate.probability * Math.PI * 2;
      const slice = { candidate, start, end };
      start = end;
      return slice;
    });
  }, [candidates]);
  const hasDividers = candidates.length > 1;
  useEffect(() => {
    finish.current = onFinish;
  }, [onFinish]);
  useEffect(() => {
    if (!outcome || !rotor.current) return;
    const element = rotor.current;
    const start = angle.current;
    const end = spinRotation(
      start,
      outcome.landingAngle,
      5 + Math.floor(secureFraction() * 3),
    );
    const duration = 5200 + secureFraction() * 1600;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return animateWheel(
      element,
      start,
      end,
      reduced,
      () => {
        angle.current = end;
        finish.current();
      },
      duration,
      {
        indicators: [hubIcon.current, buttonIcon.current].filter(
          (icon) => icon !== null,
        ),
        pointer:
          hasDividers && pointer.current
            ? {
                element: pointer.current,
                dividerAngles: slices.map(
                  ({ start }) => (start * 180) / Math.PI,
                ),
              }
            : undefined,
        playClicks: (contacts, wheel) => {
          if (audio.current)
            return playSpinClicks(audio.current, contacts, wheel);
        },
      },
    );
  }, [outcome, hubIcon, buttonIcon, audio, hasDividers, slices]);
  useEffect(() => {
    if (!outcome && rotor.current) {
      angle.current = 0;
      rotor.current.style.transform = "rotate(0deg)";
    }
  }, [outcome]);
  const portraits = new Map(
    people.map((person) => [person.id, person.photoUrl]),
  );
  const labelRotation =
    outcome && revealed ? spinRotation(0, outcome.landingAngle, 0) : 0;
  const dividers = hasDividers
    ? slices
        .map(({ start }) => {
          const x = Math.sin(start);
          const y = -Math.cos(start);
          return `M${260 + 36 * x} ${260 + 36 * y} L${260 + 246 * x} ${260 + 246 * y}`;
        })
        .join(" ")
    : "";
  return (
    <div className={`wheel-wrap ${candidates.length ? "" : "wheel-empty"}`}>
      <div className="wheel-plane">
        <div className="wheel-rim" aria-hidden="true" />
        <div className="wheel-rotor" ref={rotor}>
          <svg
            viewBox="0 0 520 520"
            role="img"
            aria-label={
              candidates.length
                ? `Wheel with ${candidates.length} ${candidates.length === 1 ? "person" : "people"}. Individual odds are shown in Team.`
                : emptyNote
            }
          >
            <circle cx="260" cy="260" r="255" fill="#eee5d4" />
            {slices.map(({ candidate, start, end }, index) => {
              const mid = (start + end) / 2;
              const radius = 244;
              const x1 = 260 + radius * Math.sin(start),
                y1 = 260 - radius * Math.cos(start);
              const x2 = 260 + radius * Math.sin(end),
                y2 = 260 - radius * Math.cos(end);
              const degrees = (mid * 180) / Math.PI - 90;
              // Flip the text if its baseline points left after the wheel stops.
              const flipLabel =
                Math.cos(((degrees + labelRotation) * Math.PI) / 180) < 0;
              const color = personColor(candidate.id, candidate.color);
              const photoUrl = portraits.get(candidate.id);
              const showPhoto = photoUrl && candidate.probability >= 0.05;
              const labelRadius = showPhoto ? 176 : 213;
              const labelLimit = showPhoto ? 14 : slices.length > 14 ? 11 : 18;
              const visibleName =
                Array.from(candidate.name).slice(0, labelLimit).join("") +
                (Array.from(candidate.name).length > labelLimit ? "…" : "");
              return (
                <g key={candidate.id}>
                  {candidate.probability > 0.9999 ? (
                    <circle cx="260" cy="260" r={radius} fill={color} />
                  ) : (
                    <path
                      d={`M260 260 L${x1} ${y1} A${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`}
                      fill={candidates.length ? color : legacyPalette[index]}
                      stroke="#f7f6f0"
                      strokeWidth="2"
                    />
                  )}
                  {candidate.name && candidate.probability > 0.025 && (
                    <g transform={`translate(260 260) rotate(${degrees})`}>
                      {showPhoto && (
                        <>
                          <defs>
                            <clipPath
                              id={`photo-${candidate.id}`}
                              clipPathUnits="userSpaceOnUse"
                            >
                              <circle cx="208" cy="0" r="21" />
                            </clipPath>
                          </defs>
                          <circle cx="208" cy="0" r="23" fill="#fffefa" />
                          <image
                            href={photoUrl}
                            x="187"
                            y="-21"
                            width="42"
                            height="42"
                            preserveAspectRatio="xMidYMid slice"
                            clipPath={`url(#photo-${candidate.id})`}
                          />
                        </>
                      )}
                      <text
                        x={flipLabel ? -labelRadius : labelRadius}
                        y="6"
                        textAnchor={flipLabel ? "start" : "end"}
                        transform={flipLabel ? "rotate(180)" : undefined}
                        className="wheel-label"
                        style={{ fill: textColor(color) }}
                      >
                        {visibleName}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            <circle
              cx="260"
              cy="260"
              r="246"
              fill="none"
              stroke="#fffcf5"
              strokeWidth="5"
            />
          </svg>
          {dividers && (
            <svg
              className="wheel-dividers"
              viewBox="0 0 520 520"
              aria-hidden="true"
            >
              <path d={dividers} />
            </svg>
          )}
        </div>
        <div className="wheel-lip" aria-hidden="true" />
        <div className="wheel-pointer" aria-hidden="true">
          <svg viewBox="-1 0 38 30">
            <path
              ref={pointer}
              d="M32 3 Q37 15 32 27 L4 18 Q0 16.5 0 15 Q0 13.5 4 12 Z"
            />
            <circle cx="30" cy="15" r="2.1" />
          </svg>
        </div>
        {hub}
      </div>
      {!candidates.length && (
        <div className="empty-wheel-label">
          <Users size={25} />
          <button className="empty-team-button" onClick={onOpenTeam}>
            {people.length ? "Open team" : "Add teammates"}
          </button>
          <span>{emptyNote}</span>
        </div>
      )}
    </div>
  );
}

const modifierConfirmations = {
  absence: {
    title: (name: string) => `Mark ${name} absent?`,
    description: "Their weight doubles in Wild Card until you mark them present.",
    label: "Mark absent",
    available: (person: Person) => !person.absent,
  },
  shield: {
    title: (name: string) => `Arm ${name}’s shield?`,
    description:
      "The shield keeps them out of their next eligible Wild Card spin and is used up.",
    label: "Arm shield",
    available: (person: Person) => person.shields > 0 && !person.shieldArmed,
  },
  volunteer: {
    title: (name: string) => `Record a turn for ${name}?`,
    description:
      "They go first without spinning, earn a shield (up to two), and get one-third of their usual weight on their next eligible Wild Card spin.",
    label: "Record turn",
    available: (person: Person, mode: Mode) =>
      person.active && mode === "wildcard",
  },
};

export default function TeamWheel({ team }: { team?: TeamAccess }) {
  const apiBase = teamApiBase(team?.publicId);
  const request = useCallback(
    function requestForTeam<T>(path: string, body?: unknown, method?: string) {
      return requestJson<T>(`${apiBase}${path}`, body, method);
    },
    [apiBase],
  );
  const [state, setState] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState<Mode>("random");
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState(false);
  const [operation, setOperation] = useState<"save" | "spin" | null>(null);
  const busy = operation !== null;
  const spinning = operation === "spin";
  const operating = useRef(false);
  const revision = useRef<number | null>(null);
  const [name, setName] = useState("");
  const [manage, setManage] = useState(false);
  const [drawer, setDrawer] = useState<"team" | "history" | null>(null);
  const teamOpen = drawer === "team";
  const historyOpen = drawer === "history";
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [pendingModifier, setPendingModifier] = useState<{
    personId: string;
    action: keyof typeof modifierConfirmations;
  } | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Person | null>(null);
  const [sortByPicks, setSortByPicks] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState(team?.joinCode ?? null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [outcome, setOutcome] = useState<SpinResult | TurnResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [sitOutIds, setSitOutIds] = useState<string[]>([]);
  const [pendingSpin, setPendingSpin] = useState<{
    id: string;
    mode: Mode;
    excludedIds: string[];
  } | null>(null);
  const [older, setOlder] = useState<HistoryPage | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const teamButton = useRef<HTMLButtonElement>(null);
  const closeTeamButton = useRef<HTMLButtonElement>(null);
  const historyButton = useRef<HTMLButtonElement>(null);
  const spinButton = useRef<HTMLButtonElement>(null);
  const hubIcon = useRef<SVGSVGElement>(null);
  const buttonIcon = useRef<SVGSVGElement>(null);
  const audio = useRef<SpinAudio | null>(null);
  const volunteerRequests = useRef(new Map<string, string>());
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      const player = audio.current;
      audio.current = null;
      if (player) void player.context.close().catch(() => {});
    },
    [],
  );
  const apply = useCallback((next: Snapshot) => {
    if (revision.current !== null && next.revision < revision.current) return;
    if (revision.current !== next.revision) setOlder(null);
    revision.current = next.revision;
    setState(next);
    setSyncError(false);
  }, []);
  const refresh = useCallback(
    async (initial = false) => {
      if (operating.current || document.hidden) return;
      try {
        apply(await request<Snapshot>("/state"));
        if (initial) setError("");
      } catch (issue) {
        setSyncError(true);
        if (initial)
          setError(
            issue instanceof Error ? issue.message : "Couldn’t load your team.",
          );
      }
    },
    [apply, request],
  );
  useEffect(() => {
    // Initial refresh updates state only after its network request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(true);
    const timer = setInterval(() => void refresh(), 15000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [refresh]);
  const candidates = useMemo(
    () => getCandidates(state?.people ?? [], mode, sitOutIds),
    [state?.people, mode, sitOutIds],
  );
  const spinOutcome = outcome && "candidates" in outcome ? outcome : null;
  const shownCandidates = spinOutcome?.candidates ?? candidates;
  const spinDisabled = busy || !state || (!candidates.length && !pendingSpin);
  const spinLabel = spinning
    ? "Spinning…"
    : pendingSpin
      ? "Retry this spin"
      : "Spin the wheel";
  const SpinIcon = spinning ? LoaderCircle : Shuffle;
  const SoundIcon = soundOn ? Volume2 : VolumeX;
  const spinWheel = () => void startSpin();
  const odds = new Map(
    candidates.map((candidate) => [candidate.id, candidate.probability]),
  );
  const roster = [...(state?.people ?? [])].sort(
    (a, b) =>
      Number(odds.has(b.id)) - Number(odds.has(a.id)) ||
      (sortByPicks ? b.count - a.count : 0),
  );
  const peopleById = new Map(
    (state?.people ?? []).map((person) => [person.id, person]),
  );
  const modifierPerson = pendingModifier
    ? peopleById.get(pendingModifier.personId)
    : undefined;
  const confirmation = pendingModifier
    ? modifierConfirmations[pendingModifier.action]
    : null;
  const modifierAvailable =
    modifierPerson && confirmation?.available(modifierPerson, mode);
  const winner = outcome ? peopleById.get(outcome.pick.personId) : undefined;
  const history = [...(state?.history.items ?? []), ...(older?.items ?? [])];
  const nextCursor = older ? older.nextCursor : state?.history.nextCursor;
  const latestValid = state?.history.items.find((pick) => !pick.undoneAt);
  const leaders = state?.leaders ?? [];
  const topCount = leaders[0]?.count ?? 0;
  const anyActive = state?.people.some((person) => person.active);
  const anyShielded =
    mode === "wildcard" &&
    state?.people.some(
      (person) =>
        person.active && person.shieldArmed && !sitOutIds.includes(person.id),
    );
  const emptyNote = anyShielded
    ? "Disarm a shield in Team."
    : anyActive
      ? "Refresh to clear sit-outs."
      : state?.people.length
        ? "Resume someone in Team."
        : "Add a name to start.";

  function closeTeam() {
    setDrawer((current) => (current === "team" ? null : current));
    setManage(false);
    setEditing(null);
    setConfirmingDelete(null);
    setPendingModifier(null);
  }
  function confirmModifier() {
    if (
      !pendingModifier ||
      !modifierPerson ||
      !modifierAvailable ||
      busy ||
      pendingSpin
    )
      return;
    setPendingModifier(null);
    if (pendingModifier.action === "volunteer") {
      void goFirst(modifierPerson);
      return;
    }
    const values =
      pendingModifier.action === "absence"
        ? { absent: true }
        : { shieldArmed: true };
    void mutate(`/people/${modifierPerson.id}`, values, "PATCH");
  }

  function closeHistory() {
    setDrawer((current) => (current === "history" ? null : current));
  }

  async function mutate(path: string, body: unknown, method = "POST") {
    if (operating.current) return false;
    operating.current = true;
    setOperation("save");
    setError("");
    try {
      apply(await request<Snapshot>(path, body, method));
      setOutcome(null);
      setRevealed(false);
      setLastDeleted(null);
      return true;
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Couldn’t save that change.",
      );
      return false;
    } finally {
      operating.current = false;
      setOperation(null);
    }
  }
  async function removeMember(person: Person) {
    if (await mutate(`/people/${person.id}`, {}, "DELETE")) {
      setLastDeleted(person);
      setConfirmingDelete(null);
      setEditing(null);
    }
  }
  async function startSpin(sittingOut = sitOutIds) {
    if (operating.current) return;
    const people = state?.people ?? [];
    const excludedIds = people
      .filter((person) => sittingOut.includes(person.id))
      .map((person) => person.id);
    if (!pendingSpin && !getCandidates(people, mode, excludedIds).length)
      return;
    try {
      // Unlock audio from the Spin gesture before waiting on the saved result.
      const player = (audio.current ??= createSpinAudio());
      player.volume.gain.value = soundOn ? 1 : 0;
      if (player.context.state !== "running") {
        void player.context.resume().catch(() => {});
      }
    } catch {
      // The wheel can still spin if audio is unavailable.
    }
    operating.current = true;
    setWinnerOpen(false);
    setOperation("spin");
    setError("");
    setRevealed(false);
    const pending = pendingSpin ?? {
      id: crypto.randomUUID(),
      mode,
      excludedIds,
    };
    setPendingSpin(pending);
    try {
      const result = await request<SpinResult>("/spins", pending);
      setPendingSpin(null);
      setOutcome(result);
      setLastDeleted(null);
    } catch (issue) {
      if (issue instanceof RequestError && issue.status < 500)
        setPendingSpin(null);
      setError(
        (issue instanceof Error
          ? issue.message
          : "The connection was interrupted.") +
          " If the result is uncertain, retrying resumes the same spin.",
      );
      operating.current = false;
      setOperation(null);
    }
  }
  function toggleSound() {
    const enabled = !soundOn;
    setSoundOn(enabled);
    if (audio.current) audio.current.volume.gain.value = enabled ? 1 : 0;
  }
  async function goFirst(person: Person) {
    if (operating.current || pendingSpin) return;
    operating.current = true;
    setOperation("save");
    setError("");
    const id = volunteerRequests.current.get(person.id) ?? crypto.randomUUID();
    volunteerRequests.current.set(person.id, id);
    try {
      const result = await request<TurnResult>("/volunteers", {
        id,
        personId: person.id,
      });
      volunteerRequests.current.delete(person.id);
      apply(result.state);
      setOutcome(result);
      setRevealed(true);
      setLastDeleted(null);
      closeTeam();
      setWinnerOpen(true);
    } catch (issue) {
      if (issue instanceof RequestError && issue.status < 500)
        volunteerRequests.current.delete(person.id);
      setError(
        issue instanceof Error
          ? issue.message
          : "Couldn’t save the turn. Try again for the same teammate.",
      );
    } finally {
      operating.current = false;
      setOperation(null);
    }
  }
  function sitOutWinner() {
    if (operating.current || !winner?.active || sitOutIds.includes(winner.id))
      return;
    const next = [...sitOutIds, winner.id];
    setSitOutIds(next);
    setWinnerOpen(false);
    setOutcome(null);
    setRevealed(false);
    void startSpin(next);
  }
  function finishSpin() {
    if (outcome) apply(outcome.state);
    setRevealed(true);
    setWinnerOpen(true);
    operating.current = false;
    setOperation(null);
    void refresh();
  }
  async function copyLink() {
    try {
      const link = inviteCode
        ? `${window.location.origin}/#join=${formatTeamCode(inviteCode)}`
        : window.location.origin;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      if (inviteCode)
        setInviteError(
          "Couldn’t copy the link. You can share the team code instead.",
        );
      else
        setError(
          "Couldn’t copy the link. You can copy it from your browser’s address bar.",
        );
    }
  }
  async function loadInvite(rotate = false) {
    if (inviteBusy) return;
    setInviteBusy(true);
    setInviteError("");
    setCopied(false);
    try {
      const { code } = await request<{ code: string }>(
        "/invite",
        rotate ? {} : undefined,
      );
      setInviteCode(code);
    } catch (issue) {
      setInviteError(
        issue instanceof Error ? issue.message : "Couldn’t load the team code.",
      );
    } finally {
      setInviteBusy(false);
    }
  }
  async function loadOlder() {
    if (!nextCursor || loadingHistory) return;
    setLoadingHistory(true);
    const startedRevision = revision.current;
    try {
      const page = await request<HistoryPage>(`/history?before=${nextCursor}`);
      if (revision.current === startedRevision)
        setOlder((previous) => ({
          items: [...(previous?.items ?? []), ...page.items],
          nextCursor: page.nextCursor,
        }));
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Couldn’t load older picks.",
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  const errorNotice = error ? (
    <div className="error-banner" role="alert">
      <span>{error}</span>
      <button
        className="text-button"
        onClick={() => {
          setError("");
          void refresh(true);
        }}
      >
        Refresh
      </button>
      <button
        className="icon-button"
        aria-label="Dismiss error"
        onClick={() => setError("")}
      >
        <X size={17} />
      </button>
    </div>
  ) : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <Link className="brand" href="/" aria-label="Team Wheel home">
            <span className="brand-mark">
              <ArrowUpRight size={25} strokeWidth={1.8} />
            </span>
            <span>
              teamwheel<span className="brand-period">.</span>
            </span>
          </Link>
          <button
            className="button drawer-trigger team-trigger"
            ref={teamButton}
            aria-label="Open team"
            aria-haspopup="dialog"
            aria-expanded={teamOpen}
            aria-controls="team-drawer"
            disabled={spinning}
            onClick={() => setDrawer("team")}
          >
            <Users size={17} />
            <span>Team</span>
            <span className="count-tag">{state?.people.length ?? 0}</span>
          </button>
        </div>
        <div className="header-actions">
          <span className={`sync-status ${syncError ? "sync-offline" : ""}`}>
            <Cloud size={16} />
            <span>
              {syncError
                ? "Reconnecting"
                : state
                  ? "Saved for your team"
                  : "Connecting"}
            </span>
          </span>
          <button
            className="button drawer-trigger"
            ref={historyButton}
            aria-label="Open history"
            aria-haspopup="dialog"
            aria-expanded={historyOpen}
            aria-controls="history-drawer"
            disabled={spinning}
            onClick={() => setDrawer("history")}
          >
            <History size={17} />
            <span>History</span>
          </button>
          {inviteCode ? (
            <>
              <button
                type="button"
                id="invite-trigger"
                className="button button-secondary share-button"
                aria-label="Invite teammates"
                popoverTarget="team-invite"
                onClick={() => void loadInvite()}
              >
                <Link2 size={17} /> <span>Invite</span>
              </button>
              <div
                id="team-invite"
                className="fairness-popover invite-popover"
                popover="auto"
                role="region"
                aria-labelledby="invite-trigger"
              >
                <p>Team code</p>
                <output className="invite-code">
                  {formatTeamCode(inviteCode)}
                </output>
                <div className="invite-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={inviteBusy}
                    onClick={copyLink}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Copied" : "Copy invite link"}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={inviteBusy}
                    onClick={() => void loadInvite(true)}
                  >
                    Change code
                  </button>
                </div>
                {inviteError && (
                  <p className="invite-error" role="alert">
                    {inviteError}
                  </p>
                )}
              </div>
            </>
          ) : (
            !team && (
              <button
                className="button button-secondary share-button"
                aria-label={copied ? "Link copied" : "Copy team link"}
                onClick={copyLink}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "Link copied" : "Copy team link"}</span>
              </button>
            )
          )}
        </div>
      </header>
      <main>
        <div className="page-heading">
          <h1>{team?.name ?? "Who’s up next?"}</h1>
        </div>
        {!drawer && !winnerOpen && errorNotice}
        <div className="workspace">
          <section className="spin-workspace" aria-label="Spin the team wheel">
            <div
              className="mode-picker"
              role="group"
              aria-label="Selection mode"
            >
              {spinModes.map((value) => {
                const { label, Icon } = modeInfo[value];
                return (
                  <button
                    key={value}
                    aria-pressed={mode === value}
                    disabled={busy || Boolean(pendingSpin)}
                    onClick={() => {
                      setMode(value);
                      setOutcome(null);
                      setRevealed(false);
                    }}
                  >
                    <Icon size={17} /> {label}
                  </button>
                );
              })}
            </div>
            <p className="mode-description">{modeInfo[mode].description}</p>
            <Wheel
              candidates={shownCandidates}
              people={state?.people ?? []}
              outcome={spinOutcome}
              revealed={revealed || Boolean(pendingSpin)}
              onFinish={finishSpin}
              onOpenTeam={() => setDrawer("team")}
              emptyNote={emptyNote}
              hubIcon={hubIcon}
              buttonIcon={buttonIcon}
              audio={audio}
              hub={
                <button
                  type="button"
                  className="wheel-hub"
                  aria-label={spinLabel}
                  title={spinLabel}
                  disabled={spinDisabled}
                  onClick={spinWheel}
                >
                  <SpinIcon ref={hubIcon} size={20} aria-hidden />
                </button>
              }
            />
            <div
              className={
                winnerOpen ? "spin-result result-obscured" : "spin-result"
              }
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {spinning && !revealed ? (
                <>
                  <span className="result-caption">
                    {pendingSpin ? "Saving your selection…" : "Spinning…"}
                  </span>
                  <strong>Choosing a teammate</strong>
                </>
              ) : revealed && outcome ? (
                <>
                  <span className="result-caption">
                    {outcome.pick.undoneAt
                      ? "This pick was undone"
                      : "You’re up next"}
                  </span>
                  <div className="winner-identity">
                    {winner && (
                      <Avatar
                        id={winner.id}
                        name={winner.name}
                        color={winner.color ?? winner.defaultColor}
                        photoUrl={winner.photoUrl}
                        className="winner-avatar"
                      />
                    )}
                    <strong className="winner-name">
                      {outcome.pick.personName}
                      <span className="winner-period">.</span>
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <strong className="ready-label">
                    {candidates.length
                      ? "Ready to spin"
                      : "No active teammates"}
                  </strong>
                  <span className="result-caption">
                    {candidates.length
                      ? `${candidates.length} ${candidates.length === 1 ? "person" : "people"} active.`
                      : emptyNote}
                  </span>
                </>
              )}
            </div>
            <button
              className="button spin-button"
              ref={spinButton}
              disabled={spinDisabled}
              onClick={spinWheel}
            >
              <SpinIcon ref={buttonIcon} size={20} aria-hidden />
              {spinLabel}
              <ArrowUpRight size={19} />
            </button>
            <div className="spin-tools">
              <button
                type="button"
                id="odds-help-trigger"
                className="spin-tool"
                popoverTarget="odds-help"
              >
                <CircleHelp size={14} /> How the odds work
              </button>
              <button
                type="button"
                className="spin-tool"
                aria-label="Wheel sound"
                aria-pressed={soundOn}
                onClick={toggleSound}
              >
                <SoundIcon size={15} aria-hidden />
                {soundOn ? "Sound on" : "Sound off"}
              </button>
            </div>
            <div
              id="odds-help"
              className="fairness-popover"
              popover="auto"
              role="region"
              aria-labelledby="odds-help-trigger"
            >
              <p>
                <strong>Random</strong> gives everyone equal odds on each spin,
                so repeats can happen.
              </p>
              <p>
                <strong>Balanced</strong> gives people with fewer turns more
                weight of 1 ÷ (1 + turns − the team’s lowest active count).
              </p>
              <p>
                <strong>Wild Card</strong> doubles an absent teammate’s weight.
                Volunteering divides their weight by three on their next
                eligible spin. An armed shield keeps them off one spin.
              </p>
              <p>A bigger slice means a bigger chance.</p>
            </div>
          </section>
        </div>
      </main>
      <WinnerDialog
        pick={outcome?.pick}
        person={winner}
        open={winnerOpen}
        canSpin={candidates.length > 0}
        canSpinWithoutWinner={candidates.some(
          (candidate) => candidate.id !== winner?.id,
        )}
        onClose={() => setWinnerOpen(false)}
        onSpin={spinWheel}
        onSitOut={sitOutWinner}
        returnFocusRef={candidates.length ? spinButton : teamButton}
      />
      <Modal
        id="history-drawer"
        labelledBy="history-heading"
        className="side-drawer side-drawer-right"
        open={historyOpen}
        onClose={closeHistory}
        returnFocusRef={historyButton}
      >
        <section className="history-panel">
          <div className="panel-heading">
            <div className="panel-title">
              <h2 id="history-heading">Pick history</h2>
              <span className="history-total">
                {state?.totalPicks ?? 0} valid{" "}
                {state?.totalPicks === 1 ? "turn" : "turns"}
              </span>
            </div>
            <button
              className="icon-button close-drawer"
              aria-label="Close history"
              onClick={closeHistory}
              autoFocus
            >
              <X size={20} />
            </button>
          </div>
          {historyOpen && errorNotice}
          {leaders.length > 0 && (
            <p className="history-insight">
              {leaders.length === 1 ? (
                <>
                  <strong>{leaders[0].name}</strong> has the most turns
                </>
              ) : leaders.length <= 3 ? (
                <>
                  <strong>
                    {leaders.map((person) => person.name).join(" & ")}
                  </strong>{" "}
                  are tied for most turns
                </>
              ) : (
                <>
                  <strong>{leaders.length} teammates</strong> are tied for most
                  turns
                </>
              )}{" "}
              — {topCount} {topCount === 1 ? "turn" : "turns"}
              {leaders.length > 1 ? " each" : ""}.
            </p>
          )}
          {!history.length ? (
            <div className="history-empty">
              <span className="history-empty-icon">
                <History size={22} strokeWidth={1.5} />
              </span>
              <div>
                <strong>{state ? "No turns yet" : "Loading history…"}</strong>
                <p>{state ? "Spin the wheel to record the first turn." : ""}</p>
              </div>
            </div>
          ) : (
            <>
              <ol className="history-list" role="list">
                {history.map((pick) => {
                  const person = peopleById.get(pick.personId);
                  const { label, Icon } =
                    pick.mode === "volunteer"
                      ? { label: "Volunteered", Icon: Hand }
                      : modeInfo[pick.mode];
                  return (
                    <li
                      key={pick.id}
                      className={
                        pick.undoneAt
                          ? "history-row pick-undone"
                          : "history-row"
                      }
                    >
                      <Avatar
                        id={pick.personId}
                        name={pick.personName}
                        color={person?.color ?? person?.defaultColor}
                        photoUrl={person?.photoUrl}
                        className="history-avatar"
                      />
                      <div className="history-entry">
                        <div className="history-person">
                          <strong title={pick.personName}>
                            {pick.personName}
                          </strong>
                          {pick.undoneAt && (
                            <span className="undone-label">Undone</span>
                          )}
                        </div>
                        <div className="history-meta">
                          <span className={`mode-tag mode-tag-${pick.mode}`}>
                            <Icon size={12} /> {label}
                          </span>
                          <time
                            dateTime={pick.createdAt}
                            title={new Date(pick.createdAt).toLocaleString()}
                          >
                            {dateLabel(pick.createdAt)}
                          </time>
                        </div>
                      </div>
                      {pick.id === latestValid?.id && (
                        <button
                          className="text-button undo-button"
                          disabled={busy || Boolean(pendingSpin)}
                          onClick={() => void mutate("/undo", { id: pick.id })}
                        >
                          <RotateCcw size={13} />
                          Undo
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
              {nextCursor && (
                <button
                  className="button load-more"
                  disabled={loadingHistory}
                  onClick={loadOlder}
                >
                  {loadingHistory ? (
                    <LoaderCircle size={15} className="loading-icon" />
                  ) : (
                    <ChevronDown size={15} />
                  )}
                  Show older picks
                </button>
              )}
            </>
          )}
        </section>
      </Modal>
      <Modal
        id="team-drawer"
        labelledBy="team-heading"
        className="side-drawer"
        open={teamOpen}
        onClose={closeTeam}
        returnFocusRef={teamButton}
      >
        <aside className="team-panel" aria-labelledby="team-heading">
          <div className="panel-heading">
            <div className="panel-title">
              <h2 id="team-heading">Your team</h2>
              <span className="count-tag">{state?.people.length ?? 0}</span>
            </div>
            <div className="team-panel-actions">
              <button
                className="text-button manage-button"
                aria-pressed={manage}
                disabled={busy || !state || Boolean(pendingSpin)}
                onClick={() => {
                  setManage(!manage);
                  setEditing(null);
                  setConfirmingDelete(null);
                }}
              >
                {manage ? <Check size={14} /> : <Pencil size={14} />}
                {manage ? "Done" : "Manage"}
              </button>
              <button
                className="icon-button close-drawer"
                aria-label="Close team"
                ref={closeTeamButton}
                onClick={closeTeam}
                autoFocus
              >
                <X size={20} />
              </button>
            </div>
          </div>
          {teamOpen && errorNotice}
          {lastDeleted && (
            <div className="member-deleted-notice" role="status">
              <span>
                <strong>{lastDeleted.name}</strong> was removed from the team.
              </span>
              <button
                className="text-button"
                disabled={busy || Boolean(pendingSpin)}
                onClick={() =>
                  void mutate(`/people/${lastDeleted.id}/restore`, {})
                }
              >
                <RotateCcw size={14} />
                Undo deletion
              </button>
              <button
                className="icon-button"
                aria-label="Dismiss deletion notice"
                onClick={() => setLastDeleted(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="roster-head">
            <span>Teammate</span>
            <button
              onClick={() => setSortByPicks(!sortByPicks)}
              aria-pressed={sortByPicks}
            >
              Turns {sortByPicks && <ArrowDown size={11} />}
            </button>
            <span>Next odds</span>
          </div>
          <div
            className={`roster-list${editing || confirmingDelete ? " roster-editing" : ""}`}
            aria-busy={!state}
          >
            {!state ? (
              <div className="roster-placeholder">
                <LoaderCircle size={22} className="loading-icon" />
                <p>Loading your team…</p>
              </div>
            ) : !roster.length ? (
              <div className="roster-placeholder">
                <Users size={29} strokeWidth={1.4} />
                <strong>No teammates yet</strong>
                <button
                  className="text-button"
                  onClick={() => nameInput.current?.focus()}
                >
                  Add the first person <ArrowUpRight size={14} />
                </button>
              </div>
            ) : (
              roster.map((person) => (
                <div
                  className={`person-row ${odds.has(person.id) ? "" : "person-paused"}`}
                  key={person.id}
                >
                  <div className="person-identity">
                    <Avatar
                      id={person.id}
                      name={person.name}
                      color={person.color ?? person.defaultColor}
                      photoUrl={person.photoUrl}
                    />
                    <div className="person-copy">
                      <span className="person-name" title={person.name}>
                        {person.name}
                      </span>
                      {manage ? (
                        <div className="person-tools">
                          <button
                            disabled={busy || Boolean(pendingSpin)}
                            aria-expanded={editing === person.id}
                            onClick={() => {
                              setEditing(
                                editing === person.id ? null : person.id,
                              );
                              setConfirmingDelete(null);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            disabled={busy || Boolean(pendingSpin)}
                            onClick={() =>
                              void mutate(
                                `/people/${person.id}`,
                                { active: !person.active },
                                "PATCH",
                              )
                            }
                          >
                            {person.active ? (
                              <Pause size={10} />
                            ) : (
                              <Play size={10} />
                            )}
                            {person.active ? "Pause" : "Resume"}
                          </button>
                          <button
                            className="delete-member"
                            aria-label={`Delete ${person.name}`}
                            disabled={busy || Boolean(pendingSpin)}
                            onClick={() => {
                              setConfirmingDelete(person.id);
                              setEditing(null);
                            }}
                          >
                            <Trash2 size={11} />
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="person-subtitle">
                          {!person.active
                            ? "Paused"
                            : sitOutIds.includes(person.id)
                              ? "Sitting out"
                              : person.lastPickedAt
                                ? `Last turn ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(person.lastPickedAt))}`
                                : "No turns yet"}
                        </span>
                      )}
                      {(person.absent ||
                        person.shields > 0 ||
                        (mode === "wildcard" && person.volunteerCooldown)) && (
                        <div className="person-badges">
                          {person.absent && (
                            <span className="person-badge person-badge-absent">
                              {mode === "wildcard" ? "Absent · 2×" : "Absent"}
                            </span>
                          )}
                          {mode === "wildcard" && person.volunteerCooldown && (
                            <span className="person-badge">
                              ⅓× next eligible spin
                            </span>
                          )}
                          {person.shields > 0 && (
                            <span className="person-badge">
                              <Shield size={11} />
                              {person.shields}{" "}
                              {person.shields === 1 ? "shield" : "shields"}
                              {person.shieldArmed && " · armed"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="pick-count">{person.count}</span>
                  <span className="person-odds">
                    {odds.has(person.id)
                      ? percentage(odds.get(person.id) ?? 0)
                      : "—"}
                  </span>
                  <PersonModifiers
                    person={person}
                    disabled={busy || Boolean(pendingSpin)}
                    onAttendance={() => {
                      if (person.absent)
                        void mutate(
                          `/people/${person.id}`,
                          { absent: false },
                          "PATCH",
                        );
                      else
                        setPendingModifier({
                          personId: person.id,
                          action: "absence",
                        });
                    }}
                    onVolunteer={
                      mode === "wildcard" && person.active
                        ? () =>
                            setPendingModifier({
                              personId: person.id,
                              action: "volunteer",
                            })
                        : undefined
                    }
                    onShield={
                      person.shields > 0
                        ? () => {
                            if (person.shieldArmed)
                              void mutate(
                                `/people/${person.id}`,
                                { shieldArmed: false },
                                "PATCH",
                              );
                            else
                              setPendingModifier({
                                personId: person.id,
                                action: "shield",
                              });
                          }
                        : undefined
                    }
                  />
                  {confirmingDelete === person.id && (
                    <div
                      className="member-delete-confirmation"
                      role="group"
                      aria-label={`Delete ${person.name}?`}
                    >
                      <p>
                        Delete <strong>{person.name}</strong> from the team?
                      </p>
                      <p className="delete-history-note">
                        Past picks and statistics will be kept.
                      </p>
                      <div className="delete-actions">
                        <button
                          className="text-button"
                          disabled={busy}
                          autoFocus
                          onClick={() => setConfirmingDelete(null)}
                        >
                          Cancel deletion
                        </button>
                        <button
                          className="button confirm-member-delete"
                          aria-label={`Confirm deleting ${person.name}`}
                          disabled={busy || Boolean(pendingSpin)}
                          onClick={() => void removeMember(person)}
                        >
                          {operation === "save" ? (
                            <LoaderCircle size={14} className="loading-icon" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete member
                        </button>
                      </div>
                    </div>
                  )}
                  {editing === person.id && (
                    <PersonEditor
                      person={person}
                      disabled={busy || Boolean(pendingSpin)}
                      onCancel={() => setEditing(null)}
                      onSave={(values) =>
                        mutate(`/people/${person.id}`, values, "PATCH")
                      }
                    />
                  )}
                </div>
              ))
            )}
          </div>
          <form
            className="add-person"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                name.trim() &&
                (await mutate("/people", { name: name.trim() }))
              ) {
                setName("");
                nameInput.current?.focus();
              }
            }}
          >
            <label htmlFor="person-name" className="sr-only">
              Teammate’s name
            </label>
            <input
              id="person-name"
              ref={nameInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Add a teammate’s name"
              maxLength={60}
              autoComplete="off"
              disabled={!state || busy || Boolean(pendingSpin)}
              required
            />
            <button
              aria-label="Add teammate"
              disabled={!state || busy || !name.trim() || Boolean(pendingSpin)}
            >
              <Plus size={21} />
            </button>
          </form>
          <div className="team-panel-footer">
            <span className="status-dot" /> {candidates.length} active ·{" "}
            {state?.totalPicks ?? 0}{" "}
            {state?.totalPicks === 1 ? "turn" : "turns"} saved
            {team && (
              <Link className="switch-team" href="/">
                Switch team
              </Link>
            )}
          </div>
        </aside>
      </Modal>
      <Modal
        id="modifier-confirmation"
        labelledBy="modifier-confirmation-title"
        describedBy="modifier-confirmation-description"
        className="modifier-confirmation"
        open={teamOpen && Boolean(modifierPerson)}
        onClose={() => setPendingModifier(null)}
        returnFocusRef={closeTeamButton}
      >
        {confirmation && modifierPerson && (
          <>
            <h2 id="modifier-confirmation-title">
              {confirmation.title(modifierPerson.name)}
            </h2>
            <p id="modifier-confirmation-description">
              {modifierAvailable
                ? confirmation.description
                : "This action is no longer available."}
            </p>
            <div className="modifier-confirmation-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setPendingModifier(null)}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className="button modifier-confirm-button"
                disabled={busy || Boolean(pendingSpin) || !modifierAvailable}
                onClick={confirmModifier}
              >
                {confirmation.label}
              </button>
            </div>
          </>
        )}
      </Modal>
      {syncError && (
        <footer className="page-footer" role="status">
          <span>
            <Cloud size={13} />
            Connection interrupted · refresh to reconnect
          </span>
        </footer>
      )}
    </div>
  );
}
