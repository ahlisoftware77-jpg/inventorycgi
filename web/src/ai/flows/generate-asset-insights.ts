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

const GenerateAssetInsightsInputSchema = z.object({
  assetsData: z.string().optional(),
  maintenanceData: z.string().optional(),
  logsData: z.string().optional(),
});
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
  prompt: `Anda adalah analis AI manajemen aset profesional untuk PT. China Glaze Indonesia.
  Berikut adalah data aset perusahaan, data riwayat pemeliharaan (maintenance), dan log aktivitas sistem:

  --- DATA ASET ---
  {{assetsData}}

  --- DATA MAINTENANCE ---
  {{maintenanceData}}

  --- LOG RIWAYAT & AKTIVITAS SISTEM ---
  {{logsData}}

  Berdasarkan data di atas, buatlah LAPORAN RINGKASAN EKSEKUTIF (SUMMARY REPORT) yang profesional dalam format Markdown. Laporan harus mencakup:
  1. **Analisis Statistik Aset**: Total aset aktif, sebaran per departemen, dan sebaran kondisi aset (misalnya berapa persen yang baik, perlu perbaikan, rusak). Tampilkan dalam format tabel atau daftar terperinci yang mudah dibaca.
  2. **Kesehatan & Kesiapan Operasional**: Ringkasan status pemeliharaan (Dijadwalkan, Diproses, Selesai, Ditunda) dan tren kerusakan/masalah yang sering muncul berdasarkan riwayat pemeliharaan.
  3. **Analisis Riwayat & Mutasi**: Ulasan singkat mengenai perubahan terbaru dalam log sistem (misal: mutasi aset antar unit, penghapusan, atau penambahan aset baru).
  4. **Temuan & Rekomendasi Strategis**: Deteksi dini jika ada aset yang kritis, bermasalah, atau sudah melewati masa pakai, serta saran perbaikan manajemen aset agar lebih efisien dan memperpanjang usia pakai aset.

  Gunakan Bahasa Indonesia yang formal, taktis, analitis, dan mudah dipahami oleh manajemen puncak. Format laporan dengan Markdown yang indah (gunakan tabel, poin-poin, dan teks tebal jika perlu agar mudah dibaca).
  `,
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
