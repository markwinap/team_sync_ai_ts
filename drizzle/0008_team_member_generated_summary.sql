ALTER TABLE "team_sync_talent_member"
ADD COLUMN IF NOT EXISTS "generated_summary" text NOT NULL DEFAULT '';
