'use server';
/**
 * @fileOverview An AI assistant flow for drafting help requests.
 *
 * - draftHelpRequest - A function that leverages AI to improve and suggest details for a help request.
 * - DraftHelpRequestInput - The input type for the draftHelpRequest function.
 * - DraftHelpRequestOutput - The return type for the draftHelpRequest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DraftHelpRequestInputSchema = z.object({
  initialTitle: z.string().describe('The initial title provided by the user for the help request.'),
  initialDescription: z
    .string()
    .describe('The initial detailed description provided by the user for the help request.'),
});
export type DraftHelpRequestInput = z.infer<typeof DraftHelpRequestInputSchema>;

const DraftHelpRequestOutputSchema = z.object({
  improvedTitle: z
    .string()
    .describe('An improved, clearer, and more effective title for the help request.'),
  improvedDescription: z
    .string()
    .describe(
      'An expanded, more comprehensive, and detailed description for the help request, adding context or rephrasing for clarity.'
    ),
  suggestedCategory: z
    .enum(['blood', 'tutor', 'repair', 'emergency', 'other'])
    .describe('A suggested category for the help request based on its content.'),
  suggestedUrgency: z
    .enum(['critical', 'medium', 'normal'])
    .describe(
      'A suggested urgency level for the help request (critical, medium, or normal) based on its content.'
    ),
});
export type DraftHelpRequestOutput = z.infer<typeof DraftHelpRequestOutputSchema>;

export async function draftHelpRequest(input: DraftHelpRequestInput): Promise<DraftHelpRequestOutput> {
  return draftHelpRequestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'draftHelpRequestPrompt',
  input: {schema: DraftHelpRequestInputSchema},
  output: {schema: DraftHelpRequestOutputSchema},
  prompt: `You are an AI assistant specialized in refining help requests for a hyperlocal emergency and skill exchange platform.
Your goal is to transform a user's initial input into a clear, comprehensive, and effective request that attracts the right help faster.

Analyze the provided initial title and description. Suggest improvements, add relevant details, or rephrase the input to enhance clarity and effectiveness.
Additionally, infer the most appropriate category and urgency level from the given information.

Initial Title: {{{initialTitle}}}
Initial Description: {{{initialDescription}}}`,
});

const draftHelpRequestFlow = ai.defineFlow(
  {
    name: 'draftHelpRequestFlow',
    inputSchema: DraftHelpRequestInputSchema,
    outputSchema: DraftHelpRequestOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
