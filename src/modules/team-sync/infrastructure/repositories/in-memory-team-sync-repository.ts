import type {
	CompanyProfileDraft,
	CompanyRecord,
	CompanyProfile,
	ProjectProfileDraft,
	ProjectRecord,
	ProjectRequirement,
	TeamMemberProfileDraft,
	TeamMember,
} from "~/modules/team-sync/domain/entities";
import type { TeamSyncRepository } from "~/modules/team-sync/domain/repositories";

const companyProfile: CompanyProfile = {
	name: "Team Sync Labs",
	industry: "Enterprise Software",
	businessIntent: "Accelerate enterprise delivery with AI-assisted planning.",
	technologyIntent: "Cloud-native, API-first, and security-compliant platforms.",
	standards: ["SOC 2", "ISO 27001"],
	partnerships: ["Cloud Platform Partners", "Data Integration Vendors"],
};

const companyProfiles: CompanyRecord[] = [
	{
		id: 1,
		...companyProfile,
	},
];

const talentBank: TeamMember[] = [
	{
		id: "tm-1",
		fullName: "Anika Shah",
		role: "Technical Architect",
		expertise: ["System architecture", "API design", "Risk mitigation"],
		techStack: ["TypeScript", "PostgreSQL", "AWS"],
		certifications: ["AWS Solutions Architect"],
		responsibilities: ["Define architecture runway", "Guide technical risk decisions"],
		communicationStyle: "Structured facilitator with architecture decision records.",
		growthGoals: ["Scale architecture governance across multiple squads"],
		capacityPercent: 70,
	},
	{
		id: "tm-2",
		fullName: "Miguel Torres",
		role: "AI Engineer",
		expertise: ["Prompt engineering", "Model evaluation", "LLM orchestration"],
		techStack: ["TypeScript", "Python", "OpenAI"],
		certifications: ["Azure AI Engineer"],
		responsibilities: ["Design prompts and eval datasets", "Harden model integration flows"],
		communicationStyle: "Experiment-driven and transparent about trade-offs.",
		growthGoals: ["Improve automated eval coverage for production prompts"],
		capacityPercent: 65,
	},
	{
		id: "tm-3",
		fullName: "Olivia Brooks",
		role: "Delivery Lead",
		expertise: ["Stakeholder management", "Project governance", "Compliance"],
		techStack: ["Jira", "Confluence", "PostgreSQL"],
		certifications: ["PMP"],
		responsibilities: ["Align stakeholders", "Own delivery governance and reporting"],
		communicationStyle: "Concise weekly updates and proactive risk escalation.",
		growthGoals: ["Strengthen quantitative delivery forecasting"],
		capacityPercent: 80,
	},
	{
		id: "tm-4",
		fullName: "Kenji Mori",
		role: "Full-Stack Engineer",
		expertise: ["User stories", "Frontend delivery", "Integration"],
		techStack: ["Next.js", "TypeScript", "PostgreSQL"],
		certifications: ["Scrum Developer"],
		responsibilities: ["Deliver dashboard features", "Integrate API and UI workflows"],
		communicationStyle: "Hands-on pairing with fast feedback loops.",
		growthGoals: ["Deepen system design and performance optimization skills"],
		capacityPercent: 75,
	},
];

const projectRequirements: ProjectRequirement[] = [
	{
		projectName: "Orion Program",
		summary: "Build AI-supported team orchestration and project artifact generation.",
		requiredCapabilities: [
			"System architecture",
			"Prompt engineering",
			"Risk mitigation",
			"Stakeholder management",
		],
		requiredTechStack: ["TypeScript", "Next.js", "PostgreSQL", "OpenAI"],
		riskFactors: [
			"Potential mismatch between recommended and available talent.",
			"Compliance evidence may be incomplete in early drafts.",
		],
		targetTeamSize: 3,
	},
	{
		projectName: "Atlas Renewal",
		summary: "Modernize proposal and communication workflows for enterprise accounts.",
		requiredCapabilities: [
			"Project governance",
			"User stories",
			"Integration",
		],
		requiredTechStack: ["TypeScript", "PostgreSQL", "AWS"],
		riskFactors: ["Integration dependencies can delay milestone approvals."],
		targetTeamSize: 2,
	},
];

const projectProfiles: ProjectRecord[] = projectRequirements.map((project, index) => ({
	id: index + 1,
	companyId: 1,
	projectName: project.projectName,
	summary: project.summary,
	requiredCapabilities: project.requiredCapabilities,
	requiredTechStack: project.requiredTechStack,
	riskFactors: project.riskFactors,
	targetTeamSize: project.targetTeamSize,
}));

export class InMemoryTeamSyncRepository implements TeamSyncRepository {
	async getCompanyProfile(): Promise<CompanyProfile> {
		const first = companyProfiles[0];
		if (!first) {
			throw new Error("No company profile found.");
		}

		return {
			name: first.name,
			industry: first.industry,
			businessIntent: first.businessIntent,
			technologyIntent: first.technologyIntent,
			standards: first.standards,
			partnerships: first.partnerships,
		};
	}

	async listCompanyProfiles(): Promise<CompanyRecord[]> {
		return [...companyProfiles].sort((left, right) =>
			left.name.localeCompare(right.name),
		);
	}

	async createCompanyProfile(input: CompanyProfileDraft): Promise<CompanyRecord> {
		const nextId =
			companyProfiles.reduce((maxId, company) => Math.max(maxId, company.id), 0) + 1;

		const created: CompanyRecord = {
			id: nextId,
			...input,
		};

		companyProfiles.push(created);
		return created;
	}

	async updateCompanyProfile(
		companyId: number,
		input: CompanyProfileDraft,
	): Promise<CompanyRecord> {
		const index = companyProfiles.findIndex((company) => company.id === companyId);
		if (index < 0) {
			throw new Error("Failed to update company profile.");
		}

		const updated: CompanyRecord = {
			id: companyId,
			...input,
		};

		companyProfiles[index] = updated;
		return updated;
	}

	async getTalentBank(): Promise<TeamMember[]> {
		return talentBank;
	}

	async listTeamMemberProfiles(): Promise<TeamMember[]> {
		return [...talentBank].sort((left, right) =>
			left.fullName.localeCompare(right.fullName),
		);
	}

	async createTeamMemberProfile(input: TeamMemberProfileDraft): Promise<TeamMember> {
		const created: TeamMember = {
			id: `tm-${crypto.randomUUID().slice(0, 8)}`,
			...input,
		};

		talentBank.push(created);
		return created;
	}

	async updateTeamMemberProfile(
		memberId: string,
		input: TeamMemberProfileDraft,
	): Promise<TeamMember> {
		const index = talentBank.findIndex((member) => member.id === memberId);
		if (index < 0) {
			throw new Error("Failed to update team member profile.");
		}

		const updated: TeamMember = {
			id: memberId,
			...input,
		};

		talentBank[index] = updated;
		return updated;
	}

	async deleteTeamMemberProfile(memberId: string): Promise<void> {
		const index = talentBank.findIndex((member) => member.id === memberId);
		if (index >= 0) {
			talentBank.splice(index, 1);
		}
	}

	async getProjectRequirement(projectName: string): Promise<ProjectRequirement | null> {
		return (
			projectProfiles.find((project) => project.projectName === projectName) ??
			null
		);
	}

	async listProjectProfiles(): Promise<ProjectRecord[]> {
		return [...projectProfiles].sort((left, right) =>
			left.projectName.localeCompare(right.projectName),
		);
	}

	async createProjectProfile(input: ProjectProfileDraft): Promise<ProjectRecord> {
		const nextId =
			projectProfiles.reduce((maxId, project) => Math.max(maxId, project.id), 0) + 1;

		const created: ProjectRecord = {
			id: nextId,
			...input,
		};

		projectProfiles.push(created);
		return created;
	}

	async updateProjectProfile(
		projectId: number,
		input: ProjectProfileDraft,
	): Promise<ProjectRecord> {
		const index = projectProfiles.findIndex((project) => project.id === projectId);
		if (index < 0) {
			throw new Error("Failed to update project profile.");
		}

		const updated: ProjectRecord = {
			id: projectId,
			...input,
		};

		projectProfiles[index] = updated;
		return updated;
	}

	async listProjectRequirements(): Promise<ProjectRequirement[]> {
		return projectProfiles.map((project) => ({
			projectName: project.projectName,
			summary: project.summary,
			requiredCapabilities: project.requiredCapabilities,
			requiredTechStack: project.requiredTechStack,
			riskFactors: project.riskFactors,
			targetTeamSize: project.targetTeamSize,
		}));
	}
}
