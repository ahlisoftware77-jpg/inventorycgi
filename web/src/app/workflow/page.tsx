'use client';

import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  Ticket, 
  Wrench, 
  FileText, 
  ShieldCheck, 
  ArrowRight, 
  User, 
  Building, 
  CheckCircle2, 
  History,
  Package,
  ArrowRightLeft,
  Trash2,
  ShoppingCart,
  QrCode,
  SmartphoneNfc,
  Info,
  Database,
  UserCog,
  Search,
  Cpu,
  Zap,
  Activity,
  ShieldAlert,
  FileSignature,
  Scale,
  Printer,
  ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FlowStep = ({ 
  icon: Icon, 
  title, 
  description, 
  role, 
  color, 
  isLast = false 
}: { 
  icon: any, 
  title: string, 
  description: string, 
  role: string, 
  color: string,
  isLast?: boolean
}) => (
  <div className="flex flex-col items-center relative group">
    <div className={cn(
      "z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem] flex items-center justify-center shadow-xl border-4 border-white dark:border-slate-800 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
      color
    )}>
      <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
    </div>
    
    <div className="mt-6 text-center space-y-2 max-w-[200px]">
      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 font-black text-[8px] uppercase tracking-widest px-3 h-5 border-slate-200">
        {role}
      </Badge>
      <h4 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white leading-tight">{title}</h4>
      <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">"{description}"</p>
    </div>

    {!isLast && (
      <div className="hidden lg:block print:block absolute top-10 left-full w-full h-[2px] bg-gradient-to-r from-primary/30 to-transparent -z-0">
        <div className="absolute right-0 -top-1">
          <ArrowRight className="h-3 w-3 text-primary/30" />
        </div>
      </div>
    )}
  </div>
);

export default function WorkflowPage() {
  return (
    <DashboardLayout>
      <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 text-black">
        {/* Header */}
        <div className="relative p-10 rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl print:bg-slate-900 print:shadow-none print:break-inside-avoid">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50 print:opacity-20" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shadow-xl border border-white/5 print:border-slate-800">
                <GitBranch className="h-10 w-10 text-primary" />
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-black tracking-tighter uppercase italic text-left">Workflow System</h1>
                <p className="text-primary/60 font-black text-[10px] uppercase tracking-[0.3em] mt-1 text-left">Standard Operating Procedure Visualizer</p>
              </div>
            </div>
            <Button 
              onClick={() => window.print()}
              className="print:hidden bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl h-12 px-6 shadow-lg hover:shadow-xl transition-all"
            >
              <Printer className="w-4 h-4 mr-2" />
              Cetak Dokumen
            </Button>
          </div>
        </div>

        {/* ALUR 1: HELPDESK & FORM RESMI */}
        <section className="space-y-10">
          <div className="flex items-center gap-4 border-l-4 border-blue-600 pl-6 text-left">
            <div className="p-3 bg-blue-50 rounded-2xl shadow-sm"><Ticket className="h-6 w-6 text-blue-600" /></div>
            <div className="text-left">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">1. Alur Pelaporan IT (End-to-End)</h2>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60 text-left">Penyelesaian kendala teknis & dokumentasi audit ISO 14064</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5 gap-8 items-start justify-items-center bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] shadow-lg border border-slate-100 dark:border-slate-800 print:shadow-none print:border-slate-300 print:break-inside-avoid">
            <FlowStep 
              icon={Ticket} 
              title="Lapor Kendala" 
              role="Pelapor"
              color="bg-blue-600"
              description="User membuat tiket helpdesk & tempel (Paste) screenshot error."
            />
            <FlowStep 
              icon={Search} 
              title="Verifikasi" 
              role="Admin IT"
              color="bg-slate-800"
              description="Admin review urgensi, atur prioritas, & menugaskan teknisi."
            />
            <FlowStep 
              icon={Wrench} 
              title="Maintenance" 
              role="Teknisi IT"
              color="bg-amber-50"
              description="Proses pengerjaan, chat update, & upload bukti email (.msg)."
            />
            <FlowStep 
              icon={FileText} 
              title="Isi Form 0-32-028" 
              role="User / IT"
              color="bg-indigo-600"
              description="Melengkapi data teknis, PO No, & tanda tangan digital pengesahan."
            />
            <FlowStep 
              icon={CheckCircle2} 
              title="Penyelesaian" 
              role="Sistem"
              color="bg-emerald-600"
              isLast
              description="Tiket ditutup, tanggal sinkron otomatis, & dokumen diarsipkan."
            />
          </div>
        </section>

        {/* ALUR 2: SIKLUS HIDUP ASET */}
        <section className="space-y-10">
          <div className="flex items-center gap-4 border-l-4 border-primary pl-6 text-left">
            <div className="p-3 bg-primary/5 rounded-2xl shadow-sm"><Package className="h-6 w-6 text-primary" /></div>
            <div className="text-left">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">2. Manajemen Siklus Hidup Aset</h2>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60 text-left">Tata kelola aset dari registrasi hingga valuasi & penghapusan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 print:grid-cols-6 gap-8 items-start justify-items-center bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] shadow-lg border border-slate-100 dark:border-slate-800 print:shadow-none print:border-slate-300 print:break-inside-avoid">
            <FlowStep 
              icon={QrCode} 
              title="Registrasi" 
              role="Karyawan"
              color="bg-slate-800"
              description="Input data awal, upload foto aset, & pengajuan ke Admin."
            />
            <FlowStep 
              icon={Printer} 
              title="Tagging" 
              role="Sistem"
              color="bg-blue-500"
              description="Cetak label thermal (58mm) & penempelan QR/NFC fisik."
            />
            <FlowStep 
              icon={ClipboardCheck} 
              title="Audit Fisik" 
              role="Manager"
              color="bg-cyan-600"
              description="Stock Opname berkala per unit via Scan QR lapangan."
            />
            <FlowStep 
              icon={ArrowRightLeft} 
              title="Mutasi" 
              role="Unit Kerja"
              color="bg-indigo-600"
              description="Pindah lokasi antar dept. dengan persetujuan dua pihak."
            />
            <FlowStep 
              icon={Scale} 
              title="Valuasi" 
              role="Accounting"
              color="bg-emerald-600"
              description="Hitung penyusutan buku otomatis & perbandingan data Excel."
            />
            <FlowStep 
              icon={Trash2} 
              title="Disposal" 
              role="Admin"
              color="bg-rose-600"
              isLast
              description="Penghapusan aset rusak permanen & pemindahan ke Recycle Bin."
            />
          </div>
        </section>

        {/* ALUR 3: PERMINTAAN INVENTARIS */}
        <section className="space-y-10">
          <div className="flex items-center gap-4 border-l-4 border-emerald-600 pl-6 text-left">
            <div className="p-3 bg-emerald-50 rounded-2xl shadow-sm"><ShoppingCart className="h-6 w-6 text-emerald-600" /></div>
            <div className="text-left">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">3. Logistik & Permintaan Barang</h2>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60 text-left">Alur pengambilan & manajemen stok barang inventaris</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5 gap-8 items-start justify-items-center bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] shadow-lg border border-slate-100 dark:border-slate-800 print:shadow-none print:border-slate-300 print:break-inside-avoid">
            <FlowStep 
              icon={Search} 
              title="Portal Publik" 
              role="Peminta"
              color="bg-slate-900"
              description="Akses katalog barang tanpa login via link publik / QR."
            />
            <FlowStep 
              icon={ShoppingCart} 
              title="Pilih Barang" 
              role="Peminta"
              color="bg-emerald-600"
              description="Pilih item, tentukan qty, & isi identitas peminta."
            />
            <FlowStep 
              icon={Building} 
              title="Approval" 
              role="HR & GA"
              color="bg-amber-500"
              description="Cek stok fisik, validasi kebutuhan, & Tanda Tangan Digital."
            />
            <FlowStep 
              icon={SmartphoneNfc} 
              title="Pengambilan" 
              role="Warehouse"
              color="bg-primary"
              description="Penyerahan barang & verifikasi pengambilan real-time."
            />
            <FlowStep 
              icon={FileText} 
              title="Laporan" 
              role="Accounting"
              color="bg-indigo-600"
              isLast
              description="Stok terpotong otomatis & log transaksi tercatat permanen."
            />
          </div>
        </section>

        {/* ALUR 4: TATA KELOLA & GOVERNANCE */}
        <section className="space-y-10">
          <div className="flex items-center gap-4 border-l-4 border-rose-600 pl-6 text-left">
            <div className="p-3 bg-rose-50 rounded-2xl shadow-sm"><UserCog className="h-6 w-6 text-rose-600" /></div>
            <div className="text-left">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">4. Tata Kelola & Keamanan Sistem</h2>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60 text-left">Infrastruktur pendukung integritas data perusahaan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-8 items-start justify-items-center bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] shadow-lg border border-slate-100 dark:border-slate-800 print:shadow-none print:border-slate-300 print:break-inside-avoid">
            <FlowStep 
              icon={UserCog} 
              title="Hak Akses" 
              role="Admin"
              color="bg-slate-900"
              description="Kontrol granular per-halaman & per-aksi untuk tiap user."
            />
            <FlowStep 
              icon={Activity} 
              title="Audit Trail" 
              role="Sistem"
              color="bg-indigo-600"
              description="Pencatatan setiap aksi (log) user secara real-time."
            />
            <FlowStep 
              icon={Trash2} 
              title="Recycle Bin" 
              role="Admin"
              color="bg-rose-600"
              description="Penampungan data hapus sementara selama 30 hari."
            />
            <FlowStep 
              icon={Database} 
              title="Data Vault" 
              role="Admin"
              color="bg-primary"
              isLast
              description="Pencadangan rutin (Backup JSON) & pemulihan data (Restore)."
            />
          </div>
        </section>

        {/* Footer info */}
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary text-white overflow-hidden relative print:shadow-none print:bg-slate-900 print:break-inside-avoid">
            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none"><ShieldCheck className="w-40 h-40" /></div>
            <CardContent className="p-10 flex items-start gap-6 text-left">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner shrink-0">
                    <Info className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-2 text-left">
                    <p className="text-lg font-black uppercase tracking-tight text-left">Kepatuhan Standar Industri</p>
                    <p className="text-sm text-white/80 leading-relaxed font-medium max-w-3xl text-left">
                        Seluruh alur kerja di atas dirancang untuk mematuhi standar **ISO 14064** dan kontrol internal PT. CGI. Sistem menjamin transparansi penuh melalui tanda tangan digital yang tidak dapat dipalsukan dan jejak audit yang tidak dapat dihapus (Audit Trail). Segala bentuk penyimpangan data akan terdeteksi secara otomatis oleh mesin validasi pusat.
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
