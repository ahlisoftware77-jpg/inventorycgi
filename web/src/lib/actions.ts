'use server';

import { generateAssetInsights } from '@/ai/flows/generate-asset-insights';
import { z } from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const insightsSchema = z.object({});

async function initGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) return;
  try {
    const docRef = doc(db, 'settings', 'general');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.geminiApiKey) {
        process.env.GEMINI_API_KEY = data.geminiApiKey;
      }
    }
  } catch (error) {
    console.error("Failed to load Gemini API key from database:", error);
  }
}

export async function getAssetInsightsAction(prevState: any, formData: FormData) {
  try {
    await initGeminiApiKey();
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
