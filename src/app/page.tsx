import { TeamSyncDashboard } from "~/app/_components/team-sync-dashboard";
import { TeamSyncFacade } from "~/modules/team-sync/application/services/team-sync-facade";
import { DrizzleTeamSyncRepository } from "~/modules/team-sync/infrastructure/repositories/drizzle-team-sync-repository";
import { auth } from "~/server/auth";
import { toDashboardViewModel } from "~/modules/team-sync/presentation/view-models/dashboard-view-model";

export default async function Home() {
	const facade = new TeamSyncFacade(new DrizzleTeamSyncRepository());
	const [snapshot, session] = await Promise.all([facade.getSnapshot(), auth()]);
	const viewModel = toDashboardViewModel(snapshot);
	const user = session?.user
		? {
				name: session.user.name ?? null,
				email: session.user.email ?? null,
				image: session.user.image ?? null,
			}
		: null;

	return <TeamSyncDashboard data={viewModel} user={user} />;
}
