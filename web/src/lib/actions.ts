'use server';

import { generateAssetInsights } from '@/ai/flows/generate-asset-insights';
import { z } from 'zod';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
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

    // 1. Fetch all assets
    const assetsSnapshot = await getDocs(collection(db, 'assets'));
    const assetsList = assetsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        code: data.code || '',
        name: data.name || '',
        category: data.category || '',
        status: data.status || '',
        condition: data.condition || '',
        location: data.location || '',
        user: data.user || '',
      };
    });

    // 2. Fetch maintenance schedules
    const maintSnapshot = await getDocs(collection(db, 'maintenance_schedules'));
    const maintList = maintSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        assetCode: data.assetCode || '',
        assetName: data.assetName || '',
        type: data.type || '',
        status: data.status || '',
        technician: data.technician || '',
        notes: data.notes || '',
        date: data.scheduledDate && typeof data.scheduledDate.toDate === 'function' 
          ? data.scheduledDate.toDate().toISOString().split('T')[0] 
          : '',
      };
    });

    // 3. Fetch system logs (limit to last 100)
    const logsQuery = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));
    const logsSnapshot = await getDocs(logsQuery);
    const logsList = logsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        type: data.type || '',
        action: data.action || '',
        description: data.description || '',
        targetCode: data.targetCode || '',
        userName: data.userName || '',
        date: data.timestamp && typeof data.timestamp.toDate === 'function'
          ? data.timestamp.toDate().toISOString().split('T')[0]
          : '',
      };
    });

    const result = await generateAssetInsights({
      assetsData: JSON.stringify(assetsList),
      maintenanceData: JSON.stringify(maintList),
      logsData: JSON.stringify(logsList),
    });

    if (result.insights) {
      return { message: result.insights, error: null };
    }
    return { message: null, error: "Gagal menghasilkan insight. Silakan coba lagi." };
  } catch (e: any) {
    console.error("Error in getAssetInsightsAction:", e);
    return { message: null, error: e.message || "Terjadi kesalahan yang tidak diketahui." };
  }
}
