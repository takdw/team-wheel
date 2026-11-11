export const legacyTeamId = 1;
export const teamCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface TeamAccess {
  id: number;
  name: string;
  joinCode: string | null;
}

export function parseTeamId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > legacyTeamId ? id : null;
}

export function teamApiBase(teamId: number): string {
  return teamId === legacyTeamId ? "/api" : `/api/teams/${teamId}`;
}

export function formatTeamCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
