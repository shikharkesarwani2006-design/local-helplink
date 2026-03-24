'use server';
/**
 * @fileOverview A flow for generating a concise AI-driven summary using direct Gemini REST API.
 */

import { z } from 'zod';

const SummarizeHelpRequestOutputSchema = z.object({
  summary: z.string().describe('A concise AI-generated summary.'),
});

export type SummarizeHelpRequestInput = {
  description: string;
};

export type SummarizeHelpRequestOutput = z.infer<typeof SummarizeHelpRequestOutputSchema>;

export async function summarizeHelpRequest(input: SummarizeHelpRequestInput): Promise<SummarizeHelpRequestOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_GENAI_API_KEY');

  const prompt = `As an AI assistant, your task is to provide a very concise summary (max 30 words) of the following help request description. Focus on the core need. Return ONLY valid JSON with the field "summary".

Description: ${input.description}`;

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

  if (!response.ok) throw new Error('Gemini API error');
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');

  const cleaned = text.replace(/```json|```/g, '').trim();
  return SummarizeHelpRequestOutputSchema.parse(JSON.parse(cleaned));
}
