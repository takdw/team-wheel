export const legacyTeamId = 1;
export const teamCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface TeamSummary {
  publicId: string;
  name: string;
}

export interface TeamAccess extends TeamSummary {
  joinCode: string | null;
}

export function parseTeamPublicId(value: string): string | null {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid.test(value) ? value.toLowerCase() : null;
}

export function teamApiBase(publicId?: string | null): string {
  return publicId ? `/api/teams/${publicId}` : "/api";
}

export function formatTeamCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
