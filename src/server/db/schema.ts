import { relations } from "drizzle-orm";
import type { RequiredTeamRole } from "~/modules/team-sync/domain/entities";
import { index, pgTableCreator, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `team_sync_ai_ts_${name}`);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);

export const users = createTable("user", (d) => ({
	id: d
		.varchar({ length: 255 })
		.notNull()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: d.varchar({ length: 255 }),
	email: d.varchar({ length: 255 }).notNull(),
	emailVerified: d
		.timestamp({
			mode: "date",
			withTimezone: true,
		})
		.$defaultFn(() => /* @__PURE__ */ new Date()),
	image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
}));

export const accounts = createTable(
	"account",
	(d) => ({
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
		provider: d.varchar({ length: 255 }).notNull(),
		providerAccountId: d.varchar({ length: 255 }).notNull(),
		refresh_token: d.text(),
		access_token: d.text(),
		expires_at: d.integer(),
		token_type: d.varchar({ length: 255 }),
		scope: d.varchar({ length: 255 }),
		id_token: d.text(),
		session_state: d.varchar({ length: 255 }),
	}),
	(t) => [
		primaryKey({ columns: [t.provider, t.providerAccountId] }),
		index("account_user_id_idx").on(t.userId),
	],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
	"session",
	(d) => ({
		sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
	}),
	(t) => [index("t_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
	"verification_token",
	(d) => ({
		identifier: d.varchar({ length: 255 }).notNull(),
		token: d.varchar({ length: 255 }).notNull(),
		expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
	}),
	(t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const teamSyncCompanies = createTable(
	"team_sync_company",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 255 }).notNull(),
		industry: d.varchar({ length: 255 }).notNull(),
		businessIntent: d.text().notNull(),
		technologyIntent: d.text().notNull(),
		standards: d.text().array().notNull(),
		partnerships: d.text().array().notNull(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	}),
	(t) => [uniqueIndex("team_sync_company_name_uq").on(t.name)],
);

export const teamSyncProjects = createTable(
	"team_sync_project",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		companyId: d
			.integer()
			.notNull()
			.references(() => teamSyncCompanies.id),
		projectName: d.varchar({ length: 255 }).notNull(),
		summary: d.text().notNull(),
		purpose: d.text().notNull().default(""),
		businessGoals: d.text().notNull().default(""),
		stakeholders: d.text().notNull().default(""),
		scopeIn: d.text().notNull().default(""),
		scopeOut: d.text().notNull().default(""),
		architectureOverview: d.text().notNull().default(""),
		dataModels: d.text().notNull().default(""),
		integrations: d.text().notNull().default(""),
		requiredTechStack: d.text().notNull().default(""),
		developmentProcess: d.text().notNull().default(""),
		timelineMilestones: d.text().notNull().default(""),
		riskFactors: d.text().notNull().default(""),
		operationsPlan: d.text().notNull().default(""),
		qualityCompliance: d.text().notNull().default(""),
		dependencies: d.text().notNull().default(""),
		requiredTeamByRole: d.jsonb().$type<RequiredTeamRole[]>().notNull().default([]),
		teamRoles: d.text().array().notNull().default([]),
		environments: d.text().notNull().default(""),
		deploymentStrategy: d.text().notNull().default(""),
		monitoringAndLogging: d.text().notNull().default(""),
		maintenancePlan: d.text().notNull().default(""),
		targetTeamSize: d.integer().notNull(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	}),
	(t) => [
		index("team_sync_project_company_idx").on(t.companyId),
		uniqueIndex("team_sync_project_name_uq").on(t.projectName),
	],
);

export const teamSyncTalentMembers = createTable(
	"team_sync_talent_member",
	(d) => ({
		id: d.varchar({ length: 64 }).primaryKey(),
		fullName: d.varchar({ length: 255 }).notNull(),
		role: d.varchar({ length: 128 }).notNull(),
		expertise: d.text().array().notNull(),
		techStack: d.text().array().notNull(),
		certifications: d.text().array().notNull(),
		responsibilities: d.text().array().notNull().default([]),
		communicationStyle: d.text().notNull().default("Collaborative"),
		growthGoals: d.text().array().notNull().default([]),
		capacityPercent: d.integer().notNull(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	}),
	(t) => [index("team_sync_talent_member_role_idx").on(t.role)],
);

export const apiMetrics = createTable(
	"api_metric",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		service: d.varchar({ length: 120 }).notNull(),
		processingTimeMs: d.integer(),
		inputTokens: d.integer(),
		outputTokens: d.integer(),
		totalCost: d.numeric({ precision: 12, scale: 6 }),
		wasCache: d.boolean().notNull().default(false),
		hadError: d.boolean().notNull().default(false),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	}),
	(t) => [
		index("api_metric_service_idx").on(t.service),
		index("api_metric_created_at_idx").on(t.createdAt),
	],
);

export const cacheMetrics = createTable(
	"cache_metric",
	(d) => ({
		service: d.varchar({ length: 120 }).notNull(),
		inputHash: d.varchar({ length: 128 }).notNull(),
		hitCount: d.integer().notNull().default(0),
		missCount: d.integer().notNull().default(0),
		lastAccessedAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	}),
	(t) => [
		primaryKey({ columns: [t.service, t.inputHash] }),
		index("cache_metric_last_access_idx").on(t.lastAccessedAt),
	],
);

export const aiPromptVersions = createTable(
	"ai_prompt_version",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		promptId: d.integer().notNull(),
		version: d.integer().notNull(),
		promptTemplate: d.text().notNull(),
		systemInstruction: d.text(),
		changeNotes: d.text(),
		isActive: d.boolean().notNull().default(true),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	}),
	(t) => [
		uniqueIndex("ai_prompt_version_prompt_version_uq").on(t.promptId, t.version),
		index("ai_prompt_version_prompt_id_idx").on(t.promptId),
	],
);
