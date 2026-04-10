import type { TeamMember, TeamMemberLanguage } from "~/modules/team-sync/domain/entities";
import { normalizeLower, overlapScore, parseMarkdownList, extractJsonObject } from "~/lib/normalize";
import { callGemini, getGeminiApiKey, getGeminiModel } from "./gemini-client";
import { AI_GENERATION_CONFIG } from "./ai-config";
import { withResponseCache } from "./response-cache";

type ProjectProfileForMatching = {
    projectName: string;
    summary: string;
    purpose: string;
    businessGoals: string;
    stakeholders: string;
    scopeIn: string;
    scopeOut: string;
    architectureOverview: string;
    dataModels: string;
    integrations: string;
    requiredTechStack: string;
    developmentProcess: string;
    timelineMilestones: string;
    riskFactors: string;
    operationsPlan: string;
    qualityCompliance: string;
    dependencies: string;
    environments: string;
    deploymentStrategy: string;
    monitoringAndLogging: string;
    maintenancePlan: string;
    languages: TeamMemberLanguage[];
};

type TeamMemberMatcherInput = {
    role: string;
    minimumLanguagePercent: number;
    projectProfile: ProjectProfileForMatching;
    members: TeamMember[];
};

export type RankedTeamMemberCandidate = {
    memberId: string;
    fullName: string;
    roles: string[];
    expertise: string[];
    matchedLanguages: string[];
    generatedSummary: string;
    matchScore: number;
    rationale: string;
};

export type TeamMemberMatcherResult = {
    candidates: RankedTeamMemberCandidate[];
    recommendedMemberId?: string;
    totalSuitableMembers: number;
};

type InternalCandidate = {
    member: TeamMember;
    baselineScore: number;
    matchedLanguages: string[];
};

const roleWeight = 0.6;
const stackWeight = 0.4;

const rankByBaseline = (candidates: InternalCandidate[]) =>
    candidates
        .sort((left, right) => right.baselineScore - left.baselineScore)
        .map((candidate) => ({
            memberId: candidate.member.id,
            fullName: candidate.member.fullName,
            roles: candidate.member.roles,
            expertise: candidate.member.expertise,
            matchedLanguages: candidate.matchedLanguages,
            generatedSummary: candidate.member.generatedSummary,
            matchScore: Math.max(1, Math.min(100, Math.round(candidate.baselineScore * 100))),
            rationale:
                candidate.matchedLanguages.length > 0
                    ? `Deterministic ranking based on role, stack, and language fit (${candidate.matchedLanguages.join(", ")}).`
                    : "Deterministic ranking based on role and stack fit.",
        }));

const buildApplicableProjectFields = (project: ProjectProfileForMatching) => {
    const fields: Array<[string, string]> = [
        ["projectName", project.projectName],
        ["summary", project.summary],
        ["purpose", project.purpose],
        ["businessGoals", project.businessGoals],
        ["stakeholders", project.stakeholders],
        ["scopeIn", project.scopeIn],
        ["scopeOut", project.scopeOut],
        ["architectureOverview", project.architectureOverview],
        ["dataModels", project.dataModels],
        ["integrations", project.integrations],
        ["requiredTechStack", project.requiredTechStack],
        ["developmentProcess", project.developmentProcess],
        ["timelineMilestones", project.timelineMilestones],
        ["riskFactors", project.riskFactors],
        ["operationsPlan", project.operationsPlan],
        ["qualityCompliance", project.qualityCompliance],
        ["dependencies", project.dependencies],
        ["environments", project.environments],
        ["deploymentStrategy", project.deploymentStrategy],
        ["monitoringAndLogging", project.monitoringAndLogging],
        ["maintenancePlan", project.maintenancePlan],
    ];

    return fields
        .map(([key, value]) => ({ key, value: value.trim() }))
        .filter((field) => field.value.length > 0);
};

const buildRankingPrompt = (input: {
    role: string;
    minimumLanguagePercent: number;
    projectProfile: ProjectProfileForMatching;
    candidates: InternalCandidate[];
}) => {
    const applicableFields = buildApplicableProjectFields(input.projectProfile);

    return [
        "Rank candidate team members for a specific project role.",
        "Return JSON only with this shape:",
        '{"rankedCandidates":[{"memberId":"string","matchScore":0,"reason":"string"}],"recommendedMemberId":"string"}',
        "Rules:",
        "- Only return memberIds from the provided candidate list.",
        "- matchScore must be integer 0..100.",
        "- Higher score means stronger role fit and delivery suitability.",
        "- Consider language alignment, role fit, stack fit, and delivery context from project fields.",
        "- Prefer concise reasons tied to provided evidence.",
        "",
        `Target role: ${input.role}`,
        `Minimum language percent filter: ${input.minimumLanguagePercent}`,
        "",
        "Project applicable fields:",
        JSON.stringify(applicableFields, null, 2),
        "",
        "Candidate list (id and generatedSummary included):",
        JSON.stringify(
            input.candidates.map((candidate) => ({
                memberId: candidate.member.id,
                fullName: candidate.member.fullName,
                roles: candidate.member.roles,
                expertise: candidate.member.expertise,
                techStack: candidate.member.techStack,
                matchedLanguages: candidate.matchedLanguages,
                generatedSummary: candidate.member.generatedSummary,
                baselineScore: Number(candidate.baselineScore.toFixed(4)),
            })),
            null,
            2
        ),
    ].join("\n");
};

const filterSuitableMembers = (input: TeamMemberMatcherInput): InternalCandidate[] => {
    const normalizedRole = normalizeLower(input.role);
    const requiredStack = parseMarkdownList(input.projectProfile.requiredTechStack);
    const requiredLanguages = (input.projectProfile.languages ?? [])
        .map((entry) => normalizeLower(entry.language))
        .filter((language) => language.length > 0);

    const minimumLanguagePercent = Math.max(0, Math.min(100, Math.round(input.minimumLanguagePercent)));

    const suitable = input.members
        .filter((member) => {
            const hasRoleMatch = [...member.roles, ...member.expertise].some((entry) =>
                normalizeLower(entry).includes(normalizedRole)
            );

            if (!hasRoleMatch) {
                return false;
            }

            if (requiredLanguages.length === 0) {
                return true;
            }

            return (member.languages ?? []).some((languageEntry) => {
                const candidateLanguage = normalizeLower(languageEntry.language);
                if (!requiredLanguages.includes(candidateLanguage)) {
                    return false;
                }

                return Number(languageEntry.percent) >= minimumLanguagePercent;
            });
        })
        .map((member) => {
            const roleFit = overlapScore([input.role], [...member.roles, ...member.expertise]);
            const stackFit = overlapScore(requiredStack, member.techStack);
            const baselineScore = roleFit * roleWeight + stackFit * stackWeight;
            const matchedLanguages = (member.languages ?? [])
                .filter((languageEntry) => {
                    const candidateLanguage = normalizeLower(languageEntry.language);
                    return (
                        requiredLanguages.includes(candidateLanguage) &&
                        Number(languageEntry.percent) >= minimumLanguagePercent
                    );
                })
                .map((entry) => `${entry.language} (${entry.percent}%)`);

            return {
                member,
                baselineScore,
                matchedLanguages,
            };
        })
        .sort((left, right) => right.baselineScore - left.baselineScore)
        .slice(0, 20);

    return suitable;
};

export async function recommendTeamMembersForProjectRoleWithAI(
    input: TeamMemberMatcherInput
): Promise<TeamMemberMatcherResult> {
    const suitableCandidates = filterSuitableMembers(input);

    if (suitableCandidates.length === 0) {
        return {
            candidates: [],
            totalSuitableMembers: 0,
        };
    }

    const fallbackCandidates = rankByBaseline(suitableCandidates);
    const fallbackRecommendedMemberId = fallbackCandidates[0]?.memberId;

    if (!getGeminiApiKey()) {
        return {
            candidates: fallbackCandidates,
            recommendedMemberId: fallbackRecommendedMemberId,
            totalSuitableMembers: suitableCandidates.length,
        };
    }

    try {
        const ranked = await withResponseCache({
            service: "team-member-matching",
            input: {
                role: input.role,
                minimumLanguagePercent: input.minimumLanguagePercent,
                projectProfile: input.projectProfile,
                candidateMembers: suitableCandidates.map((candidate) => ({
                    memberId: candidate.member.id,
                    roles: candidate.member.roles,
                    expertise: candidate.member.expertise,
                    techStack: candidate.member.techStack,
                    languages: candidate.member.languages,
                    generatedSummary: candidate.member.generatedSummary,
                    baselineScore: Number(candidate.baselineScore.toFixed(4)),
                })),
                model: getGeminiModel(),
            },
            ttlSeconds: AI_GENERATION_CONFIG.CACHE_TTL_SECONDS.TEAM_MEMBER_MATCHING,
            compute: async () => {
                const rawContent = await callGemini({
                    systemInstruction: [
                        "You are a senior software staffing advisor.",
                        "Rank candidates only with provided evidence.",
                        "Return JSON only without markdown.",
                    ].join("\n"),
                    userPrompt: buildRankingPrompt({
                        role: input.role,
                        minimumLanguagePercent: input.minimumLanguagePercent,
                        projectProfile: input.projectProfile,
                        candidates: suitableCandidates,
                    }),
                    temperature: AI_GENERATION_CONFIG.TEMPERATURE.DETERMINISTIC,
                    topP: AI_GENERATION_CONFIG.TOP_P.PRECISE,
                    maxOutputTokens: AI_GENERATION_CONFIG.MAX_OUTPUT_TOKENS.TEAM_MEMBER_MATCHING,
                });

                if (!rawContent) {
                    return {
                        rankedCandidates: fallbackCandidates.map((candidate) => ({
                            memberId: candidate.memberId,
                            matchScore: candidate.matchScore,
                            reason: candidate.rationale,
                        })),
                        recommendedMemberId: fallbackRecommendedMemberId,
                    };
                }

                const jsonText = extractJsonObject(rawContent);
                if (!jsonText) {
                    return {
                        rankedCandidates: fallbackCandidates.map((candidate) => ({
                            memberId: candidate.memberId,
                            matchScore: candidate.matchScore,
                            reason: candidate.rationale,
                        })),
                        recommendedMemberId: fallbackRecommendedMemberId,
                    };
                }

                const parsed = JSON.parse(jsonText) as {
                    rankedCandidates?: Array<{
                        memberId?: unknown;
                        matchScore?: unknown;
                        reason?: unknown;
                    }>;
                    recommendedMemberId?: unknown;
                };

                const validMemberIds = new Set(
                    suitableCandidates.map((candidate) => candidate.member.id)
                );

                const rankedCandidates = (parsed.rankedCandidates ?? [])
                    .map((candidate) => ({
                        memberId: String(candidate.memberId ?? "").trim(),
                        matchScore: Math.max(0, Math.min(100, Math.round(Number(candidate.matchScore) || 0))),
                        reason: String(candidate.reason ?? "").trim(),
                    }))
                    .filter((candidate) => validMemberIds.has(candidate.memberId));

                const recommendedMemberId = String(parsed.recommendedMemberId ?? "").trim();

                return {
                    rankedCandidates,
                    recommendedMemberId: validMemberIds.has(recommendedMemberId)
                        ? recommendedMemberId
                        : undefined,
                };
            },
        });

        const aiRankById = new Map(
            ranked.rankedCandidates.map((candidate) => [candidate.memberId, candidate])
        );

        const candidates = suitableCandidates
            .map((candidate) => {
                const aiCandidate = aiRankById.get(candidate.member.id);
                return {
                    memberId: candidate.member.id,
                    fullName: candidate.member.fullName,
                    roles: candidate.member.roles,
                    expertise: candidate.member.expertise,
                    matchedLanguages: candidate.matchedLanguages,
                    generatedSummary: candidate.member.generatedSummary,
                    matchScore: aiCandidate
                        ? aiCandidate.matchScore
                        : Math.max(1, Math.min(100, Math.round(candidate.baselineScore * 100))),
                    rationale:
                        aiCandidate?.reason ||
                        (candidate.matchedLanguages.length > 0
                            ? `Baseline ranking from role, stack, and language fit (${candidate.matchedLanguages.join(", ")}).`
                            : "Baseline ranking from role and stack fit."),
                };
            })
            .sort((left, right) => right.matchScore - left.matchScore);

        return {
            candidates,
            recommendedMemberId: ranked.recommendedMemberId ?? candidates[0]?.memberId,
            totalSuitableMembers: suitableCandidates.length,
        };
    } catch {
        return {
            candidates: fallbackCandidates,
            recommendedMemberId: fallbackRecommendedMemberId,
            totalSuitableMembers: suitableCandidates.length,
        };
    }
}
