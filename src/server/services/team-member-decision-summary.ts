import { env } from "~/env";
import type { TeamMemberProfileDraft } from "~/modules/team-sync/domain/entities";
import { AI_GENERATION_CONFIG } from "./ai-config";
import { withResponseCache } from "./response-cache";

type TeamMemberDecisionSummaryInput = {
    memberProfile: TeamMemberProfileDraft;
};

const normalizeProfile = (input: TeamMemberProfileDraft): TeamMemberProfileDraft => ({
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    roles: input.roles.map((role) => role.trim()).filter((role) => role.length > 0),
    expertise: input.expertise.map((item) => item.trim()).filter((item) => item.length > 0),
    techStack: input.techStack.map((item) => item.trim()).filter((item) => item.length > 0),
    certifications: input.certifications
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    responsibilities: input.responsibilities
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    communicationStyle: input.communicationStyle.trim(),
    growthGoals: input.growthGoals.map((item) => item.trim()).filter((item) => item.length > 0),
    generatedSummary: input.generatedSummary.trim(),
    languages: (input.languages ?? [])
        .map((entry) => ({
            language: entry.language.trim(),
            percent: Number(entry.percent),
        }))
        .filter((entry) => entry.language.length > 0 && Number.isFinite(entry.percent)),
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
        "1) Evidence For Selection",
        "2) Risks / Gaps",
        "3) Final Recommendation",
        "",
        "Candidate profile JSON:",
        JSON.stringify(memberWithoutPII, null, 2),
    ].join("\n");
};

export async function generateTeamMemberDecisionSummaryWithAI(
    input: TeamMemberDecisionSummaryInput
): Promise<string> {
    const fallback = buildFallbackSummary(input);
    const apiKey = env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        return `${fallback}\n\n[AI runtime note] Set GOOGLE_GEMINI_API_KEY (and optionally GOOGLE_GEMINI_MODEL) in .env to enable model-driven summaries.`;
    }

    try {
        return await withResponseCache({
            service: "team-member-decision-summary",
            input: {
                ...input,
                memberProfile: normalizeProfile(input.memberProfile),
                model: env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash",
            },
            ttlSeconds: AI_GENERATION_CONFIG.CACHE_TTL_SECONDS.TEAM_MEMBER_DECISION_SUMMARY,
            compute: async () => {
                const model = env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash";
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [
                                {
                                    text: [
                                        "You are a senior engineering staffing advisor.",
                                        "Prioritize practical role fit and delivery risk.",
                                        "Return markdown only without code fences.",
                                    ].join("\n"),
                                },
                            ],
                        },
                        contents: [
                            {
                                role: "user",
                                parts: [{ text: buildPrompt(input) }],
                            },
                        ],
                        generationConfig: {
                            temperature: AI_GENERATION_CONFIG.TEMPERATURE.BALANCED,
                            topP: AI_GENERATION_CONFIG.TOP_P.BALANCED,
                            maxOutputTokens:
                                AI_GENERATION_CONFIG.MAX_OUTPUT_TOKENS
                                    .TEAM_MEMBER_DECISION_SUMMARY,
                        },
                    }),
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(
                        `Team member summary generation failed: ${response.status} ${errorBody}`
                    );
                }

                const data = (await response.json()) as {
                    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };

                const generatedSummary = data.candidates?.[0]?.content?.parts
                    ?.map((part) => part.text ?? "")
                    .join("\n")
                    .trim();

                if (!generatedSummary) {
                    return fallback;
                }

                return generatedSummary;
            },
        });
    } catch {
        return fallback;
    }
}
