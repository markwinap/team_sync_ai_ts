ALTER TABLE "team_sync_ai_ts_team_sync_talent_member" ADD COLUMN "responsibilities" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_talent_member" ADD COLUMN "communicationStyle" text DEFAULT 'Collaborative' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_sync_ai_ts_team_sync_talent_member" ADD COLUMN "growthGoals" text[] DEFAULT '{}' NOT NULL;