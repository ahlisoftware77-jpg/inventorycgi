'use client';

import { Button } from '@/components/ui/button';
import { type Asset } from '@/lib/types';
import { Printer } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface PrintAssetsButtonProps {
  selectedAssets: Asset[];
}

export default function PrintAssetsButton({ selectedAssets }: PrintAssetsButtonProps) {

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan.');
      return;
    }

    const formatDate = (timestamp: Timestamp | undefined | null) => {
      if (!timestamp) return '';
      try {
        return timestamp.toDate().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (error) {
        console.error("Error formatting date:", error);
        return '';
      }
    };

    let tableRows = selectedAssets.map((asset, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${asset.category || ''}</td>
        <td>${asset.name || ''}</td>
        <td>${asset.brand || ''}</td>
        <td>${asset.qty || ''}</td>
        <td>${asset.condition || ''}</td>
        <td></td>
        <td>${asset.code || ''}</td>
        <td></td>
        <td>${asset.user || ''}</td>
        <td>${formatDate(asset.purchaseDate)}</td>
        <td>${asset.notes || ''}</td>
      </tr>
    `).join('');

    // Fill remaining rows to make it 39
    for (let i = selectedAssets.length; i < 39; i++) {
        tableRows += `
            <tr>
                <td>${i + 1}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `;
    }

    const printContent = `
      <html>
        <head>
          <title>DAFTAR INVENTARIS</title>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 0.5in;
              }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 10pt;
            }
            .header-container {
              text-align: center;
              margin-bottom: 20px;
            }
            .header-title {
              font-weight: bold;
              font-size: 14pt;
              margin: 0;
            }
            .header-subtitle {
              font-weight: bold;
              font-size: 12pt;
              margin: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid black;
              padding: 5px;
              text-align: center;
              word-wrap: break-word;
            }
            th {
              font-weight: bold;
              text-align: center;
            }
            td {
               height: 20px;
            }
            .signature-section {
              margin-top: 20px;
              width: 100%;
              border-collapse: collapse;
            }
            .signature-section td {
              border: 1px solid black;
              text-align: center;
              vertical-align: top;
              padding: 5px;
              font-weight: bold;
            }
            .signature-box {
                height: 100px;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <p class="header-title">PT. CHINA GLAZE INDONESIA</p>
            <p class="header-subtitle">LIST ASSET</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 3%;">NO</th>
                <th style="width: 10%;">Kategori</th>
                <th style="width: 15%;">Nama Aset</th>
                <th style="width: 8%;">Brand</th>
                <th style="width: 3%;">Qty</th>
                <th style="width: 8%;">Kondisi</th>
                <th style="width: 10%;">ACCOUNTING SERIES NO.</th>
                <th style="width: 8%;">Kode Aset</th>
                <th style="width: 10%;">Nomor Peralihan asset management 2024</th>
                <th style="width: 8%;">USER</th>
                <th style="width: 7%;">Tanggal Pembelian</th>
                <th style="width: 10%;">REMARK</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <table class="signature-section">
            <tbody>
                <tr>
                    <td>Atasan</td>
                    <td>Yang Merawat</td>
                    <td>1st Cheker</td>
                    <td>2nd Cheker</td>
                    <td>Atasan</td>
                    <td>Dibuat</td>
                </tr>
                <tr>
                    <td class="signature-box"></td>
                    <td class="signature-box"></td>
                    <td class="signature-box"></td>
                    <td class="signature-box"></td>
                    <td class="signature-box"></td>
                    <td class="signature-box"></td>
                </tr>
            </tbody>
           </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <Button onClick={handlePrint} disabled={selectedAssets.length === 0} variant="secondary">
      <Printer className="mr-2 h-4 w-4" />
      Cetak Tabel B9
    </Button>
  );
}
