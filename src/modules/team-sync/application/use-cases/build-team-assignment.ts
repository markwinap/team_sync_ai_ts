import {
	normalize,
	overlapScore,
	type TeamMember,
	type TeamAssignmentCandidate,
	type TeamAssignmentResult,
} from "~/modules/team-sync/domain/entities";
import type { TeamSyncRepository } from "~/modules/team-sync/domain/repositories";

const roleWeight = 0.55;
const stackWeight = 0.45;

const markdownTextToList = (value: string) =>
	value
		.split(/\r?\n/)
		.map((line) => line.trim().replace(/^[-*]\s+/, ""))
		.filter((line) => line.length > 0);

export class BuildTeamAssignmentUseCase {
	constructor(private readonly repository: TeamSyncRepository) {}

	async execute(projectName: string): Promise<TeamAssignmentResult> {
		const requirement = await this.repository.getProjectRequirement(projectName);

		if (!requirement) {
			throw new Error(`Project requirement not found: ${projectName}`);
		}

		const members = await this.repository.getTalentBank();
		const requiredRoles = requirement.requiredTeamByRole.map((entry) => entry.role.trim());
		const requiredTechStack = markdownTextToList(requirement.requiredTechStack);
		const ranked = members
			.map((member) => this.rankCandidate(member, requiredRoles, requiredTechStack))
			.sort((left, right) => right.score - left.score)
			.slice(0, requirement.targetTeamSize);

		const covered = new Set(
			ranked.flatMap((entry) => [...entry.member.roles, ...entry.member.expertise].map(normalize)),
		);

		const uncoveredCapabilities = requiredRoles.filter(
			(role) => !covered.has(normalize(role)),
		);

		return {
			projectName: requirement.projectName,
			recommendedTeam: ranked,
			uncoveredCapabilities,
		};
	}

	private rankCandidate(
		member: TeamMember,
		requiredRoles: string[],
		requiredTechStack: string[],
	): TeamAssignmentCandidate {
		const roleFit = overlapScore(requiredRoles, [...member.roles, ...member.expertise]);
		const stackFit = overlapScore(requiredTechStack, member.techStack);

		const score = Number(
			(
				roleFit * roleWeight +
				stackFit * stackWeight
			).toFixed(4),
		);

		const reasons = [
			`Role fit ${(roleFit * 100).toFixed(0)}%`,
			`Tech stack fit ${(stackFit * 100).toFixed(0)}%`,
		];

		return {
			member,
			score,
			reasons,
		};
	}
}
