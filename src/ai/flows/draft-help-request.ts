'use server';

import { z } from 'zod';

const DraftHelpRequestOutputSchema = z.object({
  improvedTitle: z.string(),
  improvedDescription: z.string(),
  suggestedCategory: z.enum(['blood', 'tutor', 'repair', 'emergency', 'other']),
  suggestedUrgency: z.enum(['high', 'medium', 'low']),
});

export type DraftHelpRequestInput = {
  initialTitle: string;
  initialDescription: string;
};

export type DraftHelpRequestOutput = z.infer<typeof DraftHelpRequestOutputSchema>;

export async function draftHelpRequest(input: DraftHelpRequestInput): Promise<DraftHelpRequestOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error('AI configuration missing. Please set GOOGLE_GENAI_API_KEY.');

  const prompt = `You are an AI assistant for a hyperlocal community help platform.
Given the title and description below, return ONLY a valid JSON object with these exact fields:
- improvedTitle: string
- improvedDescription: string
- suggestedCategory: one of: blood, tutor, repair, emergency, other
- suggestedUrgency: one of: high, medium, low

Title: ${input.initialTitle}
Description: ${input.initialDescription}

Return only raw JSON. No markdown, no backticks.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const message = errorJson.error?.message || '';
      
      if (message.includes('leaked')) {
        throw new Error('The AI API key has been disabled for security reasons. Please update the GOOGLE_GENAI_API_KEY in your environment variables with a fresh key.');
      }
      
      throw new Error(message || `Gemini API error (Status: ${response.status})`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('AI failed to generate a response. Please try again.');

    const cleaned = text.replace(/```json|```/g, '').trim();
    return DraftHelpRequestOutputSchema.parse(JSON.parse(cleaned));
  } catch (e: any) {
    if (e instanceof Error) throw e;
    throw new Error('An unexpected error occurred while optimizing the request.');
  }
}
