'use server';
/**
 * @fileOverview A Genkit flow for generating a concise AI-driven summary of a help request.
 *
 * - summarizeHelpRequest - A function that summarizes a help request's description.
 * - SummarizeHelpRequestInput - The input type for the summarizeHelpRequest function.
 * - SummarizeHelpRequestOutput - The return type for the summarizeHelpRequest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeHelpRequestInputSchema = z.object({
  description: z.string().describe('The full description of the help request.'),
});
export type SummarizeHelpRequestInput = z.infer<typeof SummarizeHelpRequestInputSchema>;

const SummarizeHelpRequestOutputSchema = z.object({
  summary: z.string().describe('A concise AI-generated summary of the help request description.'),
});
export type SummarizeHelpRequestOutput = z.infer<typeof SummarizeHelpRequestOutputSchema>;

export async function summarizeHelpRequest(input: SummarizeHelpRequestInput): Promise<SummarizeHelpRequestOutput> {
  return summarizeHelpRequestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeHelpRequestPrompt',
  input: {schema: SummarizeHelpRequestInputSchema},
  output: {schema: SummarizeHelpRequestOutputSchema},
  prompt: `As an AI assistant, your task is to provide a very concise summary (max 30 words) of the following help request description. Focus on the core need.

Description: {{{description}}}

Concise Summary:`,
});

const summarizeHelpRequestFlow = ai.defineFlow(
  {
    name: 'summarizeHelpRequestFlow',
    inputSchema: SummarizeHelpRequestInputSchema,
    outputSchema: SummarizeHelpRequestOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
