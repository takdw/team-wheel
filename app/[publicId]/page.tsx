import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import TeamWheel from "@/app/components/team-wheel";
import { usesLegacyTeam } from "@/lib/access";
import { parseTeamPublicId } from "@/lib/team";
import { getTeamAccess } from "@/lib/team-store";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const publicId = parseTeamPublicId((await params).publicId);
  if (!publicId || usesLegacyTeam(env) || !env.DB) notFound();
  const access = await getTeamAccess(
    env.DB,
    publicId,
    (await headers()).get("Cookie"),
  );
  if (!access) redirect("/?joinRequired=1");
  const { name, joinCode } = access;
  return <TeamWheel key={publicId} team={{ publicId, name, joinCode }} />;
}
