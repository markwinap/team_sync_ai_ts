import type { TeamMemberProfileDraft } from "~/modules/team-sync/domain/entities";
import { normalizeText, normalizeStringArray, normalizeLanguages } from "~/lib/normalize";
import { callGemini, getGeminiApiKey, getGeminiModel } from "./gemini-client";
import { AI_GENERATION_CONFIG } from "./ai-config";
import { withResponseCache } from "./response-cache";

type TeamMemberDecisionSummaryInput = {
    memberProfile: TeamMemberProfileDraft;
};

const normalizeProfile = (input: TeamMemberProfileDraft): TeamMemberProfileDraft => ({
    fullName: normalizeText(input.fullName),
    email: normalizeText(input.email),
    roles: normalizeStringArray(input.roles),
    expertise: normalizeStringArray(input.expertise),
    techStack: normalizeStringArray(input.techStack),
    certifications: normalizeStringArray(input.certifications),
    responsibilities: normalizeStringArray(input.responsibilities),
    communicationStyle: normalizeText(input.communicationStyle),
    growthGoals: normalizeStringArray(input.growthGoals),
    generatedSummary: normalizeText(input.generatedSummary),
    languages: normalizeLanguages(input.languages),
});

const buildFallbackSummary = (input: TeamMemberDecisionSummaryInput) => {
    const member = normalizeProfile(input.memberProfile);
    const capabilitySignals = [
        ...member.roles,
        ...member.expertise,
        ...member.techStack,
        ...member.certifications,
    ];
    const readinessScore = Math.max(45, Math.min(95, Math.round(55 + capabilitySignals.length * 2.5)));
    const recommendation = readinessScore >= 80 ? "Strong fit" : readinessScore >= 65 ? "Contextual fit" : "Needs validation";

    const matchingEvidence = [
        member.roles.length > 0
            ? `Role breadth: ${member.roles.join(", ")}.`
            : "Role coverage is not explicitly documented.",
        capabilitySignals.length > 0
            ? `Documented capability signals: ${capabilitySignals.slice(0, 8).join(", ")}.`
            : "Capability signals are limited; gather concrete evidence before staffing decisions.",
        member.communicationStyle.length > 0
            ? `Communication profile captured: ${member.communicationStyle}.`
            : "Communication style is not captured; stakeholder fit should be validated in interview.",
    ];

    const riskNotes = [
        "Role and depth alignment should be validated against the target project scope before assignment.",
        "Technical depth in critical tools should be validated with practical examples.",
        member.growthGoals.length > 0
            ? `Growth goals to consider: ${member.growthGoals.join(", ")}.`
            : "No growth goals were captured; check long-term role continuity.",
    ];

    return [
        `## Team Member Decision Summary`,
        "",
        `- Readiness score: ${readinessScore}/100`,
        `- Recommendation: ${recommendation}`,
        "",
        "### Why This Candidate Fits",
        ...matchingEvidence.map((item) => `- ${item}`),
        "",
        "### Risks And Validation Checks",
        ...riskNotes.map((item) => `- ${item}`),
        "",
        "### Suggested Validation Focus",
        "- Validate role ownership expectations, technical depth, and delivery reliability in the target assignment context.",
    ].join("\n");
};

const buildPrompt = (input: TeamMemberDecisionSummaryInput) => {
    const { fullName: _fullName, email: _email, ...memberWithoutPII } = normalizeProfile(input.memberProfile);

    return [
        "Create a staffing decision summary to determine when this team member should be selected.",
        "Return markdown only (no code fences).",
        "Keep it practical for delivery managers and project leads.",
        "Frame recommendations as conditions for assignment rather than project-specific directives.",
        "Required sections:",
        "Evidence For Selection",
        "Risks / Gaps",
        "Final Recommendation",
        "",
        "Candidate profile JSON:",
        JSON.stringify(memberWithoutPII, null, 2),
    ].join("\n");
};

export async function generateTeamMemberDecisionSummaryWithAI(
    input: TeamMemberDecisionSummaryInput
): Promise<string> {
    const fallback = buildFallbackSummary(input);

    if (!getGeminiApiKey()) {
        return `${fallback}\n\n[AI runtime note] Set GOOGLE_GEMINI_API_KEY (and optionally GOOGLE_GEMINI_MODEL) in .env to enable model-driven summaries.`;
    }

    try {
        return await withResponseCache({
            service: "team-member-decision-summary",
            input: {
                ...input,
                memberProfile: normalizeProfile(input.memberProfile),
                model: getGeminiModel(),
            },
            ttlSeconds: AI_GENERATION_CONFIG.CACHE_TTL_SECONDS.TEAM_MEMBER_DECISION_SUMMARY,
            compute: async () => {
                const generatedSummary = await callGemini({
                    systemInstruction: [
                        "You are a senior engineering staffing advisor.",
                        "Prioritize practical role fit and delivery risk.",
                        "Return markdown only without code fences.",
                    ].join("\n"),
                    userPrompt: buildPrompt(input),
                    temperature: AI_GENERATION_CONFIG.TEMPERATURE.BALANCED,
                    topP: AI_GENERATION_CONFIG.TOP_P.BALANCED,
                    maxOutputTokens: AI_GENERATION_CONFIG.MAX_OUTPUT_TOKENS.TEAM_MEMBER_DECISION_SUMMARY,
                });

                return generatedSummary || fallback;
            },
        });
    } catch {
        return fallback;
    }
}
