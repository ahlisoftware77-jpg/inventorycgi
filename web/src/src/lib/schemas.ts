
import { z } from 'zod';

export const assetSchema = z.object({
  name: z.string().min(2, { message: "Nama aset harus memiliki setidaknya 2 karakter." }),
  code: z.string().min(1, { message: "Kode aset tidak boleh kosong." }),
  costCenter: z.string().optional(),
  category: z.string().min(1, { message: "Kategori tidak boleh kosong." }),
  location: z.string().min(1, { message: "Lokasi tidak boleh kosong." }),
  purchaseDate: z.date({ required_error: "Tanggal pembelian harus diisi." }).optional().nullable(),
  price: z.coerce.number().min(0, { message: "Harga tidak boleh negatif." }),
  priceUSD: z.coerce.number().min(0, { message: "Harga tidak boleh negatif." }).optional(),
  qty: z.coerce.number().int().min(1, { message: "Kuantitas harus minimal 1." }),
  condition: z.enum(['Baru', 'Baik', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Rusak', 'Tidak Terpakai', 'Upgrade', 'Sold'], { required_error: "Kondisi harus dipilih." }),
  status: z.enum(['Aktif', 'Dipinjam', 'Rusak', 'Dihapus', 'Dipindah-Aktif', 'Perlu Perbaikan', 'waiting_mutasi', 'waiting_disposal', 'karyawan_approved', 'approved_mutasi', 'approved_disposal', 'waiting_edit', 'approved_edit', 'waiting_creation', 'Aktif_creation'], { required_error: "Status harus dipilih." }),
  notes: z.string().optional(),
  photoURL: z.string().url({ message: "URL foto tidak valid." }).optional().or(z.literal('')),
  photoURL2: z.string().url({ message: "URL foto 2 tidak valid." }).optional().or(z.literal('')),
  photoURL3: z.string().url({ message: "URL foto 3 tidak valid." }).optional().or(z.literal('')),
  photoURL4: z.string().url({ message: "URL foto 4 tidak valid." }).optional().or(z.literal('')),
  disposalPhotoURL1: z.string().url({ message: "URL foto bukti disposal 1 tidak valid." }).optional().or(z.literal('')),
  disposalPhotoURL2: z.string().url({ message: "URL foto bukti disposal 2 tidak valid." }).optional().or(z.literal('')),
  disposalPhotoURL3: z.string().url({ message: "URL foto bukti disposal 3 tidak valid." }).optional().or(z.literal('')),
  disposalPhotoURL4: z.string().url({ message: "URL foto bukti disposal 4 tidak valid." }).optional().or(z.literal('')),
  brand: z.string().optional(),
  user: z.string().optional(),
  supplier: z.string().optional(),
  prNumber: z.string().optional(),
  inspectionNumber: z.string().optional(),
  projectInspectionNumber: z.string().optional(),
  projectInspectionDate: z.date().optional().nullable(),
  mutationDate: z.date().optional().nullable(),
  disposalDate: z.date().optional().nullable(),
  midSemesterCheckDate: z.date().optional().nullable(),
  endSemesterCheckDate: z.date().optional().nullable(),
  assetLifetime: z.coerce.number().min(0, { message: "Masa ketahanan tidak boleh negatif." }).optional(),
  accessory1: z.string().optional(),
  accessory2: z.string().optional(),
  accessory3: z.string().optional(),
  accessory4: z.string().optional(),
  requestedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  requestedAt: z.date().optional().nullable(),
  approvedAt: z.date().optional().nullable(),
  mutationTargetDepartment: z.string().optional(),
  transactionCode: z.string().optional(),
  accountingUpdatedBy: z.string().optional(),
  accountingUpdatedAt: z.date().optional().nullable(),
});

export const computerAssetSchema = z.object({
  computerName: z.string().min(2, { message: "Nama komputer harus diisi." }),
  assetCode: z.string().min(1, { message: "Kode aset harus diisi." }),
  department: z.string().min(1, { message: "Departemen harus dipilih." }),
  currentUser: z.string().optional(),
  brandModel: z.string().min(2, { message: "Merk/Model harus diisi." }),
  mainboard: z.string().optional(),
  cpu: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  storage2: z.string().optional(),
  gpu: z.string().optional(),
  serialNumber: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  os: z.string().optional(),
  windowsLicense: z.string().optional(),
  officeLicense: z.string().optional(),
  antivirus: z.string().optional(),
  purchaseDate: z.date().optional().nullable(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  condition: z.enum(['Aktif', 'Perlu Perbaikan', 'Rusak']),
  status: z.enum(['Digunakan', 'Dalam Service', 'Dihapus']),
});

export const softwareSchema = z.object({
  name: z.string().min(2, { message: "Nama software harus diisi." }),
  licenseKey: z.string().optional(),
  purchaseDate: z.date().optional().nullable(),
  expiryDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

export const maintenanceHistorySchema = z.object({
  date: z.date({ required_error: "Tanggal harus diisi." }),
  type: z.enum(['Perbaikan', 'Penggantian', 'Pembaruan', 'Lainnya'], { required_error: "Jenis perawatan harus dipilih." }),
  description: z.string().min(5, { message: "Deskripsi harus diisi." }),
  technician: z.string().min(2, { message: "Nama teknisi harus diisi." }),
  notes: z.string().optional(),
});

export const ticketSchema = z.object({
  category: z.enum(['Hardware', 'Software', 'Jaringan', 'Lainnya'], {
    required_error: "Kategori masalah harus dipilih.",
  }),
  priority: z.enum(['Rendah', 'Normal', 'Tinggi', 'Kritis'], {
    required_error: "Tingkat prioritas harus dipilih.",
  }),
  description: z.string().min(10, {
    message: "Deskripsi masalah harus memiliki setidaknya 10 karakter.",
  }),
});


export const inventoryItemSchema = z.object({
  type: z.enum(['ATK', 'Sparepart', 'Alat Kebersihan']),
  code: z.string().min(1, "Kode barang tidak boleh kosong."),
  name: z.string().min(2, "Nama barang harus diisi."),
  category: z.string().min(1, "Kategori harus diisi."),
  unit: z.string().min(1, "Satuan tidak boleh kosong."),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif."),
  location: z.string().min(1, "Lokasi harus diisi."),
  department: z.string().min(1, "Departemen harus diisi."),
  notes: z.string().optional(),
  photoURL: z.string().url({ message: "URL foto tidak valid." }).optional().or(z.literal('')),
});
