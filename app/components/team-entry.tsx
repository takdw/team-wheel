"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  KeyRound,
  LoaderCircle,
  Plus,
} from "lucide-react";
import { requestJson } from "@/lib/client-request";
import type { TeamAccess } from "@/lib/team";

export function TeamEntry({
  joinedTeams,
  joinRequired,
}: {
  joinedTeams: Pick<TeamAccess, "id" | "name">[];
  joinRequired: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function prefillCode() {
      const code = new URLSearchParams(window.location.hash.slice(1)).get(
        "join",
      );
      if (code) {
        setCreating(false);
        setCode(code.slice(0, 24));
      }
    }
    prefillCode();
    window.addEventListener("hashchange", prefillCode);
    return () => window.removeEventListener("hashchange", prefillCode);
  }, []);

  function chooseAction(create: boolean) {
    setCreating(create);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { teamId } = await requestJson<{ teamId: number }>(
        creating ? "/api/teams" : "/api/teams/join",
        creating ? { name } : { code },
      );
      window.location.assign(`/teams/${teamId}`);
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Try again in a moment.",
      );
      setBusy(false);
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
      </header>
      <main className="team-entry">
        <h1>Find your team</h1>
        <div
          className="mode-picker entry-choice"
          role="group"
          aria-label="Team access"
        >
          <button
            type="button"
            aria-pressed={!creating}
            disabled={busy}
            onClick={() => chooseAction(false)}
          >
            <KeyRound size={17} /> Join a team
          </button>
          <button
            type="button"
            aria-pressed={creating}
            disabled={busy}
            onClick={() => chooseAction(true)}
          >
            <Plus size={17} /> Create a team
          </button>
        </div>
        <form className="entry-form" onSubmit={submit} aria-busy={busy}>
          {creating ? (
            <>
              <label htmlFor="team-name">Team name</label>
              <input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                autoComplete="off"
                placeholder="e.g. Design team"
                disabled={busy}
                required
              />
            </>
          ) : (
            <>
              <label htmlFor="team-code">Team code</label>
              <input
                id="team-code"
                className="entry-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={24}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="ABCD-EFGH"
                disabled={busy}
                required
              />
            </>
          )}
          {error && (
            <p className="entry-feedback" role="alert">
              {error}
            </p>
          )}
          {!error && joinRequired && !creating && (
            <p className="entry-feedback">
              Enter your team’s code to open its wheel.
            </p>
          )}
          <button className="button entry-submit" disabled={busy}>
            {creating ? "Create team" : "Join team"}
            {busy ? (
              <LoaderCircle className="loading-icon" size={18} />
            ) : (
              <ArrowRight size={18} />
            )}
          </button>
        </form>
        {joinedTeams.length > 0 && (
          <section
            className="joined-teams"
            aria-labelledby="joined-teams-heading"
          >
            <h2 id="joined-teams-heading">Your teams</h2>
            <ul>
              {joinedTeams.map((team) => (
                <li key={team.id}>
                  <a href={`/teams/${team.id}`}>
                    <span>{team.name}</span>
                    <ArrowRight size={15} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
