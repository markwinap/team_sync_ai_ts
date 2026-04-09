ALTER TABLE "team_sync_ai_ts_team_sync_talent_member"
ADD COLUMN IF NOT EXISTS "generatedSummary" text NOT NULL DEFAULT '';
