import { env } from "~/env";
import { AI_GENERATION_CONFIG } from "./ai-config";
import { withResponseCache } from "./response-cache";

type ProjectMarkdownReferenceField = {
    key: string;
    label: string;
    value: string;
};

type GenerateProjectMarkdownInput = {
    targetField: string;
    currentContent?: string;
    prompt?: string | null;
    referenceFields: ProjectMarkdownReferenceField[];
};

type GenerateProjectTeamRolesInput = {
    currentRoles?: Array<{ role: string; headcount: number; allocationPercent: number }>;
    prompt?: string | null;
    referenceFields: ProjectMarkdownReferenceField[];
};

type GeneratedProjectTeamRole = {
    role: string;
    headcount: number;
    allocationPercent: number;
};

const DEFAULT_TEAM_ROLE_TEMPLATE: GeneratedProjectTeamRole[] = [
    { role: "Product Manager", headcount: 1, allocationPercent: 50 },
    { role: "Tech Lead", headcount: 1, allocationPercent: 100 },
    { role: "Backend Engineer", headcount: 1, allocationPercent: 100 },
    { role: "Frontend Engineer", headcount: 1, allocationPercent: 100 },
    { role: "QA Engineer", headcount: 1, allocationPercent: 50 },
    { role: "DevOps Engineer", headcount: 1, allocationPercent: 50 },
];

const sanitizeReferenceFields = (referenceFields: ProjectMarkdownReferenceField[]) =>
    referenceFields
        .map((field) => ({
            key: field.key.trim(),
            label: field.label.trim(),
            value: field.value.trim(),
        }))
        .filter(
            (field) =>
                field.key.length > 0 &&
                field.label.length > 0 &&
                field.value.length > 0
        );

const TARGET_FIELD_GUIDANCE: Record<string, string> = {
    summary:
        "Write a concise project description with purpose, scope, and expected outcome.",
    purpose:
        "Explain why this project exists and the business value it should deliver.",
    businessGoals:
        "List clear, measurable business outcomes and success criteria.",
    stakeholders:
        "Describe key stakeholders, their concerns, and decision influence.",
    scopeIn: "Define what is in scope with clear boundaries.",
    scopeOut: "Define what is explicitly out of scope and why.",
    architectureOverview:
        "Provide a high-level architecture narrative with major components and flow.",
    dataModels: "Describe important data entities, ownership, and relationships.",
    integrations: "Describe required integrations, dependencies, and data exchanges.",
    requiredTechStack:
        "Describe technologies, platforms, and standards needed for delivery.",
    developmentProcess:
        "Describe the delivery approach, ceremonies, and quality gates.",
    timelineMilestones:
        "Provide phased milestones with key deliverables and checkpoints.",
    riskFactors:
        "Describe major risks, constraints, and mitigation strategies.",
    operationsPlan:
        "Describe operations readiness, support processes, and escalation paths.",
    qualityCompliance:
        "Describe testing, controls, and compliance expectations.",
    dependencies:
        "Describe external dependencies, sequencing, and ownership.",
    environments:
        "Describe required environments and their responsibilities.",
    deploymentStrategy:
        "Describe deployment approach, rollout strategy, and rollback plan.",
    monitoringAndLogging:
        "Describe observability, alerting, and operational telemetry.",
    maintenancePlan:
        "Describe ongoing maintenance, release cadence, and ownership.",
};

const formatReferenceFields = (referenceFields: ProjectMarkdownReferenceField[]) => {
    return referenceFields
        .map((field) => [`## ${field.label} (${field.key})`, field.value.trim()].join("\n"))
        .join("\n\n");
};

const buildPrompt = (input: GenerateProjectMarkdownInput) => {
    const referenceFields = sanitizeReferenceFields(input.referenceFields);
    const guidance =
        TARGET_FIELD_GUIDANCE[input.targetField] ??
        "Write a clear and useful markdown section for this project profile field.";

    const prompt = (input.prompt ?? "").trim();

    return [
        "Generate markdown text for a single project profile field.",
        "Return markdown only. Do not wrap in code fences.",
        "Use only the provided reference context. Do not invent facts.",
        "Prefer concise headings and bullet points when helpful.",
        "",
        `Target field: ${input.targetField}`,
        `Field guidance: ${guidance}`,
        prompt.length > 0 ? `Additional instructions: ${prompt}` : "",
        "",
        "Current field content:",
        input.currentContent?.trim() || "(empty)",
        "",
        "Reference context:",
        referenceFields.length > 0
            ? formatReferenceFields(referenceFields)
            : "No non-empty reference context provided.",
    ]
        .filter((line) => line.length > 0)
        .join("\n");
};

const buildFallbackContent = (input: GenerateProjectMarkdownInput) => {
    const referenceFields = sanitizeReferenceFields(input.referenceFields);
    const promptLine = (input.prompt ?? "").trim();
    const referenceSummary = referenceFields
        .slice(0, 6)
        .map((field) => `- ${field.label}: ${field.value.slice(0, 240)}`)
        .join("\n");

    return [
        `## ${input.targetField}`,
        "",
        input.currentContent?.trim() || "",
        promptLine ? `Additional instruction: ${promptLine}` : "",
        "",
        "Context highlights:",
        referenceSummary,
    ]
        .filter((line) => line.length > 0)
        .join("\n");
};

const normalizeRoleAllocationsByImportance = (
    roles: GeneratedProjectTeamRole[]
): GeneratedProjectTeamRole[] => {
    if (roles.length === 0) {
        return roles;
    }

    const normalizeSingleAllocation = (roleName: string, rawAllocation: number) => {
        const clamped = Math.max(25, Math.min(100, Number(rawAllocation) || 50));
        const loweredRoleName = roleName.toLowerCase();
        const mustBeFullTime = /tech lead|architect|owner/.test(loweredRoleName);

        if (mustBeFullTime) {
            return 100;
        }

        if (clamped >= 75) {
            return 100;
        }
        if (clamped >= 50) {
            return 50;
        }

        return 25;
    };

    return roles.map((role) => ({
        ...role,
        allocationPercent: normalizeSingleAllocation(role.role, role.allocationPercent),
    }));
};

const sanitizeGeneratedTeamRoles = (
    roles: unknown
): GeneratedProjectTeamRole[] => {
    if (!Array.isArray(roles)) {
        return [];
    }

    const sanitized = roles
        .map((role) => {
            if (!role || typeof role !== "object") {
                return null;
            }

            const candidate = role as {
                role?: unknown;
                headcount?: unknown;
                allocationPercent?: unknown;
            };

            const normalizedRole = String(candidate.role ?? "").trim();
            const headcount = Math.max(1, Number(candidate.headcount) || 1);
            const allocationPercent = Math.max(25, Math.min(100, Number(candidate.allocationPercent) || 50));

            if (normalizedRole.length === 0) {
                return null;
            }

            return {
                role: normalizedRole,
                headcount,
                allocationPercent,
            };
        })
        .filter((role): role is GeneratedProjectTeamRole => role !== null);

    return normalizeRoleAllocationsByImportance(sanitized);
};

const extractJsonArray = (content: string) => {
    const firstBracket = content.indexOf("[");
    const lastBracket = content.lastIndexOf("]");

    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
        return content;
    }

    return content.slice(firstBracket, lastBracket + 1);
};

const buildFallbackTeamRoles = (
    input: GenerateProjectTeamRolesInput
): GeneratedProjectTeamRole[] => {
    const normalizedCurrent = normalizeRoleAllocationsByImportance(
        (input.currentRoles ?? []).map((role) => ({
            role: role.role.trim(),
            headcount: Math.max(1, Number(role.headcount) || 1),
            allocationPercent: Math.max(25, Math.min(100, Number(role.allocationPercent) || 50)),
        }))
    ).filter((role) => role.role.length > 0);

    if (normalizedCurrent.length > 0) {
        return normalizedCurrent;
    }

    const context = sanitizeReferenceFields(input.referenceFields)
        .map((field) => `${field.label} ${field.value}`.toLowerCase())
        .join("\n");

    const template = [...DEFAULT_TEAM_ROLE_TEMPLATE];

    if (context.includes("data") || context.includes("etl") || context.includes("analytics")) {
        template.push({ role: "Data Engineer", headcount: 1, allocationPercent: 50 });
    }

    if (context.includes("security") || context.includes("compliance")) {
        template.push({ role: "Security Engineer", headcount: 1, allocationPercent: 50 });
    }

    if (context.includes("mobile") || context.includes("ios") || context.includes("android")) {
        template.push({ role: "Mobile Engineer", headcount: 1, allocationPercent: 50 });
    }

    return normalizeRoleAllocationsByImportance(template);
};

const buildGenerateTeamRolesPrompt = (input: GenerateProjectTeamRolesInput) => {
    const referenceFields = sanitizeReferenceFields(input.referenceFields);
    const prompt = (input.prompt ?? "").trim();
    const currentRoles = (input.currentRoles ?? [])
        .map((role) => `- ${role.role}: ${role.headcount} people, ${role.allocationPercent}%`)
        .join("\n");
    const providedSections = referenceFields.map((field) => `- ${field.label} (${field.key})`).join("\n");

    return [
        "Generate required project team roles and allocation percentages.",
        "Return valid JSON only with this shape:",
        '[{"role":"string","headcount":1,"allocationPercent":40}]',
        "You must consider every provided context section before producing output.",
        "If context is ambiguous, choose practical defaults and keep output concise.",
        "Constraints:",
        "- Include 3 to 8 roles unless context strongly suggests otherwise.",
		"- allocationPercent must be between 25 and 100.",
		"- Use 100 for always-required critical roles.",
		"- Use 50 for partially required execution/support roles.",
		"- Use 25 for optional or advisory roles.",
        "- headcount must be integer >= 1.",
        "- Use only roles justified by the reference context.",
        prompt.length > 0 ? `Additional instructions: ${prompt}` : "",
        "",
        "Provided context sections:",
        providedSections.length > 0 ? providedSections : "(none)",
        "",
        "Current roles:",
        currentRoles.length > 0 ? currentRoles : "(none)",
        "",
        "Reference context:",
        referenceFields.length > 0
            ? formatReferenceFields(referenceFields)
            : "No non-empty reference context provided.",
    ]
        .filter((line) => line.length > 0)
        .join("\n");
};

export async function generateProjectMarkdownWithAI(
    input: GenerateProjectMarkdownInput
): Promise<string> {
    const apiKey = env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        return buildFallbackContent(input);
    }

    try {
        return await withResponseCache({
            service: "project-markdown-generation",
            input: {
                ...input,
                referenceFields: sanitizeReferenceFields(input.referenceFields),
                model: env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash",
            },
            ttlSeconds: AI_GENERATION_CONFIG.CACHE_TTL_SECONDS.PROJECT_MARKDOWN,
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
                                        "You are a senior solution architect and delivery strategist.",
                                        "Write practical project profile content.",
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
                            maxOutputTokens: AI_GENERATION_CONFIG.MAX_OUTPUT_TOKENS.PROJECT_MARKDOWN,
                        },
                    }),
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(
                        `Project markdown generation failed: ${response.status} ${errorBody}`
                    );
                }

                const data = (await response.json()) as {
                    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };

                const generatedContent = data.candidates?.[0]?.content?.parts
                    ?.map((part) => part.text ?? "")
                    .join("\n")
                    .trim();

                if (!generatedContent) {
                    throw new Error("Project markdown generation returned an empty response.");
                }

                return generatedContent;
            },
        });
    } catch {
        return buildFallbackContent(input);
    }
}

export async function generateProjectTeamRolesWithAI(
    input: GenerateProjectTeamRolesInput
): Promise<GeneratedProjectTeamRole[]> {
    const fallback = buildFallbackTeamRoles(input);

    const apiKey = env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        return fallback;
    }

    try {
        return await withResponseCache({
            service: "project-team-roles-generation",
            input: {
                ...input,
                referenceFields: sanitizeReferenceFields(input.referenceFields),
                model: env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash",
            },
            ttlSeconds: AI_GENERATION_CONFIG.CACHE_TTL_SECONDS.PROJECT_MARKDOWN,
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
                                        "You are a senior engineering manager staffing software projects.",
                                        "Return only valid JSON array with role, headcount, allocationPercent.",
                                        "No markdown, prose, or code fences.",
                                    ].join("\n"),
                                },
                            ],
                        },
                        contents: [
                            {
                                role: "user",
                                parts: [{ text: buildGenerateTeamRolesPrompt(input) }],
                            },
                        ],
                        generationConfig: {
                            temperature: AI_GENERATION_CONFIG.TEMPERATURE.BALANCED,
                            topP: AI_GENERATION_CONFIG.TOP_P.BALANCED,
                            maxOutputTokens: 1200,
                        },
                    }),
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(
                        `Project team role generation failed: ${response.status} ${errorBody}`
                    );
                }

                const data = (await response.json()) as {
                    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };

                const generatedContent = data.candidates?.[0]?.content?.parts
                    ?.map((part) => part.text ?? "")
                    .join("\n")
                    .trim();

                if (!generatedContent) {
                    return fallback;
                }

                const parsed = JSON.parse(extractJsonArray(generatedContent));
                const sanitized = sanitizeGeneratedTeamRoles(parsed);
                return sanitized.length > 0 ? sanitized : fallback;
            },
        });
    } catch {
        return fallback;
    }
}
