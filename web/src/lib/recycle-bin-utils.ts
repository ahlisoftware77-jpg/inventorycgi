'use client';

import { 
  Firestore, 
  doc, 
  getDoc, 
  collection, 
  serverTimestamp,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';

/**
 * Utility to move a document to the recycle bin and log the action.
 */
export type RecyclableCollection = 
  | 'assets' 
  | 'inventory' 
  | 'inventory_requests'
  | 'maintenance_schedules' 
  | 'helpdesk_tickets' 
  | 'it_problem_reports'
  | 'it_assets';

/**
 * Utility to move a document to the recycle bin and log the action.
 */
export async function recycleDocument(
  db: Firestore,
  collectionName: RecyclableCollection,
  docId: string,
  userId: string,
  userName?: string,
  userDept?: string
) {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Document does not exist');
  }

  const data = docSnap.data();
  let label = '';
  let logType: 'ASSET' | 'INVENTORY' | 'HELPDESK' | 'MAINTENANCE' = 'ASSET';

  switch (collectionName) {
    case 'assets':
      label = `Aset: ${data.code || ''} (${data.name || ''})`;
      logType = 'ASSET';
      break;
    case 'inventory':
      label = `Inventaris: ${data.code || ''} (${data.name || ''})`;
      logType = 'INVENTORY';
      break;
    case 'inventory_requests':
      label = `Permintaan Inventaris: ${data.inventoryCode || ''} (${data.inventoryName || ''})`;
      logType = 'INVENTORY';
      break;
    case 'maintenance_schedules':
      label = `Jadwal Maintenance: ${data.code || ''} (${data.assetName || ''})`;
      logType = 'MAINTENANCE';
      break;
    case 'helpdesk_tickets':
      label = `Tiket: ${data.ticketNumber || ''} (${data.description?.substring(0, 30) || ''}...)`;
      logType = 'HELPDESK';
      break;
    case 'it_problem_reports':
      label = `Laporan IT: ${data.problem?.substring(0, 30) || ''}... (${data.department || ''})`;
      logType = 'HELPDESK';
      break;
    case 'it_assets':
      label = `Detail IT: ${data.assetCode || ''} (${data.computerName || ''})`;
      logType = 'ASSET';
      break;
  }

  const recycleRef = doc(collection(db, 'recycle_bin'));
  const logRef = doc(collection(db, 'system_logs'));
  const batch = writeBatch(db);

  // 1. Move to Recycle Bin
  batch.set(recycleRef, {
    originalCollection: collectionName,
    originalId: docId,
    data: data,
    deletedAt: serverTimestamp(),
    deletedBy: userId,
    deletedByName: userName || 'Admin',
    label: label
  });

  // 2. Record in System Logs
  batch.set(logRef, {
    type: logType,
    action: 'DELETE_RECYCLE',
    description: `Memindahkan ${label} ke Tempat Sampah`,
    targetId: docId,
    targetCode: data.code || data.ticketNumber || data.inventoryCode || '',
    targetName: data.name || data.problem || data.inventoryName || data.assetName || '',
    userId: userId,
    userName: userName || 'Admin',
    userDept: userDept || 'N/A',
    timestamp: serverTimestamp(),
  });

  // 3. Remove original
  batch.delete(docRef);

  return batch.commit();
}

/**
 * Utility to restore a document from the recycle bin and log it.
 */
export async function restoreDocument(db: Firestore, recycledItemId: string, userId: string, userName?: string, userDept?: string) {
  const recycleRef = doc(db, 'recycle_bin', recycledItemId);
  const recycleSnap = await getDoc(recycleRef);

  if (!recycleSnap.exists()) {
    throw new Error('Recycled item does not exist');
  }

  const recycled = recycleSnap.data();
  const originalRef = doc(db, recycled.originalCollection, recycled.originalId);

  const batch = writeBatch(db);
  
  // Restore data
  batch.set(originalRef, {
    ...recycled.data,
    restoredAt: serverTimestamp(),
  });

  // Log restoration
  let logType: 'ASSET' | 'INVENTORY' | 'HELPDESK' | 'MAINTENANCE' = 'ASSET';
  if (recycled.originalCollection === 'inventory' || recycled.originalCollection === 'inventory_requests') logType = 'INVENTORY';
  if (recycled.originalCollection === 'helpdesk_tickets' || recycled.originalCollection === 'it_problem_reports') logType = 'HELPDESK';
  if (recycled.originalCollection === 'maintenance_schedules') logType = 'MAINTENANCE';

  const logRef = doc(collection(db, 'system_logs'));
  batch.set(logRef, {
    type: logType,
    action: 'RESTORE',
    description: `Memulihkan data: ${recycled.label}`,
    targetId: recycled.originalId,
    userId: userId,
    userName: userName || 'Admin',
    userDept: userDept || 'N/A',
    timestamp: serverTimestamp(),
  });

  batch.delete(recycleRef);

  return batch.commit();
}

/**
 * Permanently delete an item from the recycle bin and log it.
 */
export async function permanentDelete(db: Firestore, recycledItemId: string, userId: string, userName?: string, userDept?: string) {
  const recycleRef = doc(db, 'recycle_bin', recycledItemId);
  const recycleSnap = await getDoc(recycleRef);
  
  if (recycleSnap.exists()) {
    const recycled = recycleSnap.data();
    const batch = writeBatch(db);
    
    // Log permanent deletion
    const logRef = doc(collection(db, 'system_logs'));
    batch.set(logRef, {
      type: 'USER', // System management action
      action: 'PURGE',
      description: `MENGHAPUS PERMANEN: ${recycled.label}`,
      userId: userId,
      userName: userName || 'Admin',
      userDept: userDept || 'N/A',
      timestamp: serverTimestamp(),
    });
    
    batch.delete(recycleRef);
    return batch.commit();
  }
  
  return deleteDoc(recycleRef);
}
