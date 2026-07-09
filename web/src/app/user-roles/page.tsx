'use client';

import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  ShieldCheck, 
  UserCheck, 
  Users, 
  Eye, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Info,
  ShieldAlert,
  Building2,
  Settings2,
  Key
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const RoleCard = ({ title, description, icon: Icon, color, features }: { title: string, description: string, icon: any, color: string, features: string[] }) => (
    <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden flex flex-col h-full group hover:shadow-2xl transition-all duration-500">
        <div className={cn("p-6 text-white flex items-center gap-4", color)}>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                <Icon className="h-8 w-8" />
            </div>
            <div>
                <h3 className="text-xl font-black uppercase tracking-tight leading-none">{title}</h3>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">System Role</p>
            </div>
        </div>
        <CardContent className="p-8 flex-1 flex flex-col">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-6 italic">
                "{description}"
            </p>
            <div className="space-y-3 mt-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Wewenang Utama:</p>
                {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{f}</span>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);

export default function UserRolesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        {/* Header Section */}
        <div className="relative p-10 rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl ring-1 ring-white/10">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shadow-xl border border-white/5">
                            <Lock className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Hierarki Akses</h1>
                            <p className="text-primary/60 font-black text-[10px] uppercase tracking-[0.3em] mt-1">Access Control & Governance</p>
                        </div>
                    </div>
                    <p className="text-slate-400 font-medium text-sm max-w-xl">
                        Panduan wewenang dan hak akses sistem manajemen aset PT. China Glaze Indonesia untuk menjaga integritas dan keamanan data perusahaan.
                    </p>
                </div>
            </div>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RoleCard 
                title="Admin" 
                icon={ShieldCheck} 
                color="bg-slate-900"
                description="Otoritas tertinggi dengan kendali penuh atas infrastruktur data dan manajemen pengguna."
                features={[
                    "Akses seluruh data perusahaan",
                    "Persetujuan akhir mutasi & disposal",
                    "Manajemen user & hak akses",
                    "Konfigurasi pengaturan sistem",
                    "Backup & Restore database"
                ]}
            />
            <RoleCard 
                title="Manager" 
                icon={Building2} 
                color="bg-blue-600"
                description="Penyelia unit kerja yang mengawasi aset departemen dan memberikan validasi tingkat pertama."
                features={[
                    "Akses aset lintas departemen terkait",
                    "Persetujuan awal mutasi & disposal",
                    "Audit fisik (Stock Opname) unit",
                    "Ubah kondisi aset langsung",
                    "Laporan stok inventaris bulanan"
                ]}
            />
            <RoleCard 
                title="Karyawan" 
                icon={UserCheck} 
                color="bg-emerald-600"
                description="Penanggung jawab harian aset di departemen yang bertugas mengelola siklus hidup aset."
                features={[
                    "Akses aset khusus departemen sendiri",
                    "Inisiasi tambah/mutasi/disposal",
                    "Pengajuan perbaikan aset",
                    "Request barang inventaris (ATK)",
                    "Pelaporan kendala (IT Helpdesk)"
                ]}
            />
            <RoleCard 
                title="User" 
                icon={Users} 
                color="bg-slate-500"
                description="Pengguna standar dengan hak akses terbatas untuk kebutuhan operasional umum."
                features={[
                    "Lihat profil aset terdaftar",
                    "Request barang logistik (ATK)",
                    "Lapor masalah ke IT Helpdesk",
                    "Lihat pengumuman perusahaan",
                    "Akses panduan bantuan"
                ]}
            />
        </div>

        {/* Access Matrix Table */}
        <Card className="border-none shadow-xl rounded-[3rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <CardHeader className="p-10 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg"><Settings2 className="h-5 w-5 text-primary" /></div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Matriks Fitur & Wewenang</CardTitle>
                </div>
                <CardDescription className="font-bold uppercase text-[10px] tracking-[0.2em] text-muted-foreground mt-2">Perbandingan Kapabilitas Antar Peran Sistem</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50 h-14">
                        <TableRow className="border-none">
                            <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest">Fungsionalitas Sistem</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Admin</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Manager</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Karyawan</TableHead>
                            <TableHead className="text-center pr-10 text-[10px] font-black uppercase tracking-widest">User</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[
                            { f: "Registrasi Aset Baru", a: true, m: true, k: true, u: false },
                            { f: "Edit & Update Data Aset", a: true, m: true, k: "DEPT", u: false },
                            { f: "Persetujuan Mutasi/Disposal", a: "FINAL", m: "DEPT", k: "DEPT", u: false },
                            { f: "Hapus Data Permanen", a: true, m: false, k: false, u: false },
                            { f: "Kelola Stok Inventaris", a: true, m: "DEPT", k: "DEPT", u: false },
                            { f: "Akses Pengaturan Global", a: true, m: false, k: false, u: false },
                            { f: "Lapor & Pantau Helpdesk", a: true, m: true, k: true, u: true },
                            { f: "Cetak Dokumen & Label", a: true, m: true, k: true, u: true },
                            { f: "Manajemen Akun Pengguna", a: true, m: false, k: false, u: false },
                        ].map((row, idx) => (
                            <TableRow key={idx} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-50 dark:border-slate-800">
                                <TableCell className="pl-10 font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-tight">{row.f}</TableCell>
                                <TableCell className="text-center">
                                    {row.a === true ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black px-2 py-0.5 uppercase mx-auto w-fit">{String(row.a)}</Badge>}
                                </TableCell>
                                <TableCell className="text-center">
                                    {row.m === true ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : row.m === false ? <XCircle className="h-5 w-5 text-slate-200 mx-auto" /> : <Badge variant="outline" className="text-[8px] font-black px-2 py-0.5 uppercase mx-auto w-fit">{String(row.m)}</Badge>}
                                </TableCell>
                                <TableCell className="text-center">
                                    {row.k === true ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : row.k === false ? <XCircle className="h-5 w-5 text-slate-200 mx-auto" /> : <Badge variant="outline" className="text-[8px] font-black px-2 py-0.5 uppercase mx-auto w-fit">{String(row.k)}</Badge>}
                                </TableCell>
                                <TableCell className="text-center pr-10">
                                    {row.u === true ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <XCircle className="h-5 w-5 text-slate-200 mx-auto" />}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Granular Permissions Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2.5rem] p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><ShieldAlert className="h-32 w-32 rotate-12" /></div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/10"><Key className="h-6 w-6" /></div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">Kontrol Akses Granular</h3>
                    </div>
                    <p className="text-blue-50 font-medium leading-relaxed max-w-2xl">
                        Sistem kini mendukung **Izin Granular**. Admin dapat mengatur akses per-individu untuk halaman tertentu atau tombol aksi tertentu (seperti izin menghapus aset atau akses menu Pengaturan) melalui menu **Manajemen User**. 
                        Hal ini memungkinkan fleksibilitas luar biasa bagi staf IT atau HR yang membutuhkan wewenang khusus diluar peran standar mereka.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-4">
                        {["Custom Page Access", "Action-Based Permission", "Individual Lock", "Audit Integrity"].map(t => (
                            <Badge key={t} variant="outline" className="bg-white/10 text-white border-white/20 font-black text-[9px] uppercase tracking-widest px-4 h-7">{t}</Badge>
                        ))}
                    </div>
                </div>
            </Card>

            <Card className="border-none shadow-xl bg-amber-50 rounded-[2.5rem] p-10 flex flex-col justify-center text-amber-900 border border-amber-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm"><Info className="h-5 w-5 text-amber-600" /></div>
                    <h4 className="font-black uppercase tracking-tight text-sm">Status Pending</h4>
                </div>
                <p className="text-xs font-bold leading-relaxed opacity-80 uppercase tracking-wide">
                    Setiap akun baru yang terdaftar akan otomatis memiliki status <span className="text-rose-600 font-black">PENDING</span>. 
                    Akun tersebut tidak dapat masuk ke sistem hingga <span className="underline">Admin melakukan verifikasi dan memberikan peran (Role)</span> yang sesuai.
                </p>
            </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
