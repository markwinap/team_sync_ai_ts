import type {
	CompanyProfileDraft,
	CompanyRecord,
	CompanyProfile,
	ProjectProfileDraft,
	ProjectRecord,
	ProjectRequirement,
	TeamMemberProfileDraft,
	TeamMember,
} from "~/modules/team-sync/domain/entities";

export type TeamSyncRepository = {
	getCompanyProfile(): Promise<CompanyProfile>;
	listCompanyProfiles(): Promise<CompanyRecord[]>;
	createCompanyProfile(input: CompanyProfileDraft): Promise<CompanyRecord>;
	updateCompanyProfile(companyId: number, input: CompanyProfileDraft): Promise<CompanyRecord>;
	getTalentBank(): Promise<TeamMember[]>;
	listTeamMemberProfiles(): Promise<TeamMember[]>;
	createTeamMemberProfile(input: TeamMemberProfileDraft): Promise<TeamMember>;
	updateTeamMemberProfile(memberId: string, input: TeamMemberProfileDraft): Promise<TeamMember>;
	deleteTeamMemberProfile(memberId: string): Promise<void>;
	getProjectRequirement(projectName: string): Promise<ProjectRequirement | null>;
	listProjectProfiles(): Promise<ProjectRecord[]>;
	createProjectProfile(input: ProjectProfileDraft): Promise<ProjectRecord>;
	updateProjectProfile(projectId: number, input: ProjectProfileDraft): Promise<ProjectRecord>;
	updateProjectField(projectId: number, fieldName: string, content: string): Promise<void>;
	listProjectRequirements(): Promise<ProjectRequirement[]>;
};
