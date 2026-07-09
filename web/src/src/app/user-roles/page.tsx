
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function UserRolesPage() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Penjelasan Hak Akses Pengguna</CardTitle>
          <CardDescription>
            Rincian hak akses dan tanggung jawab untuk setiap peran pengguna dalam Sistem Manajemen Aset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xl">1. Peran: Admin</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base">
                <p className="lead">
                  Peran <strong>Admin</strong> dirancang untuk memiliki kontrol penuh dan visibilitas total atas seluruh sistem manajemen aset. Mereka bertindak sebagai supervisor sistem.
                </p>
                
                <h4 className="font-semibold mt-4">Kemampuan Utama:</h4>
                <ol className="list-decimal pl-6 space-y-3">
                  <li>
                    <strong>Visibilitas Data Tanpa Batas</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Admin dapat melihat <strong>semua data</strong> di seluruh perusahaan tanpa batasan departemen.</li>
                      <li><strong>Dasbor & Halaman Aset</strong>: Melihat ringkasan dan daftar semua aset perusahaan, termasuk aset yang sudah dihapus (`approved_disposal`) yang disembunyikan dari pengguna lain.</li>
                      <li><strong>Halaman Mutasi & Disposal</strong>: Akses penuh ke semua tab ("Daftar Tunggu", "Diajukan", "Riwayat") dan dapat melihat setiap pengajuan dari dan untuk semua departemen.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Manajemen Pengguna (Fitur Khusus Admin)</strong>
                     <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Halaman "Manajemen User" adalah area yang <strong>hanya bisa diakses oleh Admin</strong>.</li>
                        <li><strong>Menyetujui Pendaftaran Baru</strong>: Hanya Admin yang bisa menyetujui pendaftaran baru (yang berstatus "Pending") agar pengguna bisa masuk ke sistem.</li>
                        <li><strong>Mengubah Peran Pengguna</strong>: Dapat mengubah peran pengguna lain menjadi `Admin`, `Karyawan`, atau `User`.</li>
                        <li><strong>Menghapus Pengguna</strong>: Dapat menghapus data pengguna dari sistem.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Hak Aksi Penuh</strong>
                     <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Admin dapat melakukan semua tindakan pada aset tanpa batasan departemen.</li>
                        <li><strong>Menambah & Mengedit Aset</strong>: Bebas menambah aset baru dan mengedit informasi aset manapun.</li>
                        <li><strong>Menyetujui & Menolak Pengajuan</strong>: Otoritas tertinggi untuk menyetujui atau menolak <strong>semua</strong> pengajuan mutasi dan disposal.</li>
                    </ul>
                  </li>
                   <li>
                    <strong>Notifikasi Global</strong>
                     <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Sistem secara proaktif memberitahu Admin tentang peristiwa penting.</li>
                        <li><strong>Pendaftaran Baru</strong>: Notifikasi langsung saat ada pengguna baru yang mendaftar.</li>
                        <li><strong>Pengajuan Baru</strong>: Notifikasi langsung saat ada aset yang diajukan untuk mutasi atau disposal.</li>
                    </ul>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-xl">2. Peran: Karyawan</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base">
                <p className="lead">
                  Peran <strong>Karyawan</strong> dirancang sebagai pengguna utama yang bertanggung jawab atas aset di departemennya. Mereka memiliki hak akses yang lebih luas daripada "User" biasa.
                </p>

                <h4 className="font-semibold mt-4">Kemampuan Utama:</h4>
                <ol className="list-decimal pl-6 space-y-3">
                  <li>
                    <strong>Visibilitas Aset Berbasis Departemen</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Seorang Karyawan hanya dapat melihat dan mengelola aset yang relevan dengan departemennya.</li>
                      <li><strong>Dasbor & Halaman Aset</strong>: Tampilan dasbor dan daftar aset secara otomatis tersaring berdasarkan lokasi yang sesuai dengan departemen Karyawan.</li>
                      <li><strong>Aset Tersembunyi</strong>: Tidak dapat melihat aset yang statusnya sudah `approved_disposal`.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Inisiasi Perubahan Aset</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Karyawan adalah peran utama yang dapat menginisiasi perubahan status atau lokasi aset.</li>
                      <li><strong>Menambah Aset</strong>: Memiliki izin untuk menambahkan aset baru ke dalam sistem.</li>
                      <li><strong>Mengedit Aset</strong>: Dapat mengedit informasi aset yang berada di dalam lingkup departemennya.</li>
                      <li><strong>Mengajukan Mutasi & Disposal</strong>: Dapat mengirimkan pengajuan untuk memindahkan atau menghapus aset, yang akan masuk ke "Daftar Tunggu".</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Hak Persetujuan Terbatas</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Karyawan memiliki wewenang untuk menyetujui pengajuan yang ditujukan ke departemennya.</li>
                      <li><strong>Menyetujui Pengajuan Masuk</strong>: Pada halaman "Mutasi & Disposal", Karyawan dapat melihat, menyetujui, atau menolak pengajuan yang masuk untuk departemennya, mempercepat proses tanpa harus menunggu Admin.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Notifikasi Status Pengajuan</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Sistem akan memberitahu Karyawan tentang status pengajuan yang mereka buat.</li>
                      <li><strong>Update Status</strong>: Ketika pengajuan mereka disetujui atau ditolak, mereka akan menerima notifikasi.</li>
                    </ul>
                  </li>
                </ol>

                <p className="mt-4">
                  Singkatnya, peran <strong>Karyawan</strong> adalah <strong>penanggung jawab aset di tingkat departemen</strong> yang dapat mengelola aset harian, mengajukan perubahan, dan berpartisipasi dalam alur persetujuan.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-xl">3. Peran: Section Head / Manager</AccordionTrigger>
               <AccordionContent className="prose prose-sm max-w-none text-base">
                <p className="lead">
                  Peran <strong>Section Head</strong> dan <strong>Manager</strong> memiliki hak akses yang sama. Mereka berfungsi sebagai penyelia di tingkat departemen atau seksi dengan tanggung jawab yang lebih tinggi daripada Karyawan.
                </p>

                <h4 className="font-semibold mt-4">Kemampuan Utama:</h4>
                <p>Mereka memiliki semua kemampuan peran <strong>Karyawan</strong>, ditambah dengan wewenang berikut:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>
                        <strong>Persetujuan Tingkat Pertama</strong>: Dapat menyetujui pengajuan mutasi atau disposal yang berasal dari departemen di bawahnya. Setelah disetujui, pengajuan akan diteruskan ke Admin untuk persetujuan akhir.
                    </li>
                    <li>
                        <strong>Visibilitas Lebih Luas (Opsional)</strong>: Tergantung pada konfigurasi, seorang Manager mungkin dapat melihat aset dari beberapa departemen yang terkait.
                    </li>
                    <li>
                        <strong>Aksi Langsung</strong>: Dapat melakukan beberapa aksi seperti "Ubah Kondisi" aset secara langsung tanpa melalui alur pengajuan.
                    </li>
                </ul>
                 <p className="mt-4">
                  Peran ini bertindak sebagai filter dan lapisan persetujuan pertama sebelum sebuah pengajuan sampai ke tingkat Admin, memastikan validitas dan urgensi permintaan.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
