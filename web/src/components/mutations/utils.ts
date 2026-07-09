'use client';
import { type AssetStatus } from '@/lib/types';
import { type EnrichedAsset } from './mutation-table';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const getStatusClass = (status: AssetStatus): { className: string, text: string } => {
    const text = status.replace(/_/g, ' ');
    switch (status) {
        case 'waiting_mutasi':
            return { className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', text };
        case 'waiting_disposal':
            return { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', text };
        case 'waiting_edit':
            return { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text };
        case 'waiting_creation':
            return { className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', text: 'Menunggu Dibuat' };
        case 'karyawan_approved':
            return { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', text: 'Disetujui Dept' };
        case 'approved_mutasi':
        case 'approved_edit':
        case 'Aktif_creation':
            return { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text };
        case 'approved_disposal':
             return { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text };
        case 'Aktif': // Rejected request
            return { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Ditolak' };
        case 'Other':
        case 'Bukan_Asset_Perusahaan':
            return { className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', text };
        default:
            return { className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', text };
    }
}

export const getPreviousLocation = (notes: string | undefined): string | null => {
    if (!notes) return null;
    // Look for the most reliable pattern first (from approval note)
    const approvalMatch = notes.match(/Mutasi \d+ unit dari: (.*?) ke/);
    if (approvalMatch && approvalMatch[1]) {
      return approvalMatch[1].trim();
    }
    // Fallback to the request note
    const requestMatch = notes.match(/Lokasi Sebelumnya: (.*?)\n/);
    if (requestMatch && requestMatch[1]) {
      return requestMatch[1].trim();
    }
    return null;
};

export const getMutationQuantityDisplay = (asset: EnrichedAsset): string => {
    const notes = asset.notes || '';
    const mutationQtyMatch = notes.match(/Jumlah: (\d+)/);
    if (mutationQtyMatch) {
        const mutatedQty = parseInt(mutationQtyMatch[1], 10);
        return `${mutatedQty}`;
    }

    const disposalQtyMatch = notes.match(/Diajukan untuk disposal sebanyak (\d+) unit/);
    if (disposalQtyMatch) {
         const disposedQty = parseInt(disposalQtyMatch[1], 10);
         return `${disposedQty}`;
    }

    const approvedDisposalMatch = notes.match(/Disposal (\d+) unit disetujui/);
    if(approvedDisposalMatch) {
        return approvedDisposalMatch[1];
    }
    
    const approvedMutationMatch = notes.match(/Mutasi (\d+) unit dari/);
    if(approvedMutationMatch) {
        return approvedMutationMatch[1];
    }

    return asset.qty.toString();
};


export const generateTransactionCode = async (type: 'MUT' | 'DIS' | 'EDT' | 'CRT', location?: string): Promise<string> => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const locationPrefix = location ? `${location}-` : '';
    const prefix = `${locationPrefix}${type}-${year}${month}${day}-`;

    const assetsRef = collection(db, 'assets');
    // We query based on the full prefix to ensure uniqueness per location and type
    const q = query(assetsRef, where('transactionCode', '>=', prefix), where('transactionCode', '<', prefix + 'z'));
    const querySnapshot = await getDocs(q);

    const sequence = querySnapshot.size + 1;
    return `${prefix}${sequence.toString().padStart(3, '0')}`;
};
