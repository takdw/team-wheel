import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { usesLegacyTeam } from "@/lib/access";
import { getJoinedTeams } from "@/lib/team-store";
import { TeamEntry } from "./components/team-entry";
import TeamWheel from "./components/team-wheel";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ joinRequired?: string }>;
}) {
  if (usesLegacyTeam(env)) return <TeamWheel />;
  const joinedTeams = env.DB
    ? await getJoinedTeams(env.DB, (await headers()).get("Cookie"))
    : [];
  return (
    <TeamEntry
      joinedTeams={joinedTeams}
      joinRequired={(await searchParams).joinRequired === "1"}
    />
  );
}
