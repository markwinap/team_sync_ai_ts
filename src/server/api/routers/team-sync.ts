import { z } from "zod";

import { TeamSyncFacade } from "~/modules/team-sync/application/services/team-sync-facade";
import { DrizzleTeamSyncRepository } from "~/modules/team-sync/infrastructure/repositories/drizzle-team-sync-repository";
import { toDashboardViewModel } from "~/modules/team-sync/presentation/view-models/dashboard-view-model";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
	role: z.string().trim().min(2).max(128),
	expertise: csvArraySchema,
	techStack: csvArraySchema,
	certifications: csvArraySchema,
	responsibilities: csvArraySchema,
	communicationStyle: z.string().trim().min(2).max(1000),
	growthGoals: csvArraySchema,
	capacityPercent: z.number().int().min(0).max(100),
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
		}),
	)
	.min(1)
	.transform((items) =>
		items
			.map((item) => ({ role: item.role.trim(), headcount: item.headcount }))
			.filter((item) => item.role.length > 0),
	)
	.refine((items) => items.length > 0, {
		message: "At least one required team role is required.",
	});

const toLegacyTeamRoleLabel = (item: { role: string; headcount: number }) =>
	`${item.role} (x${item.headcount})`;

const projectProfileInput = z.object({
	companyId: z.number().int().positive(),
	projectName: z.string().trim().min(2).max(255),
	summary: z.string().trim().min(2).max(2000),
	purpose: z.string().trim().min(2).max(2000),
	businessGoals: csvArraySchema,
	stakeholders: csvArraySchema,
	scopeIn: csvArraySchema,
	scopeOut: csvArraySchema,
	architectureOverview: z.string().trim().min(2).max(3000),
	dataModels: csvArraySchema,
	integrations: csvArraySchema,
	requiredCapabilities: csvArraySchema,
	requiredTechStack: csvArraySchema,
	developmentProcess: z.string().trim().min(2).max(3000),
	timelineMilestones: csvArraySchema,
	riskFactors: csvArraySchema,
	operationsPlan: z.string().trim().min(2).max(3000),
	qualityCompliance: csvArraySchema,
	dependencies: csvArraySchema,
	requiredTeamByRole: requiredTeamByRoleSchema,
	environments: csvArraySchema,
	deploymentStrategy: z.string().trim().min(2).max(3000),
	monitoringAndLogging: z.string().trim().min(2).max(3000),
	maintenancePlan: z.string().trim().min(2).max(3000),
}).transform((input) => ({
	...input,
	teamRoles: input.requiredTeamByRole.map(toLegacyTeamRoleLabel),
	targetTeamSize: input.requiredTeamByRole.reduce(
		(total, role) => total + role.headcount,
		0,
	),
}));

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
