import type {
	RequiredTeamRole,
	TeamMemberLanguage,
} from "~/modules/team-sync/domain/entities";

/**
 * Trim and lowercase a string. Returns "" for null/undefined.
 */
export const normalizeText = (value: string | null | undefined) =>
	(value ?? "").trim();

/**
 * Trim and lowercase a string for case-insensitive comparison.
 */
export const normalizeLower = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();

/**
 * Trim and filter empty entries from a string array.
 */
export const normalizeStringArray = (values: string[] | null | undefined) =>
	(values ?? []).map((item) => item.trim()).filter((item) => item.length > 0);

/**
 * Split a comma-separated string into a trimmed, non-empty array.
 */
export const csvToArray = (value: string) =>
	value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);

/**
 * Normalize language entries, filtering invalid ones.
 */
export const normalizeLanguages = (
	languages: TeamMemberLanguage[] | null | undefined,
	minPercent = 0,
) =>
	(languages ?? [])
		.map((entry) => ({
			language: normalizeText(entry?.language),
			percent: Number(entry?.percent),
		}))
		.filter(
			(entry) =>
				entry.language.length > 0 &&
				Number.isFinite(entry.percent) &&
				entry.percent >= minPercent &&
				entry.percent <= 100,
		);

/**
 * Normalize required team roles with clamped allocation percentages.
 */
export const normalizeRequiredTeamByRole = (
	value:
		| Array<{
				role?: string;
				headcount?: number;
				allocationPercent?: number;
				assignedMemberId?: string;
		  }>
		| undefined,
) =>
	(value ?? [])
		.map((entry) => ({
			role: entry.role?.trim() ?? "",
			headcount: Number(entry.headcount) || 1,
			allocationPercent: Math.min(
				100,
				Math.max(25, Number(entry.allocationPercent) || 100),
			),
			assignedMemberId: entry.assignedMemberId?.trim() || undefined,
		}))
		.filter((entry) => entry.role.length > 0);

/**
 * Compute overlap score between two string arrays (case-insensitive).
 */
export const overlapScore = (left: string[], right: string[]) => {
	if (left.length === 0 || right.length === 0) {
		return 0;
	}

	const rightSet = new Set(right.map(normalizeLower));
	const matches = left.filter((item) =>
		rightSet.has(normalizeLower(item)),
	).length;
	return matches / left.length;
};

/**
 * Parse a legacy team role label like "Backend Engineer (x2)" into structured form.
 */
export const parseLegacyTeamRole = (value: string): RequiredTeamRole => {
	const trimmed = value.trim();
	const match = /^(.*)\(x(\d+)\)$/i.exec(trimmed);

	if (!match) {
		return { role: trimmed, headcount: 1, allocationPercent: 100 };
	}

	return {
		role: match[1]?.trim() ?? trimmed,
		headcount: Number(match[2]) || 1,
		allocationPercent: 100,
	};
};

/**
 * Format a team role entry as a legacy label string.
 */
export const formatLegacyTeamRole = (entry: RequiredTeamRole) =>
	`${entry.role} (x${entry.headcount})`;

/**
 * Resolve required team by role from either structured array or legacy team role strings.
 */
export const resolveRequiredTeamByRole = (
	requiredTeamByRole:
		| Array<{
				role?: string;
				headcount?: number;
				allocationPercent?: number;
				assignedMemberId?: string;
		  }>
		| null
		| undefined,
	teamRoles: string[],
) => {
	const normalized = normalizeRequiredTeamByRole(requiredTeamByRole ?? []);

	if (normalized.length > 0) {
		return normalized;
	}

	return normalizeRequiredTeamByRole(teamRoles.map(parseLegacyTeamRole));
};

/**
 * Derive legacy team role labels from structured roles.
 */
export const deriveLegacyTeamRoles = (roles: RequiredTeamRole[]) =>
	roles.map(formatLegacyTeamRole);

/**
 * Derive target team size from required roles.
 */
export const deriveTargetTeamSize = (roles: RequiredTeamRole[]) =>
	roles.reduce((total, entry) => total + entry.headcount, 0);

/**
 * Parse a markdown bulleted list into an array of strings.
 */
export const parseMarkdownList = (value: string) =>
	value
		.split(/\r?\n/)
		.map((line) => line.trim().replace(/^[-*]\s+/, ""))
		.filter((line) => line.length > 0);

/**
 * Extract first JSON object from text.
 */
export const extractJsonObject = (text: string) => {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");

	if (start < 0 || end <= start) {
		return null;
	}

	return text.slice(start, end + 1);
};

/**
 * Extract first JSON array from text.
 */
export const extractJsonArray = (content: string) => {
	const firstBracket = content.indexOf("[");
	const lastBracket = content.lastIndexOf("]");

	if (
		firstBracket === -1 ||
		lastBracket === -1 ||
		lastBracket <= firstBracket
	) {
		return content;
	}

	return content.slice(firstBracket, lastBracket + 1);
};

/**
 * Format a team member label with optional roles.
 */
export const formatTeamMemberLabel = (member: {
	fullName: string;
	roles?: string[] | null;
}) => {
	const roles = normalizeStringArray(member.roles);

	if (roles.length === 0) {
		return member.fullName;
	}

	return `${member.fullName} (${roles.join(", ")})`;
};
