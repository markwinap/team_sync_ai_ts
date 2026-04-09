ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "businessGoals" TYPE text USING COALESCE(array_to_string("businessGoals", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "businessGoals" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "stakeholders" TYPE text USING COALESCE(array_to_string("stakeholders", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "stakeholders" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "scopeIn" TYPE text USING COALESCE(array_to_string("scopeIn", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "scopeIn" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "scopeOut" TYPE text USING COALESCE(array_to_string("scopeOut", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "scopeOut" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "dataModels" TYPE text USING COALESCE(array_to_string("dataModels", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "dataModels" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "integrations" TYPE text USING COALESCE(array_to_string("integrations", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "integrations" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "requiredCapabilities" TYPE text USING COALESCE(array_to_string("requiredCapabilities", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "requiredCapabilities" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "requiredTechStack" TYPE text USING COALESCE(array_to_string("requiredTechStack", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "requiredTechStack" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "timelineMilestones" TYPE text USING COALESCE(array_to_string("timelineMilestones", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "timelineMilestones" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "riskFactors" TYPE text USING COALESCE(array_to_string("riskFactors", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "riskFactors" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "qualityCompliance" TYPE text USING COALESCE(array_to_string("qualityCompliance", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "qualityCompliance" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "dependencies" TYPE text USING COALESCE(array_to_string("dependencies", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "dependencies" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "environments" TYPE text USING COALESCE(array_to_string("environments", E'\n'), '');--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_project" ALTER COLUMN "environments" SET DEFAULT '';