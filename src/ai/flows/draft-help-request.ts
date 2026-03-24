'use server';
/**
 * @fileOverview An AI assistant flow for drafting help requests using direct Gemini REST API.
 */

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
  if (!apiKey) throw new Error('Missing GOOGLE_GENAI_API_KEY');

  const prompt = `You are an AI assistant for a hyperlocal community help platform.
Given the title and description below, return ONLY a valid JSON object with these fields:
- improvedTitle: string
- improvedDescription: string  
- suggestedCategory: one of: blood, tutor, repair, emergency, other
- suggestedUrgency: one of: high, medium, low

Title: ${input.initialTitle}
Description: ${input.initialDescription}

Return only raw JSON. No markdown, no backticks.`;

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
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');

  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return DraftHelpRequestOutputSchema.parse(JSON.parse(cleaned));
  } catch (e) {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Invalid AI response format');
  }
}
