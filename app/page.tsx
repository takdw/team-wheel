"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Copy,
  History,
  LoaderCircle,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Users,
  X,
} from "lucide-react";
import {
  candidateMidpoint,
  getCandidates,
  palette,
  personColor,
  type Candidate,
  type HistoryPage,
  type Mode,
  type Person,
  type Snapshot,
  type SpinResult,
} from "@/lib/wheel";
import { animateWheel } from "@/lib/motion";

class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new RequestError(
      data?.error ??
        "Couldn’t reach the team app. Check your connection and try again.",
      response.status,
    );
  }
  return response.json() as Promise<T>;
}
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
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase();
}

function Wheel({
  candidates,
  outcome,
  onFinish,
}: {
  candidates: Candidate[];
  outcome: SpinResult | null;
  onFinish: () => void;
}) {
  const rotor = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const finish = useRef(onFinish);
  finish.current = onFinish;
  useEffect(() => {
    if (!outcome || !rotor.current) return;
    const element = rotor.current;
    const target =
      360 - candidateMidpoint(outcome.candidates, outcome.pick.personId);
    const start = angle.current;
    const end = start + 360 * 5 + ((target - (start % 360) + 360) % 360);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return animateWheel(element, start, end, reduced, () => {
      angle.current = end;
      finish.current();
    });
  }, [outcome]);
  useEffect(() => {
    if (!outcome && rotor.current) {
      angle.current = 0;
      rotor.current.style.transform = "rotate(0deg)";
    }
  }, [outcome]);
  const entries = candidates.length
    ? candidates
    : palette.map((_, index) => ({
        id: `empty-${index}`,
        name: "",
        probability: 1 / 8,
      }));
  let offset = 0;
  return (
    <div className={`wheel-wrap ${candidates.length ? "" : "wheel-empty"}`}>
      <div className="wheel-pointer" aria-hidden="true">
        <svg viewBox="0 0 30 38">
          <path d="M3 4 Q15 -2 27 4 L18 32 Q15 38 12 32 Z" />
        </svg>
      </div>
      <div className="wheel-rotor" ref={rotor}>
        <svg
          viewBox="0 0 520 520"
          role="img"
          aria-label={
            candidates.length
              ? `Wheel with ${candidates.length} ${candidates.length === 1 ? "person" : "people"}. Individual odds are shown in Your team.`
              : "Your wheel is waiting for teammates."
          }
        >
          <circle cx="260" cy="260" r="255" fill="#f4f2ec" />
          {entries.map((candidate, index) => {
            const start = offset * Math.PI * 2;
            offset += candidate.probability;
            const end = offset * Math.PI * 2;
            const mid = (start + end) / 2;
            const radius = 244;
            const x1 = 260 + radius * Math.sin(start),
              y1 = 260 - radius * Math.cos(start);
            const x2 = 260 + radius * Math.sin(end),
              y2 = 260 - radius * Math.cos(end);
            const degrees = (mid * 180) / Math.PI - 90;
            const left = Math.sin(mid) < 0;
            const visibleName =
              Array.from(candidate.name)
                .slice(0, entries.length > 14 ? 11 : 18)
                .join("") +
              (Array.from(candidate.name).length >
              (entries.length > 14 ? 11 : 18)
                ? "…"
                : "");
            return (
              <g key={candidate.id}>
                {candidate.probability > 0.9999 ? (
                  <circle
                    cx="260"
                    cy="260"
                    r={radius}
                    fill={personColor(candidate.id)}
                  />
                ) : (
                  <path
                    d={`M260 260 L${x1} ${y1} A${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`}
                    fill={
                      candidates.length
                        ? personColor(candidate.id)
                        : palette[index]
                    }
                    stroke="#f7f6f0"
                    strokeWidth="2"
                  />
                )}
                {candidate.name && candidate.probability > 0.025 && (
                  <g transform={`translate(260 260) rotate(${degrees})`}>
                    <text
                      x={left ? -213 : 213}
                      y="6"
                      textAnchor={left ? "start" : "end"}
                      transform={left ? "rotate(180)" : undefined}
                      className="wheel-label"
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
      </div>
      <div className="wheel-hub" aria-hidden="true">
        <ArrowUpRight size={30} strokeWidth={1.6} />
      </div>
      {!candidates.length && (
        <div className="empty-wheel-label">
          <Users size={25} />
          <strong>Make it your team’s.</strong>
          <span>Add a name to get started.</span>
        </div>
      )}
    </div>
  );
}

function NameEditor({
  person,
  disabled,
  onSave,
  onCancel,
}: {
  person: Person;
  disabled: boolean;
  onSave: (name: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(person.name);
  return (
    <form
      className="name-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onSave(name.trim())) onCancel();
      }}
    >
      <input
        aria-label={`New name for ${person.name}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={60}
        required
        autoFocus
      />
      <button
        className="icon-button"
        title="Save name"
        aria-label="Save name"
        disabled={disabled || !name.trim()}
      >
        <Check size={16} />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Cancel rename"
        onClick={onCancel}
      >
        <X size={16} />
      </button>
    </form>
  );
}

export default function Home() {
  const [state, setState] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState<Mode>("random");
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState(false);
  const [busy, setBusy] = useState(false);
  const operating = useRef(false);
  const revision = useRef<number | null>(null);
  const [name, setName] = useState("");
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [sortByPicks, setSortByPicks] = useState(false);
  const [copied, setCopied] = useState(false);
  const [outcome, setOutcome] = useState<SpinResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pendingSpin, setPendingSpin] = useState<{
    id: string;
    mode: Mode;
  } | null>(null);
  const [older, setOlder] = useState<HistoryPage | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        apply(await request<Snapshot>("/api/state"));
        if (initial) setError("");
      } catch (issue) {
        setSyncError(true);
        if (initial)
          setError(
            issue instanceof Error ? issue.message : "Couldn’t load your team.",
          );
      }
    },
    [apply],
  );
  useEffect(() => {
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
    () => getCandidates(state?.people ?? [], mode),
    [state?.people, mode],
  );
  const shownCandidates = outcome?.candidates ?? candidates;
  const odds = new Map(
    candidates.map((candidate) => [candidate.id, candidate.probability]),
  );
  const roster = [...(state?.people ?? [])].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      (sortByPicks ? b.count - a.count : 0),
  );
  const history = [...(state?.history.items ?? []), ...(older?.items ?? [])];
  const nextCursor = older ? older.nextCursor : state?.history.nextCursor;
  const latestValid = state?.history.items.find((pick) => !pick.undoneAt);
  const topCount = Math.max(
    0,
    ...(state?.people.map((person) => person.count) ?? []),
  );
  const leaders =
    state?.people.filter(
      (person) => person.count === topCount && topCount > 0,
    ) ?? [];

  async function mutate(path: string, body: unknown, method = "POST") {
    if (operating.current) return false;
    operating.current = true;
    setBusy(true);
    setError("");
    try {
      apply(await request<Snapshot>(path, body, method));
      setOutcome(null);
      setRevealed(false);
      return true;
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Couldn’t save that change.",
      );
      return false;
    } finally {
      operating.current = false;
      setBusy(false);
    }
  }
  async function startSpin() {
    if (operating.current || (!candidates.length && !pendingSpin)) return;
    operating.current = true;
    setBusy(true);
    setError("");
    setRevealed(false);
    const pending = pendingSpin ?? { id: crypto.randomUUID(), mode };
    setPendingSpin(pending);
    try {
      const result = await request<SpinResult>("/api/spins", pending);
      setPendingSpin(null);
      setOutcome(result);
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
      setBusy(false);
    }
  }
  function finishSpin() {
    if (outcome) apply(outcome.state);
    setRevealed(true);
    operating.current = false;
    setBusy(false);
    void refresh();
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Couldn’t copy the link. You can copy it from your browser’s address bar.",
      );
    }
  }
  async function loadOlder() {
    if (!nextCursor || loadingHistory) return;
    setLoadingHistory(true);
    const startedRevision = revision.current;
    try {
      const page = await request<HistoryPage>(
        `/api/history?before=${nextCursor}`,
      );
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Team Wheel home">
          <span className="brand-mark">
            <ArrowUpRight size={25} strokeWidth={1.8} />
          </span>
          <span>
            teamwheel<span className="brand-period">.</span>
          </span>
        </a>
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
            className="button button-secondary share-button"
            onClick={copyLink}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Link copied" : "Copy team link"}
          </button>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <h1>Who’s up next?</h1>
            <p>A little chance. A turn for everyone.</p>
          </div>
          <span className="team-badge">
            <Users size={16} /> Your team’s wheel
          </span>
        </div>
        {error && (
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
        )}
        <div className="workspace">
          <section className="spin-workspace" aria-label="Spin the team wheel">
            <div
              className="mode-picker"
              role="group"
              aria-label="Selection mode"
            >
              <button
                aria-pressed={mode === "random"}
                disabled={busy || Boolean(pendingSpin)}
                onClick={() => {
                  setMode("random");
                  setOutcome(null);
                  setRevealed(false);
                }}
              >
                <Shuffle size={17} /> Random
              </button>
              <button
                aria-pressed={mode === "balanced"}
                disabled={busy || Boolean(pendingSpin)}
                onClick={() => {
                  setMode("balanced");
                  setOutcome(null);
                  setRevealed(false);
                }}
              >
                <Users size={17} /> Balanced
              </button>
            </div>
            <p className="mode-description">
              {mode === "random"
                ? "Equal odds. Every person, every spin."
                : "Fewer past picks. A little more chance."}
            </p>
            <Wheel
              candidates={shownCandidates}
              outcome={outcome}
              onFinish={finishSpin}
            />
            <div
              className="spin-result"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {busy && !revealed ? (
                <>
                  <span className="result-caption">
                    {outcome ? "Around it goes…" : "Saving your selection…"}
                  </span>
                  <strong>Who will it be?</strong>
                </>
              ) : revealed && outcome ? (
                <>
                  <span className="result-caption">
                    {outcome.pick.undoneAt
                      ? "This pick was undone"
                      : "You’re up next"}
                  </span>
                  <strong className="winner-name">
                    {outcome.pick.personName}
                    <span className="winner-period">.</span>
                  </strong>
                </>
              ) : (
                <>
                  <strong className="ready-label">
                    {candidates.length
                      ? "Ready when you are."
                      : "Everyone starts somewhere."}
                  </strong>
                  <span className="result-caption">
                    {candidates.length
                      ? `${candidates.length} ${candidates.length === 1 ? "person" : "people"} in the running.`
                      : "Your first name is all it takes."}
                  </span>
                </>
              )}
            </div>
            <button
              className="button spin-button"
              disabled={busy || !state || (!candidates.length && !pendingSpin)}
              onClick={startSpin}
            >
              {busy ? (
                <LoaderCircle className="loading-icon" size={20} />
              ) : (
                <Shuffle size={20} />
              )}
              {busy
                ? "Spinning…"
                : pendingSpin
                  ? "Retry this spin"
                  : "Spin the wheel"}
              <ArrowUpRight size={19} />
            </button>
            <details className="fairness-help">
              <summary>
                <CircleHelp size={14} /> How the odds work{" "}
                <ChevronDown size={13} />
              </summary>
              <p>
                Random gives everyone equal odds on each spin, so repeats can
                happen. Balanced gives people with fewer picks more weight: 1 ÷
                (1 + picks − the team’s lowest active count). Both modes use
                secure randomness. A bigger slice means a bigger chance.
              </p>
            </details>
          </section>
          <aside className="team-panel" aria-labelledby="team-heading">
            <div className="panel-heading">
              <div className="panel-title">
                <h2 id="team-heading">Your team</h2>
                <span className="count-tag">{candidates.length}</span>
              </div>
              <button
                className="text-button manage-button"
                aria-pressed={manage}
                disabled={busy || !state || Boolean(pendingSpin)}
                onClick={() => {
                  setManage(!manage);
                  setEditing(null);
                }}
              >
                {manage ? <Check size={14} /> : <Pencil size={14} />}
                {manage ? "Done" : "Manage"}
              </button>
            </div>
            <p className="panel-subtitle">Good company. Fair chances.</p>
            <div className="roster-head">
              <span>Teammate</span>
              <button
                onClick={() => setSortByPicks(!sortByPicks)}
                aria-pressed={sortByPicks}
              >
                Picks {sortByPicks && <ArrowDown size={11} />}
              </button>
              <span>Next odds</span>
            </div>
            <div className="roster-list" aria-busy={!state}>
              {!state ? (
                <div className="roster-placeholder">
                  <LoaderCircle size={22} className="loading-icon" />
                  <p>Loading your team…</p>
                </div>
              ) : !roster.length ? (
                <div className="roster-placeholder">
                  <Users size={29} strokeWidth={1.4} />
                  <strong>Bring your people.</strong>
                  <p>
                    Add your teammates below.
                    <br />
                    Their counters will start at zero.
                  </p>
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
                    className={`person-row ${person.active ? "" : "person-paused"}`}
                    key={person.id}
                  >
                    <div className="person-identity">
                      <span
                        className="avatar"
                        style={{ backgroundColor: personColor(person.id) }}
                        aria-hidden="true"
                      >
                        {initials(person.name)}
                      </span>
                      <div className="person-copy">
                        {editing === person.id ? (
                          <NameEditor
                            person={person}
                            disabled={busy}
                            onCancel={() => setEditing(null)}
                            onSave={(nextName) =>
                              mutate(
                                `/api/people/${person.id}`,
                                { name: nextName },
                                "PATCH",
                              )
                            }
                          />
                        ) : (
                          <>
                            <span className="person-name" title={person.name}>
                              {person.name}
                            </span>
                            {manage ? (
                              <div className="person-tools">
                                <button
                                  disabled={busy || Boolean(pendingSpin)}
                                  onClick={() => setEditing(person.id)}
                                >
                                  Rename
                                </button>
                                <button
                                  disabled={busy || Boolean(pendingSpin)}
                                  onClick={() =>
                                    void mutate(
                                      `/api/people/${person.id}`,
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
                              </div>
                            ) : (
                              <span className="person-subtitle">
                                {!person.active
                                  ? "Paused"
                                  : person.lastPickedAt
                                    ? `Last picked ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(person.lastPickedAt))}`
                                    : "Waiting for a first pick"}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <span className="pick-count">{person.count}</span>
                    <span className="person-odds">
                      {person.active
                        ? percentage(odds.get(person.id) ?? 0)
                        : "—"}
                    </span>
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
                  (await mutate("/api/people", { name: name.trim() }))
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
                disabled={
                  !state || busy || !name.trim() || Boolean(pendingSpin)
                }
              >
                <Plus size={21} />
              </button>
            </form>
            <div className="team-panel-footer">
              <span className="status-dot" /> {candidates.length} active ·{" "}
              {state?.totalPicks ?? 0} picks saved
            </div>
          </aside>
        </div>
        <section className="history-section" aria-labelledby="history-heading">
          <div className="history-heading">
            <div>
              <h2 id="history-heading">
                The picks so far<span className="history-dot">.</span>
              </h2>
              <p>Every turn, remembered. Shared with your team.</p>
            </div>
            <span className="history-total">
              <History size={15} />
              {state?.totalPicks ?? 0} valid{" "}
              {(state?.totalPicks ?? 0) === 1 ? "pick" : "picks"}
            </span>
          </div>
          {leaders.length > 0 && (
            <p className="history-insight">
              {leaders.length === 1 ? (
                <>
                  <strong>{leaders[0].name}</strong> has been picked most often
                </>
              ) : leaders.length <= 3 ? (
                <>
                  <strong>
                    {leaders.map((person) => person.name).join(" & ")}
                  </strong>{" "}
                  are tied for most picks
                </>
              ) : (
                <>
                  <strong>{leaders.length} teammates</strong> are tied for most
                  picks
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
                <strong>
                  {state
                    ? "The first turn is still to come."
                    : "Loading your team’s history."}
                </strong>
                <p>
                  {state
                    ? "Give the wheel a spin. Every pick will be saved here."
                    : "Your saved picks will appear here."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="history-scroll">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th scope="col">Who got the turn</th>
                      <th scope="col">Mode</th>
                      <th scope="col">Picked at</th>
                      <th scope="col" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((pick) => (
                      <tr
                        key={pick.id}
                        className={pick.undoneAt ? "pick-undone" : ""}
                      >
                        <td>
                          <div className="history-person">
                            <span
                              className="history-avatar"
                              style={{
                                backgroundColor: personColor(pick.personId),
                              }}
                              aria-hidden="true"
                            >
                              {initials(pick.personName)}
                            </span>
                            <strong title={pick.personName}>
                              {pick.personName}
                            </strong>
                            {pick.undoneAt && (
                              <span className="undone-label">Undone</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`mode-tag mode-tag-${pick.mode}`}>
                            {pick.mode === "random" ? (
                              <Shuffle size={12} />
                            ) : (
                              <Users size={12} />
                            )}
                            {pick.mode === "random" ? "Random" : "Balanced"}
                          </span>
                        </td>
                        <td>
                          <time
                            dateTime={pick.createdAt}
                            title={new Date(pick.createdAt).toLocaleString()}
                          >
                            {dateLabel(pick.createdAt)}
                          </time>
                        </td>
                        <td>
                          {pick.id === latestValid?.id && (
                            <button
                              className="text-button undo-button"
                              disabled={busy || Boolean(pendingSpin)}
                              onClick={() =>
                                void mutate("/api/undo", { id: pick.id })
                              }
                            >
                              <RotateCcw size={13} />
                              Undo
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
      </main>
      <footer className="page-footer">
        <span>A turn for everyone.</span>
        <span>
          <Cloud size={13} />
          {syncError
            ? "Connection interrupted · refresh to reconnect"
            : "One wheel. One shared history."}
        </span>
      </footer>
    </div>
  );
}
