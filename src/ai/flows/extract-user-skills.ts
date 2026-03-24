'use server';
/**
 * @fileOverview A flow for extracting skills using direct Gemini REST API.
 */

import { z } from 'zod';

const ExtractUserSkillsOutputSchema = z.object({
  skills: z.array(z.string()).describe('An array of extracted skills.'),
});

export type ExtractUserSkillsInput = {
  resumeDataUri?: string;
  description?: string;
};

export type ExtractUserSkillsOutput = z.infer<typeof ExtractUserSkillsOutputSchema>;

export async function extractUserSkills(
  input: ExtractUserSkillsInput
): Promise<ExtractUserSkillsOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_GENAI_API_KEY');

  let prompt = `You are an expert at extracting technical and soft skills from user descriptions. Identify and list all relevant skills. Do not invent skills. Return ONLY valid JSON with an array of strings in the field "skills".\n\n`;
  
  if (input.description) prompt += `Description: ${input.description}\n`;
  
  const contents: any[] = [{ parts: [{ text: prompt }] }];

  if (input.resumeDataUri) {
    const [header, data] = input.resumeDataUri.split(',');
    const mimeType = header.split(':')[1].split(';')[0];
    contents[0].parts.push({
      inline_data: {
        mime_type: mimeType,
        data: data
      }
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );

  if (!response.ok) throw new Error('Gemini API error');
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');

  const cleaned = text.replace(/```json|```/g, '').trim();
  return ExtractUserSkillsOutputSchema.parse(JSON.parse(cleaned));
}
