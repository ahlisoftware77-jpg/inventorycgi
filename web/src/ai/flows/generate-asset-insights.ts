'use server';

/**
 * @fileOverview File ini mendefinisikan aliran Genkit untuk menghasilkan wawasan tentang status aset perusahaan.
 *
 * Termasuk:
 * - `generateAssetInsights`: Fungsi asinkron yang mengatur pembuatan wawasan aset.
 * - `GenerateAssetInsightsInput`: Tipe input untuk fungsi `generateAssetInsights`.
 * - `GenerateAssetInsightsOutput`: Tipe output untuk fungsi `generateAssetInsights`.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAssetInsightsInputSchema = z.object({});
export type GenerateAssetInsightsInput = z.infer<typeof GenerateAssetInsightsInputSchema>;

const GenerateAssetInsightsOutputSchema = z.object({
  insights: z.string().describe('Wawasan tentang status keseluruhan dan pemanfaatan aset perusahaan.'),
});
export type GenerateAssetInsightsOutput = z.infer<typeof GenerateAssetInsightsOutputSchema>;

export async function generateAssetInsights(input: GenerateAssetInsightsInput): Promise<GenerateAssetInsightsOutput> {
  return generateAssetInsightsFlow(input);
}

const generateAssetInsightsPrompt = ai.definePrompt({
  name: 'generateAssetInsightsPrompt',
  input: {schema: GenerateAssetInsightsInputSchema},
  output: {schema: GenerateAssetInsightsOutputSchema},
  prompt: `Anda adalah asisten AI profesional yang memberikan wawasan strategis tentang manajemen aset perusahaan PT. China Glaze Indonesia.

  Berdasarkan data aset yang tersedia, hasilkan wawasan mendalam tentang status keseluruhan, pemanfaatan, dan potensi masalah. Fokuslah pada merangkum tren kerusakan, menyoroti aset yang perlu perhatian khusus, dan menyarankan langkah perbaikan manajemen aset.
  
  Berikan jawaban dalam Bahasa Indonesia yang formal, ringkas, dan mudah dimengerti oleh pihak manajemen.
  `, // Data aset akan diteruskan secara dinamis di sini di masa mendatang, misalnya: {{{assetInformation}}}.
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
