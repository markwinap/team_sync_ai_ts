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
