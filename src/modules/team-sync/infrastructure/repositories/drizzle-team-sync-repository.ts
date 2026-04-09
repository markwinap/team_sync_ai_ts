import { asc, eq } from "drizzle-orm";

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
import { db } from "~/server/db";
import {
	teamSyncCompanies,
	teamSyncProjects,
	teamSyncTalentMembers,
} from "~/server/db/schema";

const seededCompany = {
	name: "Team Sync Labs",
	industry: "Enterprise Software",
	businessIntent: "Accelerate enterprise delivery with AI-assisted planning.",
	technologyIntent: "Cloud-native, API-first, and security-compliant platforms.",
	standards: ["SOC 2", "ISO 27001"],
	partnerships: ["Cloud Platform Partners", "Data Integration Vendors"],
};

const seededTalent: TeamMember[] = [
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

const seededProjects = [
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
] satisfies ProjectRequirement[];

let seedPromise: Promise<void> | null = null;

const seedIfEmpty = async () => {
	if (seedPromise) {
		await seedPromise;
		return;
	}

	seedPromise = (async () => {
		const existingProject = await db.query.teamSyncProjects.findFirst();
		if (existingProject) {
			return;
		}

		const [company] = await db
			.insert(teamSyncCompanies)
			.values(seededCompany)
			.returning({ id: teamSyncCompanies.id });

		if (!company) {
			throw new Error("Failed to create default Team Sync company.");
		}

		await db.insert(teamSyncTalentMembers).values(seededTalent);
		await db.insert(teamSyncProjects).values(
			seededProjects.map((project) => ({
				companyId: company.id,
				projectName: project.projectName,
				summary: project.summary,
				requiredCapabilities: project.requiredCapabilities,
				requiredTechStack: project.requiredTechStack,
				riskFactors: project.riskFactors,
				targetTeamSize: project.targetTeamSize,
			})),
		);
	})();

	await seedPromise;
};

export class DrizzleTeamSyncRepository implements TeamSyncRepository {
	async getCompanyProfile(): Promise<CompanyProfile> {
		await seedIfEmpty();
		const company = await db.query.teamSyncCompanies.findFirst({
			orderBy: (table, helpers) => [helpers.asc(table.id)],
		});

		if (!company) {
			throw new Error("No company profile found.");
		}

		return {
			name: company.name,
			industry: company.industry,
			businessIntent: company.businessIntent,
			technologyIntent: company.technologyIntent,
			standards: company.standards,
			partnerships: company.partnerships,
		};
	}

	async listCompanyProfiles(): Promise<CompanyRecord[]> {
		await seedIfEmpty();
		const companies = await db
			.select()
			.from(teamSyncCompanies)
			.orderBy(asc(teamSyncCompanies.name));

		return companies.map((company) => ({
			id: company.id,
			name: company.name,
			industry: company.industry,
			businessIntent: company.businessIntent,
			technologyIntent: company.technologyIntent,
			standards: company.standards,
			partnerships: company.partnerships,
		}));
	}

	async createCompanyProfile(input: CompanyProfileDraft): Promise<CompanyRecord> {
		await seedIfEmpty();
		const [created] = await db
			.insert(teamSyncCompanies)
			.values({
				name: input.name,
				industry: input.industry,
				businessIntent: input.businessIntent,
				technologyIntent: input.technologyIntent,
				standards: input.standards,
				partnerships: input.partnerships,
			})
			.returning();

		if (!created) {
			throw new Error("Failed to create company profile.");
		}

		return {
			id: created.id,
			name: created.name,
			industry: created.industry,
			businessIntent: created.businessIntent,
			technologyIntent: created.technologyIntent,
			standards: created.standards,
			partnerships: created.partnerships,
		};
	}

	async updateCompanyProfile(
		companyId: number,
		input: CompanyProfileDraft,
	): Promise<CompanyRecord> {
		await seedIfEmpty();
		const [updated] = await db
			.update(teamSyncCompanies)
			.set({
				name: input.name,
				industry: input.industry,
				businessIntent: input.businessIntent,
				technologyIntent: input.technologyIntent,
				standards: input.standards,
				partnerships: input.partnerships,
			})
			.where(eq(teamSyncCompanies.id, companyId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update company profile.");
		}

		return {
			id: updated.id,
			name: updated.name,
			industry: updated.industry,
			businessIntent: updated.businessIntent,
			technologyIntent: updated.technologyIntent,
			standards: updated.standards,
			partnerships: updated.partnerships,
		};
	}

	async getTalentBank(): Promise<TeamMember[]> {
		await seedIfEmpty();
		const members = await db.query.teamSyncTalentMembers.findMany({
			orderBy: (table, helpers) => [helpers.asc(table.fullName)],
		});

		return members.map((member) => ({
			id: member.id,
			fullName: member.fullName,
			role: member.role,
			expertise: member.expertise,
			techStack: member.techStack,
			certifications: member.certifications,
			responsibilities: member.responsibilities,
			communicationStyle: member.communicationStyle,
			growthGoals: member.growthGoals,
			capacityPercent: member.capacityPercent,
		}));
	}

	async listTeamMemberProfiles(): Promise<TeamMember[]> {
		await seedIfEmpty();
		const members = await db
			.select()
			.from(teamSyncTalentMembers)
			.orderBy(asc(teamSyncTalentMembers.fullName));

		return members.map((member) => ({
			id: member.id,
			fullName: member.fullName,
			role: member.role,
			expertise: member.expertise,
			techStack: member.techStack,
			certifications: member.certifications,
			responsibilities: member.responsibilities,
			communicationStyle: member.communicationStyle,
			growthGoals: member.growthGoals,
			capacityPercent: member.capacityPercent,
		}));
	}

	async createTeamMemberProfile(input: TeamMemberProfileDraft): Promise<TeamMember> {
		await seedIfEmpty();
		const generatedId = `tm-${crypto.randomUUID().slice(0, 8)}`;

		const [created] = await db
			.insert(teamSyncTalentMembers)
			.values({
				id: generatedId,
				fullName: input.fullName,
				role: input.role,
				expertise: input.expertise,
				techStack: input.techStack,
				certifications: input.certifications,
				responsibilities: input.responsibilities,
				communicationStyle: input.communicationStyle,
				growthGoals: input.growthGoals,
				capacityPercent: input.capacityPercent,
			})
			.returning();

		if (!created) {
			throw new Error("Failed to create team member profile.");
		}

		return {
			id: created.id,
			fullName: created.fullName,
			role: created.role,
			expertise: created.expertise,
			techStack: created.techStack,
			certifications: created.certifications,
			responsibilities: created.responsibilities,
			communicationStyle: created.communicationStyle,
			growthGoals: created.growthGoals,
			capacityPercent: created.capacityPercent,
		};
	}

	async updateTeamMemberProfile(
		memberId: string,
		input: TeamMemberProfileDraft,
	): Promise<TeamMember> {
		await seedIfEmpty();

		const [updated] = await db
			.update(teamSyncTalentMembers)
			.set({
				fullName: input.fullName,
				role: input.role,
				expertise: input.expertise,
				techStack: input.techStack,
				certifications: input.certifications,
				responsibilities: input.responsibilities,
				communicationStyle: input.communicationStyle,
				growthGoals: input.growthGoals,
				capacityPercent: input.capacityPercent,
			})
			.where(eq(teamSyncTalentMembers.id, memberId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update team member profile.");
		}

		return {
			id: updated.id,
			fullName: updated.fullName,
			role: updated.role,
			expertise: updated.expertise,
			techStack: updated.techStack,
			certifications: updated.certifications,
			responsibilities: updated.responsibilities,
			communicationStyle: updated.communicationStyle,
			growthGoals: updated.growthGoals,
			capacityPercent: updated.capacityPercent,
		};
	}

	async deleteTeamMemberProfile(memberId: string): Promise<void> {
		await seedIfEmpty();
		await db.delete(teamSyncTalentMembers).where(eq(teamSyncTalentMembers.id, memberId));
	}

	async getProjectRequirement(projectName: string): Promise<ProjectRequirement | null> {
		await seedIfEmpty();
		const project = await db.query.teamSyncProjects.findFirst({
			where: eq(teamSyncProjects.projectName, projectName),
		});

		if (!project) {
			return null;
		}

		return {
			projectName: project.projectName,
			summary: project.summary,
			requiredCapabilities: project.requiredCapabilities,
			requiredTechStack: project.requiredTechStack,
			riskFactors: project.riskFactors,
			targetTeamSize: project.targetTeamSize,
		};
	}

	async listProjectProfiles(): Promise<ProjectRecord[]> {
		await seedIfEmpty();
		const projects = await db
			.select()
			.from(teamSyncProjects)
			.orderBy(asc(teamSyncProjects.projectName));

		return projects.map((project) => ({
			id: project.id,
			companyId: project.companyId,
			projectName: project.projectName,
			summary: project.summary,
			requiredCapabilities: project.requiredCapabilities,
			requiredTechStack: project.requiredTechStack,
			riskFactors: project.riskFactors,
			targetTeamSize: project.targetTeamSize,
		}));
	}

	async createProjectProfile(input: ProjectProfileDraft): Promise<ProjectRecord> {
		await seedIfEmpty();
		const [created] = await db
			.insert(teamSyncProjects)
			.values({
				companyId: input.companyId,
				projectName: input.projectName,
				summary: input.summary,
				requiredCapabilities: input.requiredCapabilities,
				requiredTechStack: input.requiredTechStack,
				riskFactors: input.riskFactors,
				targetTeamSize: input.targetTeamSize,
			})
			.returning();

		if (!created) {
			throw new Error("Failed to create project profile.");
		}

		return {
			id: created.id,
			companyId: created.companyId,
			projectName: created.projectName,
			summary: created.summary,
			requiredCapabilities: created.requiredCapabilities,
			requiredTechStack: created.requiredTechStack,
			riskFactors: created.riskFactors,
			targetTeamSize: created.targetTeamSize,
		};
	}

	async updateProjectProfile(
		projectId: number,
		input: ProjectProfileDraft,
	): Promise<ProjectRecord> {
		await seedIfEmpty();
		const [updated] = await db
			.update(teamSyncProjects)
			.set({
				companyId: input.companyId,
				projectName: input.projectName,
				summary: input.summary,
				requiredCapabilities: input.requiredCapabilities,
				requiredTechStack: input.requiredTechStack,
				riskFactors: input.riskFactors,
				targetTeamSize: input.targetTeamSize,
			})
			.where(eq(teamSyncProjects.id, projectId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update project profile.");
		}

		return {
			id: updated.id,
			companyId: updated.companyId,
			projectName: updated.projectName,
			summary: updated.summary,
			requiredCapabilities: updated.requiredCapabilities,
			requiredTechStack: updated.requiredTechStack,
			riskFactors: updated.riskFactors,
			targetTeamSize: updated.targetTeamSize,
		};
	}

	async listProjectRequirements(): Promise<ProjectRequirement[]> {
		await seedIfEmpty();
		const projects = await db
			.select()
			.from(teamSyncProjects)
			.orderBy(asc(teamSyncProjects.projectName));

		return projects.map((project) => ({
			projectName: project.projectName,
			summary: project.summary,
			requiredCapabilities: project.requiredCapabilities,
			requiredTechStack: project.requiredTechStack,
			riskFactors: project.riskFactors,
			targetTeamSize: project.targetTeamSize,
		}));
	}
}
