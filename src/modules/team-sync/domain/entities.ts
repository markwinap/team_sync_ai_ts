export type TeamMember = {
	id: string;
	fullName: string;
	role: string;
	expertise: string[];
	techStack: string[];
	certifications: string[];
	responsibilities: string[];
	communicationStyle: string;
	growthGoals: string[];
	capacityPercent: number;
};

export type TeamMemberProfileDraft = {
	fullName: string;
	role: string;
	expertise: string[];
	techStack: string[];
	certifications: string[];
	responsibilities: string[];
	communicationStyle: string;
	growthGoals: string[];
	capacityPercent: number;
};

export type CompanyProfile = {
	name: string;
	industry: string;
	businessIntent: string;
	technologyIntent: string;
	standards: string[];
	partnerships: string[];
};

export type CompanyProfileDraft = CompanyProfile;

export type CompanyRecord = CompanyProfile & {
	id: number;
};

export type ProjectRequirement = {
	projectName: string;
	summary: string;
	requiredCapabilities: string[];
	requiredTechStack: string[];
	riskFactors: string[];
	targetTeamSize: number;
};

export type ProjectProfileDraft = ProjectRequirement & {
	companyId: number;
};

export type ProjectRecord = ProjectRequirement & {
	id: number;
	companyId: number;
};

export type TeamAssignmentCandidate = {
	member: TeamMember;
	score: number;
	reasons: string[];
};

export type TeamAssignmentResult = {
	projectName: string;
	recommendedTeam: TeamAssignmentCandidate[];
	uncoveredCapabilities: string[];
};

export type ProjectArtifactBundle = {
	functionalRequirements: string[];
	nonFunctionalRequirements: string[];
	userStories: string[];
	risksAndConstraints: string[];
	highLevelArchitecture: string[];
	scope: {
		in: string[];
		out: string[];
	};
};

export const normalize = (value: string) => value.trim().toLowerCase();

export const overlapScore = (left: string[], right: string[]) => {
	if (left.length === 0 || right.length === 0) {
		return 0;
	}

	const rightSet = new Set(right.map(normalize));
	const matches = left.filter((item) => rightSet.has(normalize(item))).length;
	return matches / left.length;
};
