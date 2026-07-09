
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export interface User extends FirebaseUser {
  role?: 'Admin' | 'Manager' | 'Section Head' | 'Karyawan' | 'User' | 'Pending';
  department?: string;
}

export type AssetStatus = 'Aktif' | 'Dipinjam' | 'Rusak' | 'Dihapus' | 'Dipindah-Aktif' | 'Perlu Perbaikan' | 'Sedang Dalam Perbaikan' | 'waiting_mutasi' | 'waiting_disposal' | 'karyawan_approved' | 'approved_mutasi' | 'approved_disposal' | 'waiting_edit' | 'approved_edit' | 'waiting_creation' | 'Aktif_creation';
export type AssetCondition = 'Baru' | 'Baik' | 'Perlu Perbaikan' | 'Sedang Dalam Perbaikan' | 'Rusak' | 'Tidak Terpakai' | 'Upgrade' | 'Sold';

export interface Asset {
  id: string;
  code: string;
  name: string;
  costCenter?: string;
  category: string;
  location: string;
  purchaseDate: Timestamp | null;
  price: number;
  priceUSD?: number;
  qty: number;
  condition: AssetCondition;
  status: AssetStatus;
  notes?: string;
  photoURL?: string;
  photoURL2?: string;
  photoURL3?: string;
  photoURL4?: string;
  disposalPhotoURL1?: string;
  disposalPhotoURL2?: string;
  disposalPhotoURL3?: string;
  disposalPhotoURL4?: string;
  brand?: string;
  user?: string;
  supplier?: string;
  prNumber?: string;
  inspectionNumber?: string;
  projectInspectionNumber?: string;
  projectInspectionDate?: Timestamp;
  mutationDate?: Timestamp;
  disposalDate?: Timestamp;
  midSemesterCheckDate?: Timestamp;
  endSemesterCheckDate?: Timestamp;
  assetLifetime?: number; // dalam tahun
  accessory1?: string;
  accessory2?: string;
  accessory3?: string;
  accessory4?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  borrowingHistory: {
    user: string;
    borrowDate: Timestamp;
    returnDate?: Timestamp;
  }[];
  requestedBy?: string;
  approvedBy?: string;
  karyawanApproverId?: string;
  requestedAt?: Timestamp;
  approvedAt?: Timestamp;
  mutationTargetDepartment?: string;
  transactionCode?: string;
  accountingUpdatedBy?: string;
  accountingUpdatedAt?: Timestamp;
}

export interface Software {
    id: string;
    name: string;
    licenseKey?: string;
    purchaseDate?: Timestamp;
    expiryDate?: Timestamp;
    notes?: string;
}

export interface MaintenanceHistory {
    id: string;
    date: Timestamp;
    type: 'Perbaikan' | 'Penggantian' | 'Pembaruan' | 'Lainnya';
    description: string;
    technician: string;
    notes?: string;
}

export interface ComputerAsset {
    id: string;
    computerName: string;
    assetCode: string;
    department: string;
    currentUser: string;
    brandModel: string;
    mainboard?: string;
    cpu: string;
    ram: string;
    storage: string;
    storage2?: string;
    gpu: string;
    serialNumber: string;
    ipAddress?: string;
    macAddress?: string;
    os: string;
    windowsLicense?: string;
    officeLicense?: string;
    antivirus?: string;
    purchaseDate?: Timestamp;
    supplier?: string;
    notes?: string;
    condition: 'Aktif' | 'Perlu Perbaikan' | 'Rusak';
    status: 'Digunakan' | 'Dalam Service' | 'Dihapus';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type TicketCategory = 'Hardware' | 'Software' | 'Jaringan' | 'Lainnya';
export type TicketStatus = 'Menunggu' | 'Diproses' | 'Selesai';
export type TicketPriority = 'Rendah' | 'Normal' | 'Tinggi' | 'Kritis';

export interface HelpdeskTicket {
  id: string;
  ticketNumber: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
  photoURL?: string;
  status: TicketStatus;
  reportedBy: string; // User UID
  reportedAt: Timestamp;
  reporterName?: string; // Denormalized for display
  reporterDept?: string; // Denormalized for display
  updates?: {
    note: string;
    attachmentURL?: string;
    updatedBy: string; // Admin UID
    updatedAt: Timestamp;
    updaterName?: string; // Denormalized
  }[];
}

// This is the type for the form, which uses a Date object for the date picker
export type AssetFormValues = Omit<Asset, 'id' | 'purchaseDate' | 'projectInspectionDate' | 'midSemesterCheckDate' | 'endSemesterCheckDate' | 'borrowingHistory' | 'photoURL' | 'photoURL2' | 'photoURL3' | 'photoURL4' | 'disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4' | 'updatedAt' | 'createdAt' | 'requestedAt' | 'approvedAt' | 'mutationDate' | 'disposalDate' | 'mutationTargetDepartment' | 'accountingUpdatedBy' | 'accountingUpdatedAt'> & {
  purchaseDate: Date | null;
  projectInspectionDate?: Date | null;
  mutationDate?: Date | null;
  disposalDate?: Date | null;
  midSemesterCheckDate?: Date | null;
  endSemesterCheckDate?: Date | null;
  photoURL?: string;
  photoURL2?: string;
  photoURL3?: string;
  photoURL4?: string;
  disposalPhotoURL1?: string;
  disposalPhotoURL2?: string;
  disposalPhotoURL3?: string;
  disposalPhotoURL4?: string;
  requestedAt?: Date | null;
  approvedAt?: Date | null;
};

// Types for ATK & Sparepart Inventory
export type InventoryType = 'ATK' | 'Sparepart' | 'Alat Kebersihan';

export interface InventoryItem {
  id: string;
  type: InventoryType;
  code: string;
  name: string;
  category: string;
  unit: string; // e.g., pcs, box, roll
  stock: number;
  location: string;
  department: string;
  notes?: string;
  photoURL?: string;
  lastUpdated: Timestamp;
}

export type InventoryFormValues = Omit<InventoryItem, 'id' | 'lastUpdated'>;

export type InventoryRequestStatus = 'Menunggu Persetujuan HRGA' | 'Disetujui' | 'Ditolak' | 'Selesai';

export interface InventoryRequest {
  id: string;
  inventoryId: string;
  inventoryCode: string;
  inventoryName: string;
  quantity: number;
  requestingUserId: string;
  requestingUserName: string;
  requestingDept: string;
  status: InventoryRequestStatus;
  requestedAt: Timestamp;
  processedByUserId?: string; // HR/GA user
  processedByUserName?: string;
  processedAt?: Timestamp;
  rejectionReason?: string;
}

export interface InventoryTransaction {
    id: string;
    inventoryId: string;
    inventoryCode: string;
    inventoryName: string;
    action: 'in' | 'out'; // 'in' for stock increase, 'out' for decrease
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    notes: string;
    userId: string; // UID of the user who performed the action
    userName: string; // Name of the user
    createdAt: Timestamp;
  }

// Types for Compare Excel page
export interface DataAset {
  id: string;
  kode_aset: string;
  nama_aset: string;
  harga: number;
  kategori: string;
  lokasi: string;
}

export interface DataFixAssetAccounting {
  id: string;
  kode_aset: string;
  nama_aset: string;
  jumlah?: number;
  harga: number;
  tanggal_perolehan: Timestamp;
  penyusutan: number;
}
