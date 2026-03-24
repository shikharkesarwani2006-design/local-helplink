'use server';
/**
 * @fileOverview A Genkit flow for extracting skills from a resume (data URI) or a free-text description.
 *
 * - extractUserSkills - A function that handles the skill extraction process.
 * - ExtractUserSkillsInput - The input type for the extractUserSkills function.
 * - ExtractUserSkillsOutput - The return type for the extractUserSkills function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractUserSkillsInputSchema = z
  .object({
    resumeDataUri: z
      .string()
      .optional()
      .describe(
        "A resume, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
      ),
    description: z.string().optional().describe('A free-text description of experience.'),
  })
  .refine(data => data.resumeDataUri || data.description, {
    message: 'Either resumeDataUri or description must be provided.',
  });
export type ExtractUserSkillsInput = z.infer<typeof ExtractUserSkillsInputSchema>;

const ExtractUserSkillsOutputSchema = z.object({
  skills: z.array(z.string()).describe('An array of extracted skills.'),
});
export type ExtractUserSkillsOutput = z.infer<typeof ExtractUserSkillsOutputSchema>;

export async function extractUserSkills(
  input: ExtractUserSkillsInput
): Promise<ExtractUserSkillsOutput> {
  return extractUserSkillsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractUserSkillsPrompt',
  input: {schema: ExtractUserSkillsInputSchema},
  output: {schema: ExtractUserSkillsOutputSchema},
  prompt: `You are an expert at extracting technical and soft skills from user descriptions or resumes.

Given the following information, identify and list all relevant skills. Prioritize skills found in the resume if both are provided. Do not invent skills; only extract those explicitly mentioned or clearly implied.

Description: {{{description}}}
Resume: {{#if resumeDataUri}}{{media url=resumeDataUri}}{{else}}No resume provided.{{/if}}

Extract the skills as a JSON array of strings, for example: ["Skill 1", "Skill 2", "Skill 3"].`,
});

const extractUserSkillsFlow = ai.defineFlow(
  {
    name: 'extractUserSkillsFlow',
    inputSchema: ExtractUserSkillsInputSchema,
    outputSchema: ExtractUserSkillsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to extract skills.');
    }
    return output;
  }
);
