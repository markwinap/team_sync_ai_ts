import { env } from "~/env";

type GeminiRequestParams = {
	systemInstruction: string;
	userPrompt: string;
	temperature: number;
	topP: number;
	maxOutputTokens: number;
};

type GeminiResponseData = {
	candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export const getGeminiApiKey = () => env.GOOGLE_GEMINI_API_KEY;

export const getGeminiModel = () =>
	env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash";

export async function callGemini(
	params: GeminiRequestParams,
): Promise<string | null> {
	const apiKey = getGeminiApiKey();

	if (!apiKey) {
		return null;
	}

	const model = getGeminiModel();
	const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

	const response = await fetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			systemInstruction: {
				parts: [{ text: params.systemInstruction }],
			},
			contents: [
				{
					role: "user",
					parts: [{ text: params.userPrompt }],
				},
			],
			generationConfig: {
				temperature: params.temperature,
				topP: params.topP,
				maxOutputTokens: params.maxOutputTokens,
			},
		}),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(
			`Gemini API request failed: ${response.status} ${errorBody}`,
		);
	}

	const data = (await response.json()) as GeminiResponseData;

	return (
		data.candidates?.[0]?.content?.parts
			?.map((part) => part.text ?? "")
			.join("\n")
			.trim() || null
	);
}
