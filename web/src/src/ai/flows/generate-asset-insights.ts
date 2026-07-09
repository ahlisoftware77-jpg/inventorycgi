'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating insights about the status of company assets.
 *
 * It includes:
 * - `generateAssetInsights`: An asynchronous function that orchestrates the generation of asset insights.
 * - `GenerateAssetInsightsInput`: The input type for the `generateAssetInsights` function, which is currently empty.
 * - `GenerateAssetInsightsOutput`: The output type for the `generateAssetInsights` function, defining the structure of the generated insights.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAssetInsightsInputSchema = z.object({});
export type GenerateAssetInsightsInput = z.infer<typeof GenerateAssetInsightsInputSchema>;

const GenerateAssetInsightsOutputSchema = z.object({
  insights: z.string().describe('Insights about the overall status and utilization of company assets.'),
});
export type GenerateAssetInsightsOutput = z.infer<typeof GenerateAssetInsightsOutputSchema>;

export async function generateAssetInsights(input: GenerateAssetInsightsInput): Promise<GenerateAssetInsightsOutput> {
  return generateAssetInsightsFlow(input);
}

const generateAssetInsightsPrompt = ai.definePrompt({
  name: 'generateAssetInsightsPrompt',
  input: {schema: GenerateAssetInsightsInputSchema},
  output: {schema: GenerateAssetInsightsOutputSchema},
  prompt: `You are an AI assistant providing insights about company assets.

  Based on the following information about the company's assets, generate insights about their overall status, utilization, and potential issues. Focus on summarizing common damages, highlighting underutilized assets, and suggesting improvements for asset management.
  `, // The actual asset information will be passed in here dynamically via tool use in the future, for example: {{{assetInformation}}}.
});

const generateAssetInsightsFlow = ai.defineFlow(
  {
    name: 'generateAssetInsightsFlow',
    inputSchema: GenerateAssetInsightsInputSchema,
    outputSchema: GenerateAssetInsightsOutputSchema,
  },
  async input => {
    const {output} = await generateAssetInsightsPrompt(input);
    return output!;
  }
);
