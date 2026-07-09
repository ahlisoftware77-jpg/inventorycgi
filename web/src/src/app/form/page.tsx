
'use client';

import { useRef } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function FormPage() {
    const formRef = useRef<HTMLDivElement>(null);

    const formHtml = `
    <!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Form FIX ASSET</title>
<style>
  @media print {
    @page {
      size: 215.9mm 160mm;
      margin: 2mm;
    }
    body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
    }
    .page {
      border: none !important;
      page-break-after: always;
      transform: scale(1) !important;
      margin: 0;
      padding: 8mm;
    }
  }
  body {
    font-family: 'BiauKai', Arial, sans-serif;
    margin: 0;
    padding: 0;
  }
  .page {
    width: 215.9mm;
    height: 160mm;
    margin: auto;
    padding: 8mm;
    box-sizing: border-box;
    border: 1px solid #000;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  td {
    border: 1px solid #000;
    vertical-align: middle;
    font-size: 11px;
    padding: 2px 4px;
    text-align: center;
    height: 15px;
  }
  .title { text-align: center; font-weight: bold; font-size: 16px; }
  .subtitle { text-align: center; font-size: 12px; }
  .formtitle { text-align: center; font-weight: bold; font-size: 14px; }
  .input { 
    text-align: center; 
    font-size: 11px; 
    vertical-align: middle; 
    font-weight: bold;
    height: 100%;
  }
  .spec { height: 15mm; }
  .no-border, .no-border td { border: none !important; }
  .header-label {
    text-align: left;
    vertical-align: bottom;
    border: none;
    font-size: 10px;
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <table class="no-border" style="width:100%; margin-bottom:4px;">
    <tr>
      <td class="title" style="font-weight:bold; font-size:16px;">PT. CHINA GLAZE INDONESIA</td>
    </tr>
    <tr>
      <td style="text-align:center; font-size:12px;">
        不動產、廠房及設備保管卡 <span style="font-weight:bold; font-size:14px;">FORM FIX ASSET</span>
      </td>
    </tr>
  </table>

  <!-- Main Table -->
  <table>
    <!-- Labels Row 1 -->
    <tr class="no-border">
      <td class="header-label" colspan="2">財產類別<br>Item Fix Asset</td>
      <td class="header-label" colspan="3">建卡日期<br>Tgl Input</td>
      <td colspan="4" style="text-align:right; vertical-align:bottom; font-size:9px;">
        □ 正本 / Asli &nbsp;&nbsp; □ 副本 / Copy <br>
        □ 列帳 / FixA &nbsp;&nbsp; □ 列管 / FixB
      </td>
    </tr>
    <!-- Input Row 1 -->
    <tr>
      <td colspan="2" class="input"></td>
      <td class="input" style="width: 5%"></td>
      <td class="input" style="width: 5%"></td>
      <td class="input" style="width: 5%"></td>
      <td colspan="4" class="input" style="border:none;"></td>
    </tr>
    <!-- Main Content Rows -->
    <tr>
      <td>財產編號<br>No. Fix Asset</td>
      <td class="input" style="font-size: 10px;"></td>
      <td>財產名稱<br>Nama Barang</td>
      <td colspan="2" class="input"></td>
      <td>單位<br>Satuan</td>
      <td class="input"></td>
      <td>耐用年限<br>Ketahanan</td>
      <td class="input"></td>
    </tr>
    <tr>
      <td rowspan="3">規格<br>Spec Barang</td>
      <td rowspan="3" colspan="3" class="input" style="text-align: center; vertical-align: middle;"></td>
      <td colspan="5">憑單編號 No. Dokument</td>
    </tr>
    <tr>
      <td>工程單號<br><span style="font-size:9px;">No.Insp Proyek</span></td>
      <td class="input"></td>
      <td>工程驗收單<br><span style="font-size:8px;">Tgl Insp Proyek</span></td>
      <td colspan="2" class="input"></td>
    </tr>
    <tr>
      <td>請購單號<br><span style="font-size:9px;">No.PR</span></td>
      <td class="input"></td>
      <td>物料驗收單<br><span style="font-size:9px;">No.Insp</span></td>
      <td colspan="2" class="input"></td>
    </tr>
    <tr>
      <td>購入金額<br>Harga Barang</td>
      <td class="input"></td>
      <td>購入日期<br>Tgl Diterima</td>
      <td class="input"></td>
      <td>供應商<br>Supplier</td>
      <td class="input" style="font-size: 8px;"></td>
      <td>存放地點<br>Ditempatkan</td>
      <td colspan="2" class="input"></td>
    </tr>
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">附屬設備</td>
      <td colspan="4" class="input"></td>
      <td colspan="4" class="input"></td>
    </tr>
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">Kelengkapan</td>
      <td colspan="4" class="input"></td>
      <td colspan="4" class="input"></td>
    </tr>
     <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">Barang</td>
      <td colspan="4" class="input"></td>
      <td colspan="4" class="input"></td>
    </tr>
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">Lainnya</td>
      <td colspan="4" class="input"></td>
      <td colspan="4" class="input"></td>
    </tr>
    <tr>
      <td>主管<br>Atasan</td>
      <td colspan="2" class="input"></td>
      <td>保管人<br>Yg Merawat</td>
      <td class="input"></td>
      <td>主管<br>Atasan</td>
      <td class="input"></td>
      <td>建卡人<br>Dibuat</td>
      <td class="input"></td>
    </tr>
  </table>
  <!-- Teks 表號 di luar tabel -->
<div style="text-align:right; font-size:10px; margin-top:2mm;">
  表號:0-32-024
</div>
</div>
</body>
</html>
    `;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=815,height=605'); // approx 8.5in x 6.3in in pixels
        if (printWindow) {
            printWindow.document.write(formHtml);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };


    return (
        <DashboardLayout>
            <Card className="w-full max-w-5xl mx-auto">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Formulir Aset Tetap</CardTitle>
                            <CardDescription>
                                Ini adalah pratinjau formulir aset tetap (Form Fix Asset). Ukuran 8.5 x 6.3 inch.
                            </CardDescription>
                        </div>
                        <Button onClick={handlePrint} variant="outline">
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak Form
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div ref={formRef} dangerouslySetInnerHTML={{ __html: formHtml.replace('<div class="page">', '<div class="page" style="transform: scale(0.9); transform-origin: top left;">') }} />
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
