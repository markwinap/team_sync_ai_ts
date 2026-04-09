import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("DATABASE_URL is required.");
	process.exit(1);
}

const sql = postgres(databaseUrl);

const seed = async () => {
	const existing = await sql`
		select id
		from team_sync_ai_ts_team_sync_project
		limit 1
	`;

	if (existing.length > 0) {
		console.log("Team Sync data already seeded. No changes made.");
		return;
	}

	const [company] = await sql`
		insert into team_sync_ai_ts_team_sync_company
			(name, industry, "businessIntent", "technologyIntent", standards, partnerships, "createdAt")
		values
			(
				'Team Sync Labs',
				'Enterprise Software',
				'Accelerate enterprise delivery with AI-assisted planning.',
				'Cloud-native, API-first, and security-compliant platforms.',
				array['SOC 2', 'ISO 27001'],
				array['Cloud Platform Partners', 'Data Integration Vendors'],
				now()
			)
		returning id
	`;

	await sql`
		insert into team_sync_ai_ts_team_sync_talent_member
			(id, "fullName", role, expertise, "techStack", certifications, responsibilities, "communicationStyle", "growthGoals", "capacityPercent", "createdAt")
		values
			('tm-1', 'Anika Shah', 'Technical Architect', array['System architecture', 'API design', 'Risk mitigation'], array['TypeScript', 'PostgreSQL', 'AWS'], array['AWS Solutions Architect'], array['Define architecture runway', 'Guide technical risk decisions'], 'Structured facilitator with architecture decision records.', array['Scale architecture governance across multiple squads'], 70, now()),
			('tm-2', 'Miguel Torres', 'AI Engineer', array['Prompt engineering', 'Model evaluation', 'LLM orchestration'], array['TypeScript', 'Python', 'OpenAI'], array['Azure AI Engineer'], array['Design prompts and eval datasets', 'Harden model integration flows'], 'Experiment-driven and transparent about trade-offs.', array['Improve automated eval coverage for production prompts'], 65, now()),
			('tm-3', 'Olivia Brooks', 'Delivery Lead', array['Stakeholder management', 'Project governance', 'Compliance'], array['Jira', 'Confluence', 'PostgreSQL'], array['PMP'], array['Align stakeholders', 'Own delivery governance and reporting'], 'Concise weekly updates and proactive risk escalation.', array['Strengthen quantitative delivery forecasting'], 80, now()),
			('tm-4', 'Kenji Mori', 'Full-Stack Engineer', array['User stories', 'Frontend delivery', 'Integration'], array['Next.js', 'TypeScript', 'PostgreSQL'], array['Scrum Developer'], array['Deliver dashboard features', 'Integrate API and UI workflows'], 'Hands-on pairing with fast feedback loops.', array['Deepen system design and performance optimization skills'], 75, now())
	`;

	await sql`
		insert into team_sync_ai_ts_team_sync_project
			("companyId", "projectName", summary, "requiredCapabilities", "requiredTechStack", "riskFactors", "targetTeamSize", "createdAt")
		values
			(
				${company.id},
				'Orion Program',
				'Build AI-supported team orchestration and project artifact generation.',
				array['System architecture', 'Prompt engineering', 'Risk mitigation', 'Stakeholder management'],
				array['TypeScript', 'Next.js', 'PostgreSQL', 'OpenAI'],
				array['Potential mismatch between recommended and available talent.', 'Compliance evidence may be incomplete in early drafts.'],
				3,
				now()
			),
			(
				${company.id},
				'Atlas Renewal',
				'Modernize proposal and communication workflows for enterprise accounts.',
				array['Project governance', 'User stories', 'Integration'],
				array['TypeScript', 'PostgreSQL', 'AWS'],
				array['Integration dependencies can delay milestone approvals.'],
				2,
				now()
			)
	`;

	console.log("Team Sync data seeded successfully.");
};

seed()
	.catch((error) => {
		console.error("Failed to seed Team Sync data.");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await sql.end();
	});
