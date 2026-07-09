
'use client';

import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function HelpPage() {

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Panduan Penggunaan Aplikasi</CardTitle>
          <CardDescription>
            Berikut adalah alur proses kerja untuk setiap menu utama dalam aplikasi manajemen aset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">

            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xl font-semibold">1. Dasbor</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pl-4">
                <p>
                  Dasbor adalah halaman pertama yang Anda lihat setelah login. Halaman ini memberikan ringkasan visual dari semua data aset yang relevan dengan departemen Anda (atau seluruh perusahaan jika Anda Admin).
                </p>
                <ul>
                  <li><strong>Kartu Ringkasan:</strong> Di bagian atas, Anda akan melihat kartu-kartu yang menampilkan data kunci seperti:
                    <ul className="list-disc pl-6">
                      <li>Jumlah total aset (berdasarkan kuantitas).</li>
                      <li>Total nilai aset dalam IDR dan USD.</li>
                      <li>Jumlah aset yang sedang dalam status dipinjam.</li>
                      <li>Jumlah aset yang kondisinya rusak.</li>
                    </ul>
                  </li>
                  <li><strong>Grafik Distribusi:</strong> Anda akan melihat dua grafik utama:
                    <ul className="list-disc pl-6">
                      <li><strong>Distribusi per Kategori:</strong> Menampilkan pembagian aset berdasarkan kategorinya. Anda dapat mengklik salah satu batang kategori untuk langsung memfilter dan melihat daftar asetnya di halaman Aset.</li>
                      <li><strong>Distribusi per Status:</strong> Menampilkan pembagian aset berdasarkan statusnya saat ini (Aktif, Dipinjam, Rusak, dll.).</li>
                    </ul>
                  </li>
                  <li><strong>Aset Terbaru:</strong> Di bagian bawah, terdapat tabel yang menampilkan 5 aset terakhir yang ditambahkan ke sistem.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-xl font-semibold">2. Manajemen Aset</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pl-4">
                <p>
                  Menu Aset adalah pusat untuk semua aktivitas yang berkaitan dengan pengelolaan aset tetap perusahaan.
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li><strong>Melihat Daftar Aset:</strong> Halaman ini menampilkan tabel berisi semua aset yang dapat Anda akses. Admin dapat melihat semua aset, sementara pengguna lain hanya melihat aset yang relevan dengan departemennya.</li>
                  <li><strong>Mencari dan Memfilter:</strong> Gunakan kolom pencarian untuk menemukan aset berdasarkan nama atau kode. Gunakan juga filter berdasarkan Kategori, Status, Kondisi, dan Lokasi untuk mempersempit pencarian.</li>
                  <li><strong>Menambah Aset (untuk Admin/Manager/Karyawan):</strong> Klik tombol <strong>"Tambah Aset"</strong>. Isi formulir yang muncul dengan detail lengkap. Jika Anda bukan Admin, aset yang ditambahkan akan masuk ke alur persetujuan ("waiting_creation").</li>
                  <li><strong>Melihat Detail Aset:</strong> Klik pada nama aset di tabel untuk membuka halaman detail. Di sana Anda bisa melihat semua informasi, riwayat, dan melakukan berbagai aksi.</li>
                  <li><strong>Aksi pada Aset (dari Halaman Detail):</strong>
                    <ul className="list-disc pl-6">
                      <li><strong>Ajukan Mutasi:</strong> Untuk memindahkan aset ke lokasi atau pengguna lain.</li>
                      <li><strong>Ajukan Disposal:</strong> Untuk memulai proses penghapusan aset.</li>
                      <li><strong>Ubah Kondisi:</strong> Untuk mengubah kondisi aset (misalnya dari "Baik" menjadi "Perlu Perbaikan").</li>
                      <li><strong>Edit Aset (Admin):</strong> Admin dapat langsung mengedit semua detail aset.</li>
                    </ul>
                  </li>
                  <li><strong>Aksi Massal:</strong> Centang kotak di sebelah kiri setiap baris aset untuk memilih beberapa aset sekaligus. Setelah itu, Anda dapat melakukan aksi seperti:
                     <ul className="list-disc pl-6">
                        <li>Cetak Barcode atau QR Code.</li>
                        <li>Export data ke Excel.</li>
                        <li>Update data massal (khusus Admin).</li>
                    </ul>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-xl font-semibold">3. Manajemen Inventaris (ATK & Sparepart)</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pl-4">
                <p>
                  Menu ini digunakan untuk mengelola barang habis pakai seperti ATK, sparepart, dan alat kebersihan.
                </p>
                 <ol className="list-decimal pl-6 space-y-2">
                  <li><strong>Melihat Stok Barang:</strong> Halaman ini terbagi menjadi beberapa tab (ATK, Sparepart, Alat Kebersihan). Setiap tab menampilkan daftar barang, stok awal, barang keluar yang sedang diminta, dan sisa stok yang tersedia.</li>
                  <li><strong>Minta Barang:</strong>
                    <ul className="list-disc pl-6">
                        <li>Cari barang yang Anda butuhkan.</li>
                        <li>Klik tombol <strong>"Minta"</strong> pada baris barang tersebut.</li>
                        <li>Masukkan jumlah yang Anda inginkan di dialog yang muncul, lalu kirim.</li>
                    </ul>
                  </li>
                  <li><strong>Update Stok (Admin/HR & GA):</strong> Pengguna yang berwenang dapat memperbarui jumlah stok:
                    <ul className="list-disc pl-6">
                        <li>Klik tombol <strong>"Update"</strong>.</li>
                        <li>Pilih apakah barang "Masuk" atau "Keluar", masukkan jumlah, dan berikan catatan. Aksi ini akan langsung mengubah jumlah stok.</li>
                    </ul>
                  </li>
                   <li><strong>Tambah Barang Baru (Admin/HR & GA):</strong> Klik <strong>"Tambah Barang Baru"</strong> untuk menambahkan item inventaris baru ke sistem.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            
             <AccordionItem value="item-4">
              <AccordionTrigger className="text-xl font-semibold">4. Permintaan Barang</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pl-4">
                <p>
                  Halaman ini berfungsi sebagai pusat untuk alur kerja permintaan barang inventaris.
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                    <li><strong>Bagi Karyawan:</strong> Halaman ini akan menampilkan riwayat semua permintaan barang yang pernah Anda buat, beserta statusnya (Menunggu, Disetujui, Ditolak).</li>
                    <li><strong>Bagi Admin/HR & GA:</strong> Halaman ini menampilkan semua permintaan yang masuk dari seluruh departemen. Anda memiliki wewenang untuk:
                        <ul className="list-disc pl-6">
                            <li><strong>Menyetujui Permintaan:</strong> Klik tombol centang (✓). Stok barang akan otomatis berkurang.</li>
                            <li><strong>Menolak Permintaan:</strong> Klik tombol silang (X). Stok barang tidak akan berubah.</li>
                        </ul>
                    </li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-xl font-semibold">5. Mutasi & Disposal</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pl-4">
                 <p>
                  Halaman ini adalah pusat untuk mengelola alur persetujuan pemindahan (mutasi), penghapusan (disposal), atau perubahan kondisi aset.
                </p>
                <h3 className="font-semibold">Tab Daftar Tunggu</h3>
                <ul className="list-disc pl-6">
                  <li><strong>Bagi Admin:</strong> Menampilkan semua pengajuan dari seluruh departemen yang menunggu persetujuan akhir, termasuk yang sudah disetujui oleh Manajer. Admin dapat menyetujui atau menolak pengajuan ini.</li>
                  <li><strong>Bagi Manajer/Karyawan:</strong> Menampilkan pengajuan yang relevan untuk departemennya (pengajuan yang <strong>ditujukan ke</strong> departemennya atau yang <strong>berasal dari</strong> departemennya). Di sini, mereka dapat memberikan persetujuan awal dengan tombol <strong>"Proses"</strong>, yang kemudian akan meneruskannya ke Admin.</li>
                </ul>

                <h3 className="font-semibold mt-2">Tab Diajukan</h3>
                <ul className="list-disc pl-6">
                    <li>Menampilkan riwayat semua pengajuan yang pernah <strong>Anda buat</strong>, lengkap dengan status terakhirnya (misalnya: `waiting_mutasi`, `karyawan_approved`, `approved_mutasi`, atau `Aktif` jika ditolak).</li>
                </ul>

                <h3 className="font-semibold mt-2">Tab Riwayat (Mutasi, Disposal, Edit)</h3>
                <ul className="list-disc pl-6">
                  <li>Menampilkan daftar semua aset yang proses pengajuannya telah <strong>selesai disetujui</strong> oleh Admin.</li>
                  <li>Dari tab ini, Admin dapat memilih aset dan mencetak dokumen <strong>"Berita Acara"</strong>.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
             <AccordionItem value="item-6">
              <AccordionTrigger className="text-xl font-semibold">6. IT Helpdesk</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pl-4">
                 <p>
                  Gunakan menu ini untuk melaporkan dan melacak masalah teknis yang Anda hadapi.
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                    <li><strong>Membuat Laporan Baru:</strong>
                        <ul className="list-disc pl-6">
                            <li>Klik tombol <strong>"Lapor Masalah Baru"</strong>.</li>
                            <li>Pilih kategori masalah (Hardware, Software, Jaringan, dll.).</li>
                            <li>Tulis deskripsi masalah secara detail. Semakin detail, semakin cepat masalah dapat ditangani.</li>
                            <li>Anda dapat melampirkan foto (misalnya, screenshot error) untuk memperjelas laporan.</li>
                            <li>Klik <strong>"Kirim Laporan"</strong>.</li>
                        </ul>
                    </li>
                    <li><strong>Melacak Status Tiket:</strong>
                        <ul className="list-disc pl-6">
                            <li>Semua tiket yang Anda buat akan muncul di tabel utama.</li>
                             <li>Klik pada <strong>Nomor Tiket</strong> untuk melihat detail lengkap, termasuk riwayat progres dan catatan dari tim IT.</li>
                        </ul>
                    </li>
                     <li><strong>Untuk Tim IT/Admin:</strong>
                        <ul className="list-disc pl-6">
                            <li>Anda dapat melihat semua tiket yang masuk.</li>
                            <li>Masuk ke halaman detail tiket untuk mengubah status (dari "Menunggu" menjadi "Diproses" atau "Selesai") dan menambahkan catatan progres perbaikan.</li>
                        </ul>
                    </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-7">
              <AccordionTrigger className="text-xl font-semibold">7. Laporan Stok</AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none text-base pl-4">
                <p>
                  Halaman ini digunakan untuk membuat laporan rekapitulasi pergerakan stok barang inventaris (ATK, Sparepart, dll.) dalam periode bulanan.
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                    <li><strong>Pilih Periode:</strong> Pilih bulan dan tahun laporan yang ingin Anda buat.</li>
                    <li><strong>Pilih Tipe Barang:</strong> Tentukan tipe barang (ATK, Sparepart, atau Alat Kebersihan) yang ingin Anda lihat laporannya.</li>
                    <li><strong>Generate Laporan:</strong> Klik tombol <strong>"Generate Laporan"</strong>. Sistem akan menghitung dan menampilkan tabel yang berisi:
                        <ul className="list-disc pl-6">
                            <li><strong>Stok Awal:</strong> Jumlah stok di awal bulan.</li>
                            <li><strong>Masuk:</strong> Total barang yang masuk selama bulan tersebut.</li>
                            <li><strong>Keluar:</strong> Total barang yang keluar (berdasarkan permintaan yang disetujui) selama bulan tersebut.</li>
                            <li><strong>Stok Akhir:</strong> Jumlah stok di akhir bulan.</li>
                        </ul>
                    </li>
                    <li><strong>Export ke Excel:</strong> Setelah laporan ditampilkan, Anda dapat mengunduhnya dalam format file Excel dengan mengklik tombol <strong>"Export Excel"</strong>.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
