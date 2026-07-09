'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export interface UserPermissions {
  canAddAsset?: boolean;
  canEditAsset?: boolean;
  canDeleteAsset?: boolean;
  canRequestMutation?: boolean;
  canApproveMutation?: boolean;
  canManageInventory?: boolean;
  canDeleteInventory?: boolean;
  canManageIT?: boolean;
  canManageUsers?: boolean;
  canAccessSettings?: boolean;
  canManageMaintenanceEvidence?: boolean;
  canManageMaintenanceSignature?: boolean;
  canEditMaintenance?: boolean;
  canDeleteMaintenance?: boolean;
}

export interface User extends FirebaseUser {
  role?: 'Admin' | 'Manager' | 'Section Head' | 'Karyawan' | 'User' | 'Pending';
  department?: string;
  allowedPages?: string[]; // Array of hrefs or labels the user can access
  allowedDepartments?: string[]; // Array of department names the user can see data for
  permissions?: UserPermissions;
  name?: string;
}

export type AssetStatus = 'Aktif' | 'Dipinjam' | 'Rusak' | 'Dihapus' | 'Dipindah-Aktif' | 'Perlu Perbaikan' | 'Sedang Dalam Perbaikan' | 'waiting_mutasi' | 'waiting_disposal' | 'karyawan_approved' | 'approved_mutasi' | 'approved_disposal' | 'waiting_edit' | 'approved_edit' | 'waiting_creation' | 'Aktif_creation' | 'Other' | 'Bukan_Asset_Perusahaan';
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
  inspectionDate?: Timestamp | null;
  projectInspectionNumber?: string;
  projectInspectionDate?: Timestamp | null;
  mutationDate?: Timestamp;
  disposalDate?: Timestamp;
  midSemesterCheckDate?: Timestamp | null;
  endSemesterCheckDate?: Timestamp | null;
  assetLifetime?: number; // dalam tahun
  manualDepreciationPercent?: number; // Persentase penyusutan manual (0-100)
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
  location_from?: string; // For mutation history display
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

export interface UsedPart {
    inventoryId: string;
    code: string;
    name: string;
    quantity: number;
    unit: string;
    addedAt: Timestamp;
}

export interface MaintenanceSchedule {
    id: string;
    assetId: string;
    assetName: string;
    assetCode: string;
    assetUser?: string;
    department: string;
    scheduledDate: Timestamp;
    type: 'Pemeriksaan Rutin' | 'Pembersihan' | 'Update Software' | 'Lainnya';
    status: 'Dijadwalkan' | 'Diproses' | 'Selesai' | 'Ditunda';
    technician?: string;
    notes?: string;
    progressPhotoURL?: string;
    completionPhotoURL?: string;
    emailProofURL?: string; // URL to the uploaded .msg/.eml file
    emailProofName?: string; // Original filename
    ticketId?: string; // Linked Helpdesk Ticket ID
    ticketNumber?: string; // Linked Helpdesk Ticket Number
    partsUsed?: UsedPart[]; // New field for inventory parts replacement
    createdAt: Timestamp;
    updatedAt: Timestamp;
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

export type AssetFormValues = Omit<Asset, 'id' | 'purchaseDate' | 'inspectionDate' | 'projectInspectionDate' | 'midSemesterCheckDate' | 'endSemesterCheckDate' | 'borrowingHistory' | 'photoURL' | 'photoURL2' | 'photoURL3' | 'photoURL4' | 'disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4' | 'updatedAt' | 'createdAt' | 'requestedAt' | 'approvedAt' | 'mutationDate' | 'disposalDate' | 'mutationTargetDepartment' | 'accountingUpdatedBy' | 'accountingUpdatedAt'> & {
  purchaseDate: Date | null;
  inspectionDate?: Date | null;
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

export type InventoryType = 'ATK' | 'Sparepart' | 'Alat Kebersihan' | 'Obat-obatan';

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
  inventoryCategory?: string;
  quantity: number;
  requestingUserId: string;
  requestingUserName: string;
  requestingDept: string;
  status: InventoryRequestStatus;
  requestedAt: Timestamp;
  transactionDate?: Timestamp; // Added for report audit
  processedByUserId?: string; // HR/GA user
  processedByUserName?: string;
  processedAt?: Timestamp;
  rejectionReason?: string;
  approvalSignature?: string; // Base64 signature image
  maintenanceId?: string; // Added to link with maintenance schedule
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
    requesterName?: string; // Explicit field for report
    requesterDept?: string; // Explicit field for report
    transactionDate: Timestamp; // User specified date
    createdAt: Timestamp;
}

export interface SystemLog {
  id: string;
  type: 'ASSET' | 'INVENTORY' | 'USER' | 'MAINTENANCE' | 'HELPDESK';
  action: string;
  description: string;
  targetId?: string;
  targetCode?: string;
  targetName?: string;
  userId: string;
  userName: string;
  userDept: string;
  timestamp: Timestamp;
}

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

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorDept: string;
  createdAt: Timestamp;
}

export interface RecycledItem {
  id: string;
  originalCollection: 'assets' | 'inventory' | 'helpdesk_tickets' | 'it_problem_reports';
  originalId: string;
  data: any;
  deletedAt: Timestamp;
  deletedBy: string;
  deletedByName?: string;
  label: string; // For display, e.g., "Asset: A3-2024 (Pompa Air)"
}

export interface DeptGroup {
  id: string;
  name: string;
  departments: string[];
}
