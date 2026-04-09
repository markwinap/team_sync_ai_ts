import { asc, eq } from "drizzle-orm";

import type {
	CompanyProfileDraft,
	CompanyRecord,
	CompanyProfile,
	ProjectProfileDraft,
	ProjectRecord,
	ProjectRequirement,
	RequiredTeamRole,
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

const formatLegacyTeamRole = (entry: RequiredTeamRole) => `${entry.role} (x${entry.headcount})`;

const parseLegacyTeamRole = (value: string): RequiredTeamRole => {
	const trimmed = value.trim();
	const match = /^(.*)\(x(\d+)\)$/i.exec(trimmed);

	if (!match) {
		return { role: trimmed, headcount: 1 };
	}

	return {
		role: match[1]?.trim() ?? trimmed,
		headcount: Number(match[2]) || 1,
	};
};

const normalizeRequiredTeamByRole = (value: RequiredTeamRole[]) =>
	value
		.map((item) => ({ role: item.role.trim(), headcount: Number(item.headcount) || 0 }))
		.filter((item) => item.role.length > 0 && item.headcount > 0);

const resolveRequiredTeamByRole = (
	requiredTeamByRole: RequiredTeamRole[] | null | undefined,
	teamRoles: string[],
) => {
	const normalized = normalizeRequiredTeamByRole(requiredTeamByRole ?? []);

	if (normalized.length > 0) {
		return normalized;
	}

	return normalizeRequiredTeamByRole(teamRoles.map(parseLegacyTeamRole));
};

const deriveLegacyTeamRoles = (requiredTeamByRole: RequiredTeamRole[]) =>
	requiredTeamByRole.map(formatLegacyTeamRole);

const deriveTargetTeamSize = (requiredTeamByRole: RequiredTeamRole[]) =>
	requiredTeamByRole.reduce((total, entry) => total + entry.headcount, 0);

export class DrizzleTeamSyncRepository implements TeamSyncRepository {
	async getCompanyProfile(): Promise<CompanyProfile> {
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
		await db.delete(teamSyncTalentMembers).where(eq(teamSyncTalentMembers.id, memberId));
	}

	async getProjectRequirement(projectName: string): Promise<ProjectRequirement | null> {
		const project = await db.query.teamSyncProjects.findFirst({
			where: eq(teamSyncProjects.projectName, projectName),
		});

		if (!project) {
			return null;
		}

		const requiredTeamByRole = resolveRequiredTeamByRole(
			project.requiredTeamByRole,
			project.teamRoles,
		);

		return {
			projectName: project.projectName,
			summary: project.summary,
			purpose: project.purpose,
			businessGoals: project.businessGoals,
			stakeholders: project.stakeholders,
			scopeIn: project.scopeIn,
			scopeOut: project.scopeOut,
			architectureOverview: project.architectureOverview,
			dataModels: project.dataModels,
			integrations: project.integrations,
			requiredCapabilities: project.requiredCapabilities,
			requiredTechStack: project.requiredTechStack,
			developmentProcess: project.developmentProcess,
			timelineMilestones: project.timelineMilestones,
			riskFactors: project.riskFactors,
			operationsPlan: project.operationsPlan,
			qualityCompliance: project.qualityCompliance,
			dependencies: project.dependencies,
			requiredTeamByRole,
			teamRoles: deriveLegacyTeamRoles(requiredTeamByRole),
			environments: project.environments,
			deploymentStrategy: project.deploymentStrategy,
			monitoringAndLogging: project.monitoringAndLogging,
			maintenancePlan: project.maintenancePlan,
			targetTeamSize: deriveTargetTeamSize(requiredTeamByRole),
		};
	}

	async listProjectProfiles(): Promise<ProjectRecord[]> {
		const projects = await db
			.select()
			.from(teamSyncProjects)
			.orderBy(asc(teamSyncProjects.projectName));

		return projects.map((project) => {
			const requiredTeamByRole = resolveRequiredTeamByRole(
				project.requiredTeamByRole,
				project.teamRoles,
			);

			return {
			id: project.id,
			companyId: project.companyId,
			projectName: project.projectName,
			summary: project.summary,
			purpose: project.purpose,
			businessGoals: project.businessGoals,
			stakeholders: project.stakeholders,
			scopeIn: project.scopeIn,
			scopeOut: project.scopeOut,
			architectureOverview: project.architectureOverview,
			dataModels: project.dataModels,
			integrations: project.integrations,
			requiredCapabilities: project.requiredCapabilities,
			requiredTechStack: project.requiredTechStack,
			developmentProcess: project.developmentProcess,
			timelineMilestones: project.timelineMilestones,
			riskFactors: project.riskFactors,
			operationsPlan: project.operationsPlan,
			qualityCompliance: project.qualityCompliance,
			dependencies: project.dependencies,
			requiredTeamByRole,
			teamRoles: deriveLegacyTeamRoles(requiredTeamByRole),
			environments: project.environments,
			deploymentStrategy: project.deploymentStrategy,
			monitoringAndLogging: project.monitoringAndLogging,
			maintenancePlan: project.maintenancePlan,
			targetTeamSize: deriveTargetTeamSize(requiredTeamByRole),
			};
		});
	}

	async createProjectProfile(input: ProjectProfileDraft): Promise<ProjectRecord> {
		const requiredTeamByRole = normalizeRequiredTeamByRole(input.requiredTeamByRole);
		const [created] = await db
			.insert(teamSyncProjects)
			.values({
				requiredTeamByRole,
				companyId: input.companyId,
				projectName: input.projectName,
				summary: input.summary,
				purpose: input.purpose,
				businessGoals: input.businessGoals,
				stakeholders: input.stakeholders,
				scopeIn: input.scopeIn,
				scopeOut: input.scopeOut,
				architectureOverview: input.architectureOverview,
				dataModels: input.dataModels,
				integrations: input.integrations,
				requiredCapabilities: input.requiredCapabilities,
				requiredTechStack: input.requiredTechStack,
				developmentProcess: input.developmentProcess,
				timelineMilestones: input.timelineMilestones,
				riskFactors: input.riskFactors,
				operationsPlan: input.operationsPlan,
				qualityCompliance: input.qualityCompliance,
				dependencies: input.dependencies,
				teamRoles: deriveLegacyTeamRoles(requiredTeamByRole),
				environments: input.environments,
				deploymentStrategy: input.deploymentStrategy,
				monitoringAndLogging: input.monitoringAndLogging,
				maintenancePlan: input.maintenancePlan,
				targetTeamSize: deriveTargetTeamSize(requiredTeamByRole),
			})
			.returning();

		if (!created) {
			throw new Error("Failed to create project profile.");
		}

		const createdRequiredTeamByRole = resolveRequiredTeamByRole(
			created.requiredTeamByRole,
			created.teamRoles,
		);

		return {
			id: created.id,
			companyId: created.companyId,
			projectName: created.projectName,
			summary: created.summary,
			purpose: created.purpose,
			businessGoals: created.businessGoals,
			stakeholders: created.stakeholders,
			scopeIn: created.scopeIn,
			scopeOut: created.scopeOut,
			architectureOverview: created.architectureOverview,
			dataModels: created.dataModels,
			integrations: created.integrations,
			requiredCapabilities: created.requiredCapabilities,
			requiredTechStack: created.requiredTechStack,
			developmentProcess: created.developmentProcess,
			timelineMilestones: created.timelineMilestones,
			riskFactors: created.riskFactors,
			operationsPlan: created.operationsPlan,
			qualityCompliance: created.qualityCompliance,
			dependencies: created.dependencies,
			requiredTeamByRole: createdRequiredTeamByRole,
			teamRoles: deriveLegacyTeamRoles(createdRequiredTeamByRole),
			environments: created.environments,
			deploymentStrategy: created.deploymentStrategy,
			monitoringAndLogging: created.monitoringAndLogging,
			maintenancePlan: created.maintenancePlan,
			targetTeamSize: deriveTargetTeamSize(createdRequiredTeamByRole),
		};
	}

	async updateProjectProfile(
		projectId: number,
		input: ProjectProfileDraft,
	): Promise<ProjectRecord> {
		const requiredTeamByRole = normalizeRequiredTeamByRole(input.requiredTeamByRole);
		const [updated] = await db
			.update(teamSyncProjects)
			.set({
				requiredTeamByRole,
				companyId: input.companyId,
				projectName: input.projectName,
				summary: input.summary,
				purpose: input.purpose,
				businessGoals: input.businessGoals,
				stakeholders: input.stakeholders,
				scopeIn: input.scopeIn,
				scopeOut: input.scopeOut,
				architectureOverview: input.architectureOverview,
				dataModels: input.dataModels,
				integrations: input.integrations,
				requiredCapabilities: input.requiredCapabilities,
				requiredTechStack: input.requiredTechStack,
				developmentProcess: input.developmentProcess,
				timelineMilestones: input.timelineMilestones,
				riskFactors: input.riskFactors,
				operationsPlan: input.operationsPlan,
				qualityCompliance: input.qualityCompliance,
				dependencies: input.dependencies,
				teamRoles: deriveLegacyTeamRoles(requiredTeamByRole),
				environments: input.environments,
				deploymentStrategy: input.deploymentStrategy,
				monitoringAndLogging: input.monitoringAndLogging,
				maintenancePlan: input.maintenancePlan,
				targetTeamSize: deriveTargetTeamSize(requiredTeamByRole),
			})
			.where(eq(teamSyncProjects.id, projectId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update project profile.");
		}

		const updatedRequiredTeamByRole = resolveRequiredTeamByRole(
			updated.requiredTeamByRole,
			updated.teamRoles,
		);

		return {
			id: updated.id,
			companyId: updated.companyId,
			projectName: updated.projectName,
			summary: updated.summary,
			purpose: updated.purpose,
			businessGoals: updated.businessGoals,
			stakeholders: updated.stakeholders,
			scopeIn: updated.scopeIn,
			scopeOut: updated.scopeOut,
			architectureOverview: updated.architectureOverview,
			dataModels: updated.dataModels,
			integrations: updated.integrations,
			requiredCapabilities: updated.requiredCapabilities,
			requiredTechStack: updated.requiredTechStack,
			developmentProcess: updated.developmentProcess,
			timelineMilestones: updated.timelineMilestones,
			riskFactors: updated.riskFactors,
			operationsPlan: updated.operationsPlan,
			qualityCompliance: updated.qualityCompliance,
			dependencies: updated.dependencies,
			requiredTeamByRole: updatedRequiredTeamByRole,
			teamRoles: deriveLegacyTeamRoles(updatedRequiredTeamByRole),
			environments: updated.environments,
			deploymentStrategy: updated.deploymentStrategy,
			monitoringAndLogging: updated.monitoringAndLogging,
			maintenancePlan: updated.maintenancePlan,
			targetTeamSize: deriveTargetTeamSize(updatedRequiredTeamByRole),
		};
	}

	async listProjectRequirements(): Promise<ProjectRequirement[]> {
		const projects = await db
			.select()
			.from(teamSyncProjects)
			.orderBy(asc(teamSyncProjects.projectName));

		return projects.map((project) => {
			const requiredTeamByRole = resolveRequiredTeamByRole(
				project.requiredTeamByRole,
				project.teamRoles,
			);

			return {
			projectName: project.projectName,
			summary: project.summary,
			purpose: project.purpose,
			businessGoals: project.businessGoals,
			stakeholders: project.stakeholders,
			scopeIn: project.scopeIn,
			scopeOut: project.scopeOut,
			architectureOverview: project.architectureOverview,
			dataModels: project.dataModels,
			integrations: project.integrations,
			requiredCapabilities: project.requiredCapabilities,
			requiredTechStack: project.requiredTechStack,
			developmentProcess: project.developmentProcess,
			timelineMilestones: project.timelineMilestones,
			riskFactors: project.riskFactors,
			operationsPlan: project.operationsPlan,
			qualityCompliance: project.qualityCompliance,
			dependencies: project.dependencies,
			requiredTeamByRole,
			teamRoles: deriveLegacyTeamRoles(requiredTeamByRole),
			environments: project.environments,
			deploymentStrategy: project.deploymentStrategy,
			monitoringAndLogging: project.monitoringAndLogging,
			maintenancePlan: project.maintenancePlan,
			targetTeamSize: deriveTargetTeamSize(requiredTeamByRole),
			};
		});
	}
}
