import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import TeamWheel from "@/app/components/team-wheel";
import { usesLegacyTeam } from "@/lib/access";
import { parseTeamId } from "@/lib/team";
import { getTeamAccess } from "@/lib/team-store";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const teamId = parseTeamId((await params).teamId);
  if (!teamId || usesLegacyTeam(env) || !env.DB) notFound();
  const team = await getTeamAccess(
    env.DB,
    teamId,
    (await headers()).get("Cookie"),
  );
  if (!team) redirect("/?joinRequired=1");
  return <TeamWheel key={teamId} team={team} />;
}
