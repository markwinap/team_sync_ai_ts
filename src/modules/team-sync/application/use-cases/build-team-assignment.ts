import {
	normalize,
	overlapScore,
	type TeamMember,
	type TeamAssignmentCandidate,
	type TeamAssignmentResult,
} from "~/modules/team-sync/domain/entities";
import type { TeamSyncRepository } from "~/modules/team-sync/domain/repositories";

const capacityWeight = 0.2;
const capabilityWeight = 0.45;
const stackWeight = 0.35;

export class BuildTeamAssignmentUseCase {
	constructor(private readonly repository: TeamSyncRepository) {}

	async execute(projectName: string): Promise<TeamAssignmentResult> {
		const requirement = await this.repository.getProjectRequirement(projectName);

		if (!requirement) {
			throw new Error(`Project requirement not found: ${projectName}`);
		}

		const members = await this.repository.getTalentBank();
		const ranked = members
			.map((member) => this.rankCandidate(member, requirement.requiredCapabilities, requirement.requiredTechStack))
			.sort((left, right) => right.score - left.score)
			.slice(0, requirement.targetTeamSize);

		const covered = new Set(
			ranked.flatMap((entry) => entry.member.expertise.map(normalize)),
		);

		const uncoveredCapabilities = requirement.requiredCapabilities.filter(
			(capability) => !covered.has(normalize(capability)),
		);

		return {
			projectName: requirement.projectName,
			recommendedTeam: ranked,
			uncoveredCapabilities,
		};
	}

	private rankCandidate(
		member: TeamMember,
		requiredCapabilities: string[],
		requiredTechStack: string[],
	): TeamAssignmentCandidate {
		const capabilityFit = overlapScore(requiredCapabilities, member.expertise);
		const stackFit = overlapScore(requiredTechStack, member.techStack);
		const capacityFit = Math.max(0, Math.min(1, member.capacityPercent / 100));

		const score = Number(
			(
				capabilityFit * capabilityWeight +
				stackFit * stackWeight +
				capacityFit * capacityWeight
			).toFixed(4),
		);

		const reasons = [
			`Capability fit ${(capabilityFit * 100).toFixed(0)}%`,
			`Tech stack fit ${(stackFit * 100).toFixed(0)}%`,
			`Available capacity ${member.capacityPercent}%`,
		];

		return {
			member,
			score,
			reasons,
		};
	}
}
