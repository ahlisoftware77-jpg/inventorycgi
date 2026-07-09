'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  LayoutDashboard, 
  Package, 
  Wrench, 
  ShieldCheck, 
  CheckCircle2, 
  Info,
  Clock,
  QrCode,
  FileText,
  Activity,
  History,
  ClipboardCheck,
  Laptop,
  Shield,
  HardDrive,
  MousePointer2,
  Power,
  Mail,
  Database,
  CalendarDays,
  Lock,
  AlertTriangle,
  Video,
  Mic,
  MonitorUp,
  Droplets,
  ThermometerSun,
  Zap,
  ShieldAlert,
  Key,
  Usb,
  RefreshCw,
  LifeBuoy,
  Ticket,
  Image as ImageIcon,
  Printer,
  Settings2,
  Calendar as CalendarIcon,
  Files,
  Search,
  FolderTree,
  FileStack,
  Tags,
  Pencil,
  FileSignature
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

/**
 * @fileOverview Komponen Konten Bantuan yang digunakan di halaman internal maupun publik.
 * Berisi dokumentasi terstruktur untuk Dashboard, Aset, Inventaris, dan Maintenance/Audit.
 * Modul Training: Komputer Dasar, Email/Backup, Kalender, Meeting Online, Perawatan Perangkat, Keamanan, Cara Melapor, Efisiensi Dokumen, Keselamatan, dan Manajemen Aset.
 * Dilengkapi fitur cetak per modul dengan konfigurasi tanggal.
 */
export default function HelpContent() {
  const { toast } = useToast();
  
  // Konfigurasi Cetak States
  const [printDate, setPrintDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showPrintDate, setShowPrintDate] = useState(true);

  const handlePrintSection = (title: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      toast({ variant: 'destructive', title: 'Gagal Mencetak', description: 'Konten tidak ditemukan.' });
      return;
    }

    const printWindow = window.open('', '', 'width=900,height=1000');
    if (!printWindow) return;

    const contentHtml = element.innerHTML;
    // Remove buttons from print content
    const cleanedHtml = contentHtml.replace(/<button[^>]*>([\s\S]*?)<\/button>/gi, '');

    const displayDate = showPrintDate ? format(new Date(printDate), 'dd MMMM yyyy', { locale: localeID }) : '';
    const dateLine = showPrintDate ? `<p style="margin:0; font-size: 8pt;">Dicetak: ${displayDate}</p>` : '';

    // Menentukan judul kategori berdasarkan nomor materi
    const isHRGASecurity = title.includes('7.') || title.includes('8.') || title.includes('9.');
    const docTitle = isHRGASecurity ? 'MATERI PELATIHAN HR, GA, SECURITY' : 'MATERI PELATIHAN IT';

    const html = `
      <html>
        <head>
          <title>Training Material - ${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; line-height: 1.6; }
            .header { border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .co-title { font-size: 20pt; font-weight: 900; color: #0d9488; margin: 0; text-transform: uppercase; }
            .doc-title { font-size: 14pt; font-weight: 700; margin: 20px 0; text-transform: uppercase; border-left: 5px solid #0d9488; padding-left: 15px; }
            .content { font-size: 11pt; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
            section { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; page-break-inside: avoid; }
            h4 { margin-top: 0; font-weight: 900; font-size: 10pt; text-transform: uppercase; color: #334155; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            ul { padding-left: 20px; margin-bottom: 0; }
            li { margin-bottom: 8px; }
            .footer { margin-top: 50px; pt-20; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
            @media print { @page { size: A4; margin: 15mm; } .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
                <h1 class="co-title">PT. CHINA GLAZE INDONESIA</h1>
                <p style="margin:0; font-size: 9pt; font-weight: bold; opacity: 0.6;">Internal Training & Documentation</p>
            </div>
            <div style="text-align: right;">
                <p style="margin:0; font-size: 10pt; font-weight: bold;">MODUL: ${title}</p>
                ${dateLine}
            </div>
          </div>
          <div class="doc-title">${docTitle}</div>
          <div class="content">${cleanedHtml}</div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} PT. China Glaze Indonesia - Departemen IT & GA. Seluruh Hak Cipta Dilindungi.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="space-y-8 pb-32 text-black">
      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-black">
        <CardHeader className="p-8 sm:p-12 border-b bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4 mb-2 text-left">
            <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="text-left">
              <CardTitle className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Pusat Panduan Sistem</CardTitle>
              <CardDescription className="font-medium text-slate-500 text-sm text-left">
                Dokumentasi operasional terpadu dan materi training karyawan PT. China Glaze Indonesia.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-12 text-black text-left">
          
          {/* KONFIGURASI LAPORAN */}
          <div className="mb-10 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl"><Settings2 className="h-5 w-5 text-primary" /></div>
                <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Konfigurasi Laporan</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Atur parameter sebelum mencetak modul</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center space-x-2">
                    <Switch 
                      id="show-print-date" 
                      checked={showPrintDate} 
                      onCheckedChange={setShowPrintDate} 
                    />
                    <Label htmlFor="show-print-date" className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer">Tampilkan Tanggal</Label>
                </div>

                <div className={cn("flex items-center gap-3 transition-opacity duration-300", !showPrintDate && "opacity-30 pointer-events-none")}>
                    <Label htmlFor="print-date-input" className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">Pilih Tanggal:</Label>
                    <div className="relative">
                        <Input 
                            id="print-date-input"
                            type="date"
                            value={printDate}
                            onChange={(e) => setPrintDate(e.target.value)}
                            className="h-9 rounded-lg bg-white dark:bg-slate-900 border-slate-200 text-[11px] font-bold w-[160px] pr-8"
                        />
                        <CalendarIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/40 pointer-events-none" />
                    </div>
                </div>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-6" defaultValue="item-computer-basic">

            {/* SECTION 1: PENGGUNAAN KOMPUTER DASAR */}
            <AccordionItem value="item-computer-basic" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6">
                <div className="flex items-center gap-3">
                    <Laptop className="h-6 w-6 text-primary" />
                    <span>1. PENGGUNAAN KOMPUTER DASAR</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-basic-comp" className="space-y-6 text-left">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('1. Penggunaan Komputer Dasar', 'print-basic-comp')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Power className="h-4 w-4 text-blue-600" /> Operasional & Hardware
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Menyalakan:</strong> Tekan tombol power satu kali, tunggu hingga layar login muncul.</li>
                                <li><strong>Mematikan:</strong> Gunakan menu <em>Start &gt; Shut Down</em>. Jangan mencabut kabel daya secara paksa.</li>
                                <li><strong>Kebersihan:</strong> Jauhkan makanan dan minuman dari keyboard dan CPU untuk mencegah kerusakan.</li>
                                <li><strong>Efisiensi:</strong> Matikan monitor saat meninggalkan meja lebih dari 30 menit.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Shield className="h-4 w-4 text-emerald-600" /> Keamanan & Akun
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Lock Screen:</strong> Wajib menekan tombol <code>Win + L</code> saat meninggalkan komputer.</li>
                                <li><strong>Password:</strong> Jangan membagikan kata sandi atau menempelkannya di area kerja.</li>
                                <li><strong>USB Flashdisk:</strong> Berhati-hatilah saat mencolokkan media penyimpanan luar untuk menghindari virus.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <HardDrive className="h-4 w-4 text-amber-600" /> Manajemen Data & File
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Server Perusahaan:</strong> Gunakan <em>Shared Drive</em> untuk menyimpan dokumen pekerjaan utama.</li>
                                <li><strong>Lokal PC:</strong> Hindari menyimpan data penting di Desktop/Documents dalam jangka panjang.</li>
                                <li><strong>Folder Kerja:</strong> Susun folder berdasarkan kategori dan tahun agar mudah dicari.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Activity className="h-4 w-4 text-rose-600" /> Troubleshooting Ringan
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Restart:</strong> Lakukan restart jika aplikasi terasa macet atau lambat.</li>
                                <li><strong>Cek Kabel:</strong> Pastikan kabel LAN dan power terpasang dengan benar jika internet terputus.</li>
                                <li><strong>Lapor IT:</strong> Segera buat tiket helpdesk jika kendala fisik tidak teratasi.</li>
                            </ul>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 2: EMAIL, BACKUP & KALENDER */}
            <AccordionItem value="item-email-backup" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6">
                <div className="flex items-center gap-3">
                    <Mail className="h-6 w-6 text-primary" />
                    <span>2. EMAIL, BACKUP & KALENDER</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-email-backup" className="space-y-6 text-left">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('2. Email, Backup & Kalender', 'print-email-backup')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Mail className="h-4 w-4 text-blue-600" /> Etika & Keamanan Email
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Subjek Jelas:</strong> Gunakan judul email yang spesifik (Contoh: Lap_Bulanan_Jan2024_Produksi).</li>
                                <li><strong>Tanda Tangan:</strong> Gunakan format <em>Signature</em> resmi perusahaan.</li>
                                <li><strong>Waspada Phishing:</strong> Jangan klik link atau unduh lampiran dari email tidak dikenal.</li>
                                <li><strong>Respon Cepat:</strong> Balas email mendesak maksimal dalam 1x24 jam kerja.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Database className="h-4 w-4 text-amber-600" /> Pencadangan Data (Backup)
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Frekuensi:</strong> Lakukan pencadangan file penting ke <em>Server File</em> minimal seminggu sekali.</li>
                                <li><strong>Data Kritis:</strong> Pastikan file laporan keuangan/produksi selalu memiliki salinan di server pusat.</li>
                                <li><strong>Recovery:</strong> Simpan file dengan penanda versi (Contoh: V1, V2) untuk memudahkan pemulihan.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <CalendarDays className="h-4 w-4 text-emerald-600" /> Pengelolaan Kalender
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Update Jadwal:</strong> Masukkan agenda meeting atau kegiatan penting ke kalender digital sistem.</li>
                                <li><strong>Undangan Rapat:</strong> Gunakan fitur <em>Meeting Request</em> untuk notifikasi otomatis.</li>
                                <li><strong>Booking Ruangan:</strong> Cek ketersediaan ruang rapat di kalender umum sebelum menggunakan.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Lock className="h-4 w-4 text-rose-600" /> Proteksi Akun
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Auto-Signout:</strong> Pastikan Anda keluar (*Log Out*) dari akun email di komputer umum.</li>
                                <li><strong>Ganti Sandi:</strong> Disarankan mengubah kata sandi akses email setiap 3-6 bulan sekali.</li>
                            </ul>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 3: MEETING ONLINE */}
            <AccordionItem value="item-meeting-online" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6 text-left">
                <div className="flex items-center gap-3 text-left">
                    <Video className="h-6 w-6 text-primary" />
                    <span>3. MEETING ONLINE</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-meeting-online" className="space-y-6 text-left">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('3. Meeting Online', 'print-meeting-online')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Video className="h-4 w-4 text-blue-600" /> Persiapan Teknis
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Audio & Video:</strong> Tes mikrofon dan kamera 5 menit sebelum meeting dimulai.</li>
                                <li><strong>Internet:</strong> Pastikan sinyal stabil. Gunakan kabel LAN jika memungkinkan.</li>
                                <li><strong>Pencahayaan:</strong> Pastikan wajah terlihat jelas (hindari backlight).</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Mic className="h-4 w-4 text-emerald-600" /> Etika Pertemuan
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Mute Mode:</strong> Matikan mic jika tidak sedang berbicara untuk mengurangi noise.</li>
                                <li><strong>Interupsi:</strong> Gunakan fitur <em>Raise Hand</em> atau kolom chat untuk bertanya.</li>
                                <li><strong>Fokus:</strong> Hindari multitasking yang terlihat di kamera saat meeting berlangsung.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <MonitorUp className="h-4 w-4 text-amber-600" /> Fitur Kolaborasi
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Screen Share:</strong> Pastikan hanya jendela aplikasi yang relevan yang dibagikan.</li>
                                <li><strong>Recording:</strong> Izin terlebih dahulu kepada peserta sebelum menekan tombol rekam.</li>
                                <li><strong>Chat Room:</strong> Gunakan untuk berbagi link dokumen atau mencatat poin penting.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Lock className="h-4 w-4 text-rose-600" /> Keamanan Meeting
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Link Meeting:</strong> Jangan membagikan link meeting ke platform publik.</li>
                                <li><strong>Waiting Room:</strong> Host wajib mengaktifkan lobi untuk memverifikasi tamu.</li>
                            </ul>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 4: PERAWATAN PERANGKAT */}
            <AccordionItem value="item-device-care" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6 text-left">
                <div className="flex items-center gap-3 text-left">
                    <Wrench className="h-6 w-6 text-primary" />
                    <span>4. PERAWATAN PERANGKAT</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-device-care" className="space-y-6 text-left">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('4. Perawatan Perangkat', 'print-device-care')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Droplets className="h-4 w-4 text-blue-600" /> Kebersihan Fisik
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Hindari Cairan:</strong> Jangan menyemprotkan pembersih langsung ke layar. Gunakan kain microfiber lembap.</li>
                                <li><strong>Debu:</strong> Bersihkan ventilasi udara CPU/Laptop secara berkala menggunakan blower halus.</li>
                                <li><strong>Layar:</strong> Bersihkan noda sidik jari dengan gerakan melingkar searah tanpa menekan keras.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <ThermometerSun className="h-4 w-4 text-amber-600" /> Suhu & Lingkungan
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Ventilasi:</strong> Berikan jarak minimal 10cm dari dinding untuk sirkulasi udara CPU.</li>
                                <li><strong>Suhu:</strong> Hindari penggunaan di bawah sinar matahari langsung atau ruangan pengap.</li>
                                <li><strong>Kelembapan:</strong> Pastikan area kerja tidak lembap untuk mencegah korosi komponen internal.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <MousePointer2 className="h-4 w-4 text-emerald-600" /> Periferal & Aksesori
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Keyboard/Mouse:</strong> Balikkan keyboard sesekali untuk membuang kotoran kecil di sela tombol.</li>
                                <li><strong>Monitor:</strong> Atur tingkat keberhasilan yang nyaman untuk mata dan umur panel layar.</li>
                                <li><strong>Kabel:</strong> Gulung kabel periferal dengan rapi, jangan menekuk kabel secara tajam.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Zap className="h-4 w-4 text-rose-600" /> Kelistrikan & Keamanan
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>UPS/Stabilizer:</strong> Gunakan daya stabil untuk mencegah kerusakan akibat lonjakan listrik.</li>
                                <li><strong>Cek Fisik:</strong> Segera lapor jika ditemukan kabel terkelupas atau soket yang panas.</li>
                                <li><strong>Manajemen:</strong> Ikat kabel menggunakan <em>cable tie</em> agar tidak berantakan.</li>
                            </ul>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 5: KEAMANAN PERANGKAT */}
            <AccordionItem value="item-security" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6 text-left">
                <div className="flex items-center gap-3 text-left">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                    <span>5. KEAMANAN PERANGKAT</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-security" className="space-y-6 text-left text-black">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('5. Keamanan Perangkat', 'print-security')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-black">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <ShieldCheck className="h-4 w-4 text-blue-600" /> Proteksi Malware
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Antivirus:</strong> Pastikan antivirus selalu aktif. Jangan mematikan tanpa instruksi IT.</li>
                                <li><strong>Software:</strong> Dilarang menginstal aplikasi bajakan (*crack*) atau sumber tidak resmi.</li>
                                <li><strong>Situs Web:</strong> Hindari mengunjungi situs yang memberikan peringatan keamanan.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Key className="h-4 w-4 text-amber-600" /> Manajemen Password
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Kompleksitas:</strong> Gunakan kombinasi huruf, angka, dan simbol untuk kata sandi.</li>
                                <li><strong>Keunikan:</strong> Gunakan password yang berbeda untuk setiap akun (Email, ERP, dll).</li>
                                <li><strong>Kerahasiaan:</strong> Jangan pernah memberikan informasi login kepada siapapun.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Usb className="h-4 w-4 text-emerald-600" /> Keamanan Media Luar
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Flashdisk Asing:</strong> Jangan mencolokkan USB drive yang bukan milik pribadi/perusahaan.</li>
                                <li><strong>Scanning:</strong> Lakukan pemindaian virus otomatis setiap kali media eksternal terhubung.</li>
                                <li><strong>Transfer Data:</strong> Gunakan server perusahaan atau cloud internal untuk berbagi file.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <RefreshCw className="h-4 w-4 text-rose-600" /> Pembaruan Sistem
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Windows Update:</strong> Lakukan restart jika sistem meminta instalasi pembaruan keamanan.</li>
                                <li><strong>Patching:</strong> Segera laporkan jika aplikasi memberikan notifikasi versi kedaluwarsa.</li>
                                <li><strong>Stabilitas:</strong> Update rutin menjamin perangkat terlindung dari ancaman terbaru.</li>
                            </ul>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 6: CARA MELAPOR KE IT */}
            <AccordionItem value="item-how-to-report" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6 text-left">
                <div className="flex items-center gap-3 text-left">
                    <LifeBuoy className="h-6 w-6 text-primary" />
                    <span>6. CARA MELAPOR KE IT</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-how-to-report" className="space-y-6 text-left text-black">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('6. Cara Melapor ke IT', 'print-how-to-report')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-black">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Ticket className="h-4 w-4 text-blue-600" /> Media Pelaporan
                            </h4>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                                Pelaporan wajib dilakukan melalui menu <strong>IT Helpdesk</strong>. Hindari melapor hanya melalui pesan singkat agar riwayat penanganan tercatat sistematis.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Info className="h-4 w-4 text-emerald-600" /> Kesiapan Informasi
                            </h4>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                                Sebelum melapor, siapkan <strong>Kode Aset</strong> perangkat. Jelaskan kronologi kejadian dan pesan error yang muncul pada layar secara spesifik.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <ImageIcon className="h-4 w-4 text-amber-600" /> Lampiran Visual
                            </h4>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                                Gunakan fitur <strong>Paste (Ctrl+V)</strong> untuk menempelkan screenshot error. Foto fisik kendala hardware membantu teknisi menyiapkan alat pengganti yang tepat.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <FileText className="h-4 w-4 text-rose-600" /> Kewajiban Form 0-32-028
                            </h4>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                                Setiap pengerjaan yang selesai wajib disertai pengisian <strong>Form IT Problem (0-32-028)</strong> dan tanda tangan digital untuk administrasi audit.
                            </p>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 7: PENINGKATAN EFISIENSI */}
            <AccordionItem value="item-efficiency" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6 text-left">
                <div className="flex items-center gap-3 text-left">
                    <FileStack className="h-6 w-6 text-primary" />
                    <span>7. PENINGKATAN EFISIENSI</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-efficiency" className="space-y-6 text-left text-black">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('7. Peningkatan Efisiensi', 'print-efficiency')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed mb-4 text-left">
                        Peningkatan Efisiensi: Tujuannya adalah untuk meningkatkan efisiensi dalam hal pengelolaan dokumen, penyimpanan, dan pencarian kembali.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-black">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Files className="h-4 w-4 text-blue-600" /> Pengelolaan Dokumen
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Standarisasi Nama:</strong> Selalu gunakan format penamaan file yang seragam (e.g., [Tgl]_[Dept]_[Nama_File]).</li>
                                <li><strong>Versi Terkontrol:</strong> Gunakan sufiks versi (v1, v2, FINAL) untuk menghindari penggunaan dokumen lama yang usang.</li>
                                <li><strong>Metadata:</strong> Isi kolom keterangan pada sistem manajemen aset untuk memudahkan identifikasi tanpa membuka file.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <FolderTree className="h-4 w-4 text-emerald-600" /> Struktur Penyimpanan
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Penyimpanan Terpusat:</strong> Simpan semua dokumen kerja di Shared Drive perusahaan, jangan hanya di lokal PC.</li>
                                <li><strong>Hierarki Logis:</strong> Susun folder berdasarkan fungsi atau tahun untuk mempercepat navigasi.</li>
                                <li><strong>Keamanan Akses:</strong> Pastikan folder sensitif hanya dibagikan kepada personil yang memiliki otorisasi.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Search className="h-4 w-4 text-amber-600" /> Optimasi Pencarian
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Keyword Unik:</strong> Gunakan kode aset atau nomor tiket helpdesk untuk mencari riwayat pengerjaan secara instan.</li>
                                <li><strong>Filter Sistem:</strong> Manfaatkan filter Departemen dan Kategori pada aplikasi untuk mempersempit hasil pencarian.</li>
                                <li><strong>Tagging:</strong> Gunakan tag atau catatan pada sistem inventaris untuk mencari barang dengan spesifikasi khusus.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <CheckCircle2 className="h-4 w-4 text-rose-600" /> Digitalisasi & Audit
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Paperless Office:</strong> Prioritaskan pengisian form digital (seperti Form 0-32-028) untuk meminimalkan tumpukan kertas.</li>
                                <li><strong>Akses Kapanpun:</strong> Dokumen digital yang tersimpan di sistem dapat diakses secara remote saat dibutuhkan untuk audit mendadak.</li>
                                <li><strong>Validasi Tanda Tangan:</strong> Gunakan fitur e-signature untuk mempercepat alur persetujuan tanpa menunggu tanda tangan basah.</li>
                            </ul>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 8: PENGAWASAN KESELAMATAN */}
            <AccordionItem value="item-safety-oversight" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6 text-left">
                <div className="flex items-center gap-3 text-left">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <span>8. PENGAWASAN KESELAMATAN</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-safety-oversight" className="space-y-6 text-left text-black">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('8. Pengawasan Keselamatan', 'print-safety-oversight')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed mb-4 text-left">
                        Pengawasan Keselamatan: Fokus pada pengawasan, pemeriksaan, dan memastikan kondisi yang aman di area pabrik.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-black">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Activity className="h-4 w-4 text-blue-600" /> Pengawasan Aktif
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Kepatuhan APD:</strong> Memastikan seluruh personil menggunakan perlengkapan keselamatan (Helm, Sepatu safety, Masker) sesuai standar area.</li>
                                <li><strong>Observasi Perilaku:</strong> Mengawasi tindakan tidak aman saat mengoperasikan mesin atau alat berat.</li>
                                <li><strong>Pengecekan Izin Kerja:</strong> Memverifikasi izin kerja (*Work Permit*) untuk kontraktor atau pengerjaan risiko tinggi.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Inspeksi Fasilitas
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Peralatan Darurat:</strong> Pemeriksaan rutin kondisi APAR, kotak P3K, dan kebersihan jalur evakuasi (bebas hambatan).</li>
                                <li><strong>Sistem Proteksi:</strong> Memastikan sensor alarm dan sistem pemadam otomatis berfungsi dengan baik.</li>
                                <li><strong>Infrastruktur:</strong> Melakukan pengecekan berkala terhadap lantai licin, tangga yang longgar, atau atap bocor.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Shield className="h-4 w-4 text-amber-600" /> Keamanan Area Pabrik
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Zonasi Bahaya:</strong> Memastikan rambu-rambu peringatan bahaya listrik, bahan kimia, atau kebisingan terlihat jelas.</li>
                                <li><strong>Housekeeping:</strong> Menerapkan standar 5S untuk menjaga kerapian area agar mengurangi risiko tersandung atau jatuh.</li>
                                <li><strong>Pengendalian Akses:</strong> Memastikan hanya personil berwenang yang berada di area mesin utama.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <AlertTriangle className="h-4 w-4 text-rose-600" /> Pelaporan & Respon
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Near-Miss Reporting:</strong> Wajib melaporkan kejadian nyaris celaka sebagai bahan evaluasi pencegahan.</li>
                                <li><strong>Tombol Darurat:</strong> Setiap karyawan wajib mengetahui lokasi tombol <em>Emergency Stop</em> pada mesin di areanya.</li>
                                <li><strong>Komunikasi Bahaya:</strong> Segera lapor ke pengawas jika ditemukan bau bahan kimia menyengat atau kebocoran pipa.</li>
                            </ul>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 9: MANAJEMEN ASET */}
            <AccordionItem value="item-asset-management" className="border-none rounded-[2rem] px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-900 dark:text-white hover:no-underline py-6 text-left">
                <div className="flex items-center gap-3 text-left">
                    <Tags className="h-6 w-6 text-primary" />
                    <span>9. MANAJEMEN ASET</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-asset-management" className="space-y-6 text-left text-black">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('9. Manajemen Aset', 'print-asset-management')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Materi
                        </Button>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed mb-4 text-left">
                        Manajemen Aset: Memastikan proses manajemen dan pemeliharaan aset perusahaan mematuhi standar yang ditetapkan.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-black">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <ShieldCheck className="h-4 w-4 text-blue-600" /> Tata Kelola & Kepatuhan
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Verifikasi Data:</strong> Memastikan seluruh informasi aset (Merek, S/N, Lokasi) sesuai dengan data fisik di lapangan.</li>
                                <li><strong>SOP Pendaftaran:</strong> Setiap aset baru wajib didaftarkan melalui sistem oleh Admin atau user berwenang sebelum digunakan.</li>
                                <li><strong>Audit Akuntansi:</strong> Memelihara data valuasi dan penyusutan agar laporan keuangan perusahaan tetap akurat.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <QrCode className="h-4 w-4 text-emerald-600" /> Identifikasi & Pelabelan
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Label QR/NFC:</strong> Setiap aset wajib memiliki label verifikasi yang terbaca jelas untuk validasi instan via perangkat mobile.</li>
                                <li><strong>Pusat Biaya (Cost Center):</strong> Menghubungkan setiap unit aset dengan departemen penanggung jawab yang benar.</li>
                                <li><strong>Dokumentasi Foto:</strong> Wajib melampirkan foto fisik aset saat pendaftaran untuk keperluan audit ISO.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <Wrench className="h-4 w-4 text-amber-600" /> Siklus Pemeliharaan
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Maintenance Preventif:</strong> Melaksanakan pengecekan rutin sesuai jadwal sistem untuk mencegah kerusakan total.</li>
                                <li><strong>Log Perbaikan:</strong> Mencatat setiap pengerjaan teknis agar riwayat kesehatan aset terpantau secara transparan.</li>
                                <li><strong>Ketersediaan Part:</strong> Sinkronisasi dengan sistem inventaris saat melakukan penggantian suku cadang aset.</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white text-left">
                                <History className="h-4 w-4 text-rose-600" /> Mutasi & Disposal
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400 text-left">
                                <li><strong>Alur Mutasi:</strong> Setiap perpindahan aset antar departemen wajib disetujui oleh unit pengirim dan unit penerima di sistem.</li>
                                <li><strong>Penghapusan (Disposal):</strong> Aset yang rusak permanen wajib diajukan disposal dengan bukti foto serah terima/pemusnahan.</li>
                                <li><strong>History Tracking:</strong> Memantau jejak audit siapa yang bertanggung jawab atas aset pada periode tertentu.</li>
                            </ul>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION: ALUR PELAPORAN IT */}
            <AccordionItem value="item-helpdesk-flow" className="border-none rounded-[2rem] px-6 bg-primary/5 border-2 border-primary/10">
              <AccordionTrigger className="text-xl font-black uppercase text-primary hover:no-underline py-6 text-left">
                <div className="flex items-center gap-3 text-left">
                    <History className="h-6 w-6" />
                    <span>ALUR PELAPORAN IT & FORM RESMI</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-8 text-left">
                <div id="print-helpdesk-flow" className="space-y-6 text-left text-black">
                  <div className="flex justify-end no-print">
                      <Button variant="outline" size="sm" onClick={() => handlePrintSection('Alur Pelaporan IT', 'print-helpdesk-flow')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                          <Printer className="h-3 w-3 mr-2" /> Cetak Alur
                      </Button>
                  </div>
                  <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm text-left text-black">
                    <h3 className="text-lg font-black uppercase mb-3 flex items-center gap-2 text-slate-900 dark:text-white text-left">
                        <span className="flex h-7 w-7 items-center justify-center bg-primary text-white rounded-full text-xs shrink-0">1</span>
                        Tahap 1: Lapor Kendala (IT Helpdesk)
                    </h3>
                    <ul className="list-disc pl-6 space-y-2 font-medium text-slate-700 dark:text-slate-300 text-left">
                      <li>Buka menu <strong>IT Helpdesk</strong> dan klik tombol <strong>"Lapor Masalah Baru"</strong>.</li>
                      <li>Pilih Kategori dan Tingkat Urgensi. Tulis deskripsi masalah secara mendetail.</li>
                      <li><strong>Fitur Cepat:</strong> Anda bisa langsung menempelkan (Ctrl+V) <strong>Screenshot</strong> error ke dalam form.</li>
                      <li>Klik <strong>Kirim Laporan</strong>. Anda akan menerima Nomor Tiket otomatis.</li>
                    </ul>
                  </section>

                  <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm text-left text-black">
                    <h3 className="text-lg font-black uppercase mb-3 flex items-center gap-2 text-slate-900 dark:text-white text-left">
                        <span className="flex h-7 w-7 items-center justify-center bg-primary text-white rounded-full text-xs shrink-0">2</span>
                        Tahap 2: Komunikasi & Progres
                    </h3>
                    <ul className="list-disc pl-6 space-y-2 font-medium text-slate-700 dark:text-slate-300 text-left">
                      <li>Tim IT akan merespon laporan Anda. Status tiket berubah menjadi <strong>Diproses</strong>.</li>
                      <li>Gunakan fitur <strong>Chat</strong> di dalam tiket untuk berdiskusi dengan teknisi.</li>
                      <li>Anda juga bisa mengirimkan lampiran gambar tambahan di kolom chat dengan fitur <strong>Paste</strong>.</li>
                    </ul>
                  </section>

                  <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm text-left text-black">
                    <h3 className="text-lg font-black uppercase mb-3 flex items-center gap-2 text-slate-900 dark:text-white text-left">
                        <span className="flex h-7 w-7 items-center justify-center bg-primary text-white rounded-full text-xs shrink-0">3</span>
                        Tahap 3: Pengisian Form Resmi (0-32-028)
                    </h3>
                    <p className="mb-3 text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full w-fit">Wajib untuk Administrasi & Audit</p>
                    <ul className="list-disc pl-6 space-y-2 font-medium text-slate-700 dark:text-slate-300 text-left">
                      <li>Setelah selesai, klik tombol <strong>"Lengkapi Form Resmi (0-32-028)"</strong> di detail tiket.</li>
                      <li>Data masalah terisi otomatis. Isi detail teknis pada tabel (PO No, Sebelum/Sesudah).</li>
                      <li>
                        <strong>Tanda Tangan Digital:</strong> Berikan tanda tangan pada kolom yang tersedia. 
                        <em> (Tanda tangan yang sudah diisi harus di-Kunci & Simpan).</em>
                      </li>
                    </ul>
                  </section>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION: TANDA TANGAN DIGITAL */}
            <AccordionItem value="item-signature" className="border-b border-slate-100 rounded-2xl px-6">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-800 dark:text-slate-100 hover:no-underline text-left">
                <div className="flex items-center gap-3 text-left">
                    <Pencil className="h-6 w-6 text-slate-400" />
                    <span>PANDUAN TANDA TANGAN DIGITAL</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-6 text-left">
                <div id="print-signature-guide" className="space-y-6 mt-4 text-left text-black">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('Panduan Tanda Tangan Digital', 'print-signature-guide')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Panduan
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <section className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-xs uppercase text-blue-700 dark:text-blue-400 mb-2 text-left">
                                <Wrench className="h-4 w-4" /> 1. Maintenance & Servis
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                                Tanda tangan ini bersifat penyelesaian tugas teknis. Klik item pada daftar jadwal pemeliharaan, ekspansi rinciannya, lalu klik tombol <strong>"Selesaikan & Tanda Tangan"</strong>.
                            </p>
                        </section>
                        <section className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/50 text-left text-black">
                            <h4 className="flex items-center gap-2 font-black text-xs uppercase text-emerald-700 dark:text-emerald-400 mb-2 text-left">
                                <FileSignature className="h-4 w-4" /> 2. Audit (Stock Opname)
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                                Digunakan untuk pengesahan lembar pemeriksaan fisik massal. Buka menu <strong>"Audit Aset Umum"</strong>, pilih departemen, lalu temukan <strong>kolom tanda tangan digital</strong> di bawah.
                            </p>
                        </section>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION: DASHBOARD */}
            <AccordionItem value="item-dashboard" className="border-b border-slate-100 rounded-2xl px-6">
              <AccordionTrigger className="text-xl font-black uppercase text-slate-800 dark:text-slate-100 hover:no-underline text-left">
                <div className="flex items-center gap-3 text-left">
                    <LayoutDashboard className="h-6 w-6 text-slate-400" />
                    <span>Dashboard Kendali</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pt-2 pb-6 text-left">
                <div id="print-dashboard-guide" className="space-y-6 text-left text-black">
                    <div className="flex justify-end no-print">
                        <Button variant="outline" size="sm" onClick={() => handlePrintSection('Dashboard Kendali', 'print-dashboard-guide')} className="rounded-full font-bold h-8 border-primary/20 text-primary hover:bg-primary/5">
                            <Printer className="h-3 w-3 mr-2" /> Cetak Info
                        </Button>
                    </div>
                    <p className="font-medium text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                        Dashboard memberikan pandangan helikopter terhadap seluruh ekosistem aset di departemen Anda secara real-time.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-left">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border text-left text-black">
                            <h4 className="font-black text-[10px] uppercase text-primary mb-2 text-left">Ringkasan Statistik</h4>
                            <ul className="text-sm space-y-1 font-bold text-slate-700 dark:text-slate-300 list-none p-0 text-left">
                                <li>• Total Unit & Valuasi Aset (IDR/USD)</li>
                                <li>• Indikator Aset Rusak & Perlu Perbaikan</li>
                                <li>• Status Antrean Helpdesk</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border text-left text-black">
                            <h4 className="font-black text-[10px] uppercase text-primary mb-2 text-left">Analisis Visual</h4>
                            <ul className="text-sm space-y-1 font-bold text-slate-700 dark:text-slate-300 list-none p-0 text-left">
                                <li>• Grafik Distribusi Kategori Aset</li>
                                <li>• Persentase Kesiapan Operasional</li>
                                <li>• Log Aktivitas Terbaru (Audit Trail)</li>
                            </ul>
                        </div>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
        <CardFooter className="p-8 sm:p-12 bg-slate-50/50 dark:bg-slate-800/50 border-t flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
            <div className="flex items-center gap-3 opacity-50 grayscale text-left">
                <Info className="h-5 w-5" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-left">Asset Management System v1.2 • PT. CGI</p>
            </div>
            <p className="text-[10px] font-medium text-slate-400 italic text-left">Hubungi Departemen IT jika Anda memerlukan bantuan lebih lanjut.</p>
        </CardFooter>
      </Card>
    </div>
  );
}