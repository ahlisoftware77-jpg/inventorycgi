import { differenceInDays, addYears, differenceInMonths } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export interface DepreciationResult {
  acquisitionCost: number;
  accumulatedDepreciation: number;
  bookValue: number;
  depreciationPerMonth: number;
  monthsPassed: number;
  totalMonths: number;
  remainingMonths: number;
  percentRemaining: number;
  isManual?: boolean;
}

/**
 * Menghitung depresiasi aset menggunakan metode Garis Lurus (Straight Line)
 * atau persentase manual jika tersedia.
 */
export function calculateDepreciation(
  cost: number,
  purchaseDate: Timestamp | Date | null | undefined,
  lifetimeYears: number | undefined,
  manualPercent?: number
): DepreciationResult | null {
  if (!cost) return null;

  // Jika ada persentase manual dan lebih besar dari 0, gunakan itu.
  // Jika 0, maka dianggap menggunakan hitungan otomatis sistem.
  if (typeof manualPercent === 'number' && manualPercent > 0 && manualPercent <= 100) {
    const accumulatedDepreciation = cost * (manualPercent / 100);
    const bookValue = Math.max(0, cost - accumulatedDepreciation);
    
    return {
      acquisitionCost: cost,
      accumulatedDepreciation,
      bookValue,
      depreciationPerMonth: 0,
      monthsPassed: 0,
      totalMonths: 0,
      remainingMonths: 0,
      percentRemaining: 100 - manualPercent,
      isManual: true
    };
  }

  // Jika tidak ada data untuk kalkulasi otomatis, return null
  if (!purchaseDate || !lifetimeYears || lifetimeYears <= 0) {
    return null;
  }

  const startDate = purchaseDate instanceof Timestamp ? purchaseDate.toDate() : purchaseDate;
  const now = new Date();

  if (startDate > now) {
    return {
      acquisitionCost: cost,
      accumulatedDepreciation: 0,
      bookValue: cost,
      depreciationPerMonth: cost / (lifetimeYears * 12),
      monthsPassed: 0,
      totalMonths: lifetimeYears * 12,
      remainingMonths: lifetimeYears * 12,
      percentRemaining: 100,
      isManual: false
    };
  }

  const totalMonths = lifetimeYears * 12;
  const monthsPassed = Math.min(totalMonths, differenceInMonths(now, startDate));
  const depreciationPerMonth = cost / totalMonths;
  const accumulatedDepreciation = monthsPassed * depreciationPerMonth;
  const bookValue = Math.max(0, cost - accumulatedDepreciation);
  const remainingMonths = totalMonths - monthsPassed;
  const percentRemaining = (bookValue / cost) * 100;

  return {
    acquisitionCost: cost,
    accumulatedDepreciation,
    bookValue,
    depreciationPerMonth,
    monthsPassed,
    totalMonths,
    remainingMonths,
    percentRemaining,
    isManual: false
  };
}
