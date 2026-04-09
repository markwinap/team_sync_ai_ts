import type { TeamSyncSnapshot } from "~/modules/team-sync/application/services/team-sync-facade";

export type DashboardViewModel = {
	heading: string;
	subheading: string;
	projectName: string;
	summary: string;
	teamRows: Array<{
		name: string;
		role: string;
		scorePercent: number;
		reasons: string[];
	}>;
	uncoveredCapabilities: string[];
	artifacts: {
		functionalRequirements: string[];
		nonFunctionalRequirements: string[];
		userStories: string[];
		risksAndConstraints: string[];
		highLevelArchitecture: string[];
		scopeIn: string[];
		scopeOut: string[];
	};
};

export const toDashboardViewModel = (
	snapshot: TeamSyncSnapshot,
): DashboardViewModel => {
	const selected = snapshot.selectedProject;

	return {
		heading: "Team Sync AI",
		subheading: `${snapshot.companyName} project orchestration workspace`,
		projectName: selected.requirement.projectName,
		summary: selected.requirement.summary,
		teamRows: selected.team.recommendedTeam.map((candidate) => ({
			name: candidate.member.fullName,
			role: candidate.member.roles.join(", "),
			scorePercent: Math.round(candidate.score * 100),
			reasons: candidate.reasons,
		})),
		uncoveredCapabilities: selected.team.uncoveredCapabilities,
		artifacts: {
			functionalRequirements: selected.artifacts.functionalRequirements,
			nonFunctionalRequirements: selected.artifacts.nonFunctionalRequirements,
			userStories: selected.artifacts.userStories,
			risksAndConstraints: selected.artifacts.risksAndConstraints,
			highLevelArchitecture: selected.artifacts.highLevelArchitecture,
			scopeIn: selected.artifacts.scope.in,
			scopeOut: selected.artifacts.scope.out,
		},
	};
};
