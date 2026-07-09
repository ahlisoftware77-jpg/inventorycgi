'use server';

import { generateAssetInsights } from '@/ai/flows/generate-asset-insights';
import { z } from 'zod';

const insightsSchema = z.object({});

export async function getAssetInsightsAction(prevState: any, formData: FormData) {
  try {
    const validatedData = insightsSchema.parse({});
    const result = await generateAssetInsights(validatedData);
    if (result.insights) {
      return { message: result.insights, error: null };
    }
    return { message: null, error: "Gagal menghasilkan insight. Silakan coba lagi." };
  } catch (e: any) {
    console.error(e);
    return { message: null, error: e.message || "Terjadi kesalahan yang tidak diketahui." };
  }
}
