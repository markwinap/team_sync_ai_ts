import { z } from "zod";

import { TeamSyncFacade } from "~/modules/team-sync/application/services/team-sync-facade";
import { DrizzleTeamSyncRepository } from "~/modules/team-sync/infrastructure/repositories/drizzle-team-sync-repository";
import { toDashboardViewModel } from "~/modules/team-sync/presentation/view-models/dashboard-view-model";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
	generateProjectMarkdownWithAI,
	generateProjectTeamRolesWithAI,
} from "~/server/services/project-markdown-generation";
import { generateTeamMemberDecisionSummaryWithAI } from "~/server/services/team-member-decision-summary";

const createFacade = () => {
	const repository = new DrizzleTeamSyncRepository();
	return new TeamSyncFacade(repository);
};

const csvArraySchema = z
	.array(z.string().min(1))
	.default([])
	.transform((items) => items.map((item) => item.trim()).filter((item) => item.length > 0));

const teamMemberProfileInput = z.object({
	fullName: z.string().trim().min(2).max(255),
	email: z.string().trim().email().max(255).or(z.literal("")).default(""),
	roles: csvArraySchema,
	expertise: csvArraySchema,
	techStack: csvArraySchema,
	certifications: csvArraySchema,
	responsibilities: csvArraySchema,
	communicationStyle: z.string().trim().min(2).max(1000),
	growthGoals: csvArraySchema,
	generatedSummary: z.string().trim().max(12000).default(""),
	languages: z
		.array(
			z.object({
				language: z.string().trim().min(1).max(100),
				percent: z.number().int().min(0).max(100),
			}),
		)
		.default([]),
});

const teamMemberSummaryProfileInput = z.object({
	fullName: z.string().trim().max(255).optional().default(""),
	email: z.string().trim().email().max(255).or(z.literal("")).optional().default(""),
	roles: csvArraySchema.optional().default([]),
	expertise: csvArraySchema.optional().default([]),
	techStack: csvArraySchema.optional().default([]),
	certifications: csvArraySchema.optional().default([]),
	responsibilities: csvArraySchema.optional().default([]),
	communicationStyle: z.string().trim().max(1000).optional().default(""),
	growthGoals: csvArraySchema.optional().default([]),
	generatedSummary: z.string().trim().max(12000).optional().default(""),
	languages: z
		.array(
			z.object({
				language: z.string().trim().max(100).optional().default(""),
				percent: z.number().min(0).max(100).optional().default(0),
			}),
		)
		.optional()
		.default([]),
});

const companyProfileInput = z.object({
	name: z.string().trim().min(2).max(255),
	industry: z.string().trim().min(2).max(255),
	businessIntent: z.string().trim().min(2).max(2000),
	technologyIntent: z.string().trim().min(2).max(2000),
	standards: csvArraySchema,
	partnerships: csvArraySchema,
});

const requiredTeamByRoleSchema = z
	.array(
		z.object({
			role: z.string().trim().min(1).max(128),
			headcount: z.number().int().min(1).max(50),
			allocationPercent: z.number().int().min(25).max(100).optional().default(100),
			assignedMemberId: z.string().trim().min(1).max(64).optional(),
		}),
	)
	.default([])
	.transform((items) =>
		items
			.map((item) => ({
				role: item.role.trim(),
				headcount: item.headcount,
				allocationPercent: item.allocationPercent,
				assignedMemberId: item.assignedMemberId?.trim() || undefined,
			}))
			.filter((item) => item.role.length > 0),
	);

const toLegacyTeamRoleLabel = (item: { role: string; headcount: number }) =>
	`${item.role} (x${item.headcount})`;

const projectMarkdownFieldSchema = z.enum([
	"summary",
	"purpose",
	"businessGoals",
	"stakeholders",
	"scopeIn",
	"scopeOut",
	"architectureOverview",
	"dataModels",
	"integrations",
	"requiredTechStack",
	"developmentProcess",
	"timelineMilestones",
	"riskFactors",
	"operationsPlan",
	"qualityCompliance",
	"dependencies",
	"environments",
	"deploymentStrategy",
	"monitoringAndLogging",
	"maintenancePlan",
]);

const projectProfileInput = z.object({
	companyId: z.number().int().positive(),
	projectName: z.string().trim().min(2).max(255),
	summary: z.string().min(2).max(2000),
	purpose: z.string().min(2).max(2000),
	businessGoals: z.string().max(4000),
	stakeholders: z.string().max(4000),
	scopeIn: z.string().max(4000),
	scopeOut: z.string().max(4000),
	architectureOverview: z.string().max(3000),
	dataModels: z.string().max(4000),
	integrations: z.string().max(4000),
	requiredTechStack: z.string().max(4000),
	developmentProcess: z.string().max(3000),
	timelineMilestones: z.string().max(4000),
	riskFactors: z.string().max(4000),
	operationsPlan: z.string().max(3000),
	qualityCompliance: z.string().max(4000),
	dependencies: z.string().max(4000),
	requiredTeamByRole: requiredTeamByRoleSchema,
	environments: z.string().max(4000),
	deploymentStrategy: z.string().max(3000),
	monitoringAndLogging: z.string().max(3000),
	maintenancePlan: z.string().max(3000),
}).transform((input) => ({
	...input,
	teamRoles: input.requiredTeamByRole.map(toLegacyTeamRoleLabel),
	targetTeamSize: input.requiredTeamByRole.reduce(
		(total, role) => total + role.headcount,
		0,
	),
}));

const projectMarkdownReferenceFieldSchema = z.object({
	key: z.string().trim().min(1).max(64),
	label: z.string().trim().min(1).max(120),
	value: z.string().trim().min(1).max(6000),
});

export const teamSyncRouter = createTRPCRouter({
	snapshot: publicProcedure
		.input(
			z
				.object({
					projectName: z.string().min(1).optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const facade = createFacade();
			const snapshot = await facade.getSnapshot(input?.projectName);
			return toDashboardViewModel(snapshot);
		}),
	teamMemberProfiles: publicProcedure.query(async () => {
		const repository = new DrizzleTeamSyncRepository();
		return repository.listTeamMemberProfiles();
	}),
	memberAssignedProjects: publicProcedure
		.input(z.object({ memberId: z.string().trim().min(1).max(64) }))
		.query(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			return repository.listProjectsByMemberId(input.memberId);
		}),
	companyProfiles: publicProcedure.query(async () => {
		const repository = new DrizzleTeamSyncRepository();
		return repository.listCompanyProfiles();
	}),
	createCompanyProfile: publicProcedure
		.input(companyProfileInput)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			return repository.createCompanyProfile(input);
		}),
	updateCompanyProfile: publicProcedure
		.input(
			z.object({
				companyId: z.number().int().positive(),
				profile: companyProfileInput,
			}),
		)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			return repository.updateCompanyProfile(input.companyId, input.profile);
		}),
	projectProfiles: publicProcedure.query(async () => {
		const repository = new DrizzleTeamSyncRepository();
		return repository.listProjectProfiles();
	}),
	createProjectProfile: publicProcedure
		.input(projectProfileInput)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			return repository.createProjectProfile(input);
		}),
	updateProjectProfile: publicProcedure
		.input(
			z.object({
				projectId: z.number().int().positive(),
				profile: projectProfileInput,
			}),
		)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			return repository.updateProjectProfile(input.projectId, input.profile);
		}),
	updateProjectField: publicProcedure
		.input(
			z.object({
				projectId: z.number().int().positive(),
				fieldName: projectMarkdownFieldSchema,
				content: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			return repository.updateProjectField(input.projectId, input.fieldName, input.content);
		}),
	generateProjectFieldMarkdown: publicProcedure
		.input(
			z.object({
				targetField: projectMarkdownFieldSchema,
				currentContent: z.string().max(8000).optional(),
				prompt: z.string().trim().max(1000).optional(),
				referenceFields: z.array(projectMarkdownReferenceFieldSchema).min(1).max(20),
			}),
		)
		.mutation(async ({ input }) => {
			const generatedContent = await generateProjectMarkdownWithAI({
				targetField: input.targetField,
				currentContent: input.currentContent,
				prompt: input.prompt,
				referenceFields: input.referenceFields,
			});

			return { generatedContent };
		}),
	generateProjectTeamRoles: publicProcedure
		.input(
			z.object({
				currentRoles: z
					.array(
						z.object({
							role: z.string().trim().min(1).max(128),
							headcount: z.number().int().min(1).max(50),
							allocationPercent: z.number().int().min(25).max(100),
						}),
					)
					.default([]),
				prompt: z.string().trim().max(1000).optional(),
				referenceFields: z.array(projectMarkdownReferenceFieldSchema).max(40).default([]),
			}),
		)
		.mutation(async ({ input }) => {
			const generatedRoles = await generateProjectTeamRolesWithAI({
				currentRoles: input.currentRoles,
				prompt: input.prompt,
				referenceFields: input.referenceFields,
			});

			return { generatedRoles };
		}),
	createTeamMemberProfile: publicProcedure
		.input(teamMemberProfileInput)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			return repository.createTeamMemberProfile(input);
		}),
	updateTeamMemberProfile: publicProcedure
		.input(
			z.object({
				memberId: z.string().trim().min(1).max(64),
				profile: teamMemberProfileInput,
			}),
		)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			return repository.updateTeamMemberProfile(input.memberId, input.profile);
		}),
	generateTeamMemberDecisionSummary: publicProcedure
		.input(
			z.object({
				memberId: z.string().trim().min(1).max(64).optional(),
				memberProfile: teamMemberSummaryProfileInput.optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			const members = await repository.listTeamMemberProfiles();
			const persistedMember = input.memberId
				? members.find((item) => item.id === input.memberId)
				: undefined;
			const memberProfile = input.memberProfile ?? persistedMember;

			if (!memberProfile) {
				throw new Error("Team member profile is required to generate a decision summary.");
			}

			const summary = await generateTeamMemberDecisionSummaryWithAI({
				memberProfile,
			});

			return { summary };
		}),
	deleteTeamMemberProfile: publicProcedure
		.input(
			z.object({
				memberId: z.string().trim().min(1).max(64),
			}),
		)
		.mutation(async ({ input }) => {
			const repository = new DrizzleTeamSyncRepository();
			await repository.deleteTeamMemberProfile(input.memberId);
			return { ok: true };
		}),
});
