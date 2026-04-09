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

const projectProfileInput = z.object({
	companyId: z.number().int().positive(),
	projectName: z.string().trim().min(2).max(255),
	summary: z.string().trim().min(2).max(2000),
	requiredCapabilities: csvArraySchema,
	requiredTechStack: csvArraySchema,
	riskFactors: csvArraySchema,
	targetTeamSize: z.number().int().min(1).max(50),
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
