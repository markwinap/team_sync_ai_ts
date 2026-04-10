-- Add project profile languages JSONB column (array of {language, percent})
ALTER TABLE "team_sync_ai_ts_team_sync_project" ADD COLUMN "languages" jsonb NOT NULL DEFAULT '[]';
