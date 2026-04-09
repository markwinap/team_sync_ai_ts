import type {
	ProjectArtifactBundle,
	ProjectRequirement,
	TeamAssignmentResult,
} from "~/modules/team-sync/domain/entities";
import type { TeamSyncRepository } from "~/modules/team-sync/domain/repositories";
import { BuildTeamAssignmentUseCase } from "~/modules/team-sync/application/use-cases/build-team-assignment";
import { GenerateProjectArtifactsUseCase } from "~/modules/team-sync/application/use-cases/generate-project-artifacts";

export type TeamSyncSnapshot = {
	companyName: string;
	projects: ProjectRequirement[];
	selectedProject: {
		requirement: ProjectRequirement;
		team: TeamAssignmentResult;
		artifacts: ProjectArtifactBundle;
	};
};

export class TeamSyncFacade {
	private readonly teamAssignment: BuildTeamAssignmentUseCase;
	private readonly projectArtifacts: GenerateProjectArtifactsUseCase;

	constructor(private readonly repository: TeamSyncRepository) {
		this.teamAssignment = new BuildTeamAssignmentUseCase(repository);
		this.projectArtifacts = new GenerateProjectArtifactsUseCase(repository);
	}

	async getSnapshot(projectName?: string): Promise<TeamSyncSnapshot> {
		const [company, projects] = await Promise.all([
			this.repository.getCompanyProfile(),
			this.repository.listProjectRequirements(),
		]);

		const selected =
			projects.find((project) => project.projectName === projectName) ?? projects[0];

		if (!selected) {
			throw new Error("No project requirements are configured.");
		}

		const [team, artifacts] = await Promise.all([
			this.teamAssignment.execute(selected.projectName),
			this.projectArtifacts.execute(selected.projectName),
		]);

		return {
			companyName: company.name,
			projects,
			selectedProject: {
				requirement: selected,
				team,
				artifacts,
			},
		};
	}
}
