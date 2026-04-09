UPDATE "team_sync_ai_ts_team_sync_project"
SET "requiredTeamByRole" = COALESCE(
	(
		SELECT jsonb_agg(
			CASE
				WHEN jsonb_typeof(entry) = 'object' THEN jsonb_set(
					entry,
					'{allocationPercent}',
					to_jsonb(
						LEAST(
							100,
							GREATEST(
								1,
								CASE
									WHEN (entry->>'allocationPercent') ~ '^\\d+$' THEN (entry->>'allocationPercent')::integer
									ELSE 100
								END
							)
						)
					),
					true
				)
				ELSE entry
			END
		)
		FROM jsonb_array_elements(COALESCE("requiredTeamByRole", '[]'::jsonb)) AS entry
	),
	'[]'::jsonb
);