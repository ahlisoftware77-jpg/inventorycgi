
'use client';

import { Button } from '@/components/ui/button';
import { type Asset } from '@/lib/types';
import { Printer } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface PrintAssetsButtonAProps {
  selectedAssets: Asset[];
  children: React.ReactNode;
}

export default function PrintAssetsButtonA({ selectedAssets, children }: PrintAssetsButtonAProps) {

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
    
    const sortedAssets = [...selectedAssets].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const uniqueLocations = Array.from(new Set(sortedAssets.map(asset => asset.location))).join(', ');
    const deptTitle = `LIST ASSET A SERIES "${uniqueLocations || 'Dept'}"`;

    let tableRows = sortedAssets.map((asset, index) => {
      const midDate = formatDate(asset.midSemesterCheckDate);
      const endDate = formatDate(asset.endSemesterCheckDate);
      const updateDate = [midDate, endDate].filter(Boolean).join(' / ');

      return `
      <tr>
        <td>${index + 1}</td>
        <td>${asset.costCenter || ''}</td>
        <td>${asset.code || ''}</td>
        <td>${asset.name || ''}</td>
        <td>${asset.qty || ''}</td>
        <td>${asset.qty || ''}</td>
        <td></td>
        <td></td>
        <td>${updateDate}</td>
        <td>${asset.notes || ''}</td>
      </tr>
    `}).join('');

    for (let i = sortedAssets.length; i < 40; i++) {
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
            </tr>
        `;
    }

    const printContent = `
      <html>
        <head>
          <title>DAFTAR INVENTARIS A SERIES</title>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 0.5in;
              }
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 10pt;
            }
            .header-container {
              text-align: center;
              margin-bottom: 20px;
              font-weight: bold;
            }
            .header-title {
              font-size: 12pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid black;
              padding: 4px;
              text-align: center;
              word-wrap: break-word;
            }
            th {
              font-weight: bold;
              text-align: center;
            }
            td {
               height: 15px;
               font-size: 9pt;
            }
            .signature-section {
              margin-top: 10px;
              width: 100%;
              border-collapse: collapse;
            }
            .signature-section td {
              border: 1px solid black;
              text-align: center;
              vertical-align: top;
              padding: 5px;
              font-weight: bold;
              font-size: 9pt;
            }
            .signature-box {
                height: 80px;
            }
            .th-sub {
              font-weight: normal;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="header-title">PT. China Glaze Indonesia</div>
            <div class="header-title">${deptTitle}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 3%;">NO.</th>
                <th style="width: 8%;">COST CENTER</th>
                <th style="width: 12%;">FIXED ASSET NO. <br> <span class="th-sub">財產編號</span></th>
                <th style="width: 25%;">NAME <br> <span class="th-sub">名 稱</span></th>
                <th style="width: 10%;">Unit <br> <span class="th-sub">單位</span></th>
                <th style="width: 5%;">Qty</th>
                <th style="width: 7%;">1st Checker</th>
                <th style="width: 7%;">2nd Checker</th>
                <th style="width: 8%;">Tgl Update</th>
                <th style="width: 15%;">Remark</th>
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
                    <td>Yg Merawat</td>
                    <td>1st</td>
                    <td>2nd</td>
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
    <div onClick={handlePrint} className="w-full">
      {children}
    </div>
  );
}

    