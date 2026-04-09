ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "purpose" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "businessGoals" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "stakeholders" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "scopeIn" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "scopeOut" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "architectureOverview" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "dataModels" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "integrations" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "developmentProcess" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "timelineMilestones" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "operationsPlan" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "qualityCompliance" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "dependencies" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "teamRoles" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "environments" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "deploymentStrategy" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "monitoringAndLogging" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "maintenancePlan" text DEFAULT '' NOT NULL;