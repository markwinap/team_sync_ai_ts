import type {
	ProjectArtifactBundle,
	ProjectRequirement,
} from "~/modules/team-sync/domain/entities";
import type { TeamSyncRepository } from "~/modules/team-sync/domain/repositories";

const asStory = (projectName: string, capability: string, index: number) => {
	return `As stakeholder ${index + 1}, I want ${capability.toLowerCase()} support in ${projectName}, so that delivery risk is reduced.`;
};

const markdownTextToList = (value: string) =>
	value
		.split(/\r?\n/)
		.map((line) => line.trim().replace(/^[-*]\s+/, ""))
		.filter((line) => line.length > 0);

export class GenerateProjectArtifactsUseCase {
	constructor(private readonly repository: TeamSyncRepository) {}

	async execute(projectName: string): Promise<ProjectArtifactBundle> {
		const requirement = await this.repository.getProjectRequirement(projectName);

		if (!requirement) {
			throw new Error(`Project requirement not found: ${projectName}`);
		}

		return this.createBundle(requirement);
	}

	private createBundle(requirement: ProjectRequirement): ProjectArtifactBundle {
		const requiredCapabilities = markdownTextToList(requirement.requiredCapabilities);
		const riskFactors = markdownTextToList(requirement.riskFactors);

		return {
			functionalRequirements: [
				...requiredCapabilities.map(
					(capability) => `System must support ${capability.toLowerCase()} workflows.`,
				),
				"System must produce a team assignment recommendation with rationale.",
			],
			nonFunctionalRequirements: [
				"Recommendation generation should complete within 5 seconds for up to 200 profiles.",
				"All generated project artifacts should be versioned and traceable.",
				"Access control should enforce authenticated role-based access.",
			],
			userStories: requiredCapabilities.map((capability, index) =>
				asStory(requirement.projectName, capability, index),
			),
			risksAndConstraints: [
				...riskFactors,
				"Talent capacity may change between recommendation and project kickoff.",
			],
			highLevelArchitecture: [
				"Presentation: Next.js pages and reusable UI components.",
				"Application: orchestration use cases for team assignment and project artifact generation.",
				"Domain: profiles, requirements, and recommendation rules.",
				"Infrastructure: repository adapters, DB persistence, and AI provider services.",
			],
			scope: {
				in: [
					"Team composition recommendations",
					"Automated project artifacts",
					"Risk and constraint snapshot",
				],
				out: [
					"Detailed sprint-level planning",
					"Procurement and budget approvals",
				],
			},
		};
	}
}
