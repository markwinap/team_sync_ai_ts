-- Drop capacity_percent column
ALTER TABLE "team_sync_ai_ts_team_sync_talent_member" DROP COLUMN "capacityPercent";
--> statement-breakpoint
-- Add email column
ALTER TABLE "team_sync_ai_ts_team_sync_talent_member" ADD COLUMN "email" varchar(255) NOT NULL DEFAULT '';
--> statement-breakpoint
-- Add languages JSONB column (array of {language, percent})
ALTER TABLE "team_sync_ai_ts_team_sync_talent_member" ADD COLUMN "languages" jsonb NOT NULL DEFAULT '[]';
--> statement-breakpoint
-- Add roles text array column
ALTER TABLE "team_sync_ai_ts_team_sync_talent_member" ADD COLUMN "roles" text[] NOT NULL DEFAULT '{}';
--> statement-breakpoint
-- Copy existing single role into the new roles array
UPDATE "team_sync_ai_ts_team_sync_talent_member" SET "roles" = ARRAY["role"];
--> statement-breakpoint
-- Drop the old role index before dropping column
DROP INDEX IF EXISTS "team_sync_talent_member_role_idx";
--> statement-breakpoint
-- Drop the old single-value role column
ALTER TABLE "team_sync_ai_ts_team_sync_talent_member" DROP COLUMN "role";
