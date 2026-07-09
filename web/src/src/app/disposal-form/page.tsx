
'use client';

import { useRef } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function DisposalFormPage() {
    const formRef = useRef<HTMLDivElement>(null);

    const formHtml = `
    <!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>FORM DISPOSAL ASET</title>
<style>
  @media print {
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
    }
    .page {
      border: none !important;
      transform: scale(1) !important;
    }
  }
  body {
    font-family: 'BiauKai', Arial, sans-serif;
    font-size: 11pt;
  }
  .page {
    width: 297mm;
    height: 210mm;
    margin: auto;
    padding: 10mm;
    box-sizing: border-box;
    border: 1px solid #000;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td, th {
    border: 1px solid #000;
    padding: 4px;
    vertical-align: top; 
    text-align: center;
  }
  .header {
    text-align: center;
    font-weight: bold;
    border: none;
  }
  .header-main {
      font-size: 16pt;
  }
  .header-sub {
      font-size: 14pt;
  }
  .no-border, .no-border td, .no-border th {
      border: none;
      padding: 0;
  }
  .text-center {
      text-align: center;
  }
  .text-right {
      text-align: right;
  }
  .font-sm {
      font-size: 10pt;
  }
  .label {
      font-weight: bold;
  }
  .signature-box {
      height: 60px;
  }
  .footer-notes {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      margin-top: 5px;
      padding: 0 10px;
  }
  .footer-notes span {
    text-align: center;
    flex: 1;
  }
  .nested-table { width: 100%; height: 100%; }
  .nested-table td { border: none; text-align: left; vertical-align: top; padding: 1px 4px; }
  .nested-table td:first-child { width: auto; white-space: nowrap; }
</style>
</head>
<body>
<div class="page">
  <table style="border: none; margin-bottom: 10px;">
    <tr class="no-border">
        <td class="header header-main" colspan="3">PT. CHINA GLAZE INDONESIA</td>
    </tr>
    <tr class="no-border">
        <td class="header header-sub" colspan="3">不動產/廠房及設備處理申請單</td>
    </tr>
     <tr class="no-border">
        <td class="header header-sub" colspan="3">FORM DISPOSAL ASET BANGUNAN, PABRIK, DAN MESIN</td>
    </tr>
    <tr class="no-border" style="font-size: 10pt;">
        <td style="width: 33.33%; text-align: left;">單位Bagian: ____________________</td>
        <td style="width: 33.33%;" class="text-center">____日/DD ____月/MM ____年/YYYY</td>
        <td style="width: 33.34%;" class="text-right">表號: 0-32-025</td>
    </tr>
  </table>

  <table>
    <thead>
        <tr>
            <th class="text-center" colspan="4">(保管單位填) <br> diisi Unit User</th>
            <th class="text-center" colspan="2">(財務部填) <br> diisi Unit F&A</th>
            <th class="text-center" colspan="4">(主管單位填) <br> diisi Unit Manager</th>
            <th class="text-center" colspan="2">核 准 <br> Persetujuan</th>
        </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="4" style="height: 30px; padding: 0;">
            <table class="nested-table">
                <tr><td>名稱 Nama:</td><td></td></tr>
            </table>
        </td>
        <td colspan="2" rowspan="2" style="height: 30px; text-align: center; padding: 0;">
             <table class="nested-table" style="border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #000;"><td style="text-align: center;">購入金額 Harga beli</td></tr>
                <tr><td>&nbsp;</td></tr>
            </table>
        </td>
        <td colspan="4" style="height: 30px; padding: 0;">
            <table class="nested-table">
                <tr><td style="white-space: nowrap; text-align: center;">購入日期 Tgl pembelian:</td><td></td></tr>
            </table>
        </td>
        <td colspan="2" rowspan="6"></td>
      </tr>
      <tr>
        <td colspan="4" style="height: 30px; padding: 0;">
            <table class="nested-table">
                <tr><td>編號 Nomor:</td><td></td></tr>
            </table>
        </td>
        <td colspan="4" rowspan="10" style="height: 30px; padding: 0;">
            <table class="nested-table">
                <tr><td style="text-align: center;">處理方式 Metode disposal:</td><td></td></tr>
            </table>
        </td>
      </tr>
      <tr>
        <td colspan="4" rowspan="8" style="padding: 0;">
            <table class="nested-table">
                <tr><td>原因 Alasan:</td><td></td></tr>
            </table>
        </td>
        <td colspan="2" style="height: 30px; text-align: center; padding: 0;">
             <table class="nested-table">
                <tr><td style="text-align: center;">耐用年限 Masa guna</td></tr>
                <tr><td></td></tr>
            </table>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="height: 30px; text-align: center;"></td>
      </tr>
      <tr>
        <td colspan="2" rowspan="2" style="height: 30px; text-align: center; padding: 0;">
             <table class="nested-table">
                <tr><td style="text-align: center;">已提列折舊金額<br>Nilai depresiasi</td></tr>
                <tr><td></td></tr>
            </table>
        </td>
      </tr>
      <tr>
      </tr>
      <tr>
        <td colspan="2" rowspan="2" style="height: 30px; text-align: center;"></td>
        <td rowspan="2" colspan="2">備  註<br>Keterangan</td>
      </tr>
      <tr>
      </tr>
      <tr>
        <td colspan="2" style="height: 30px; text-align: center; padding: 0;">
             <table class="nested-table">
                <tr><td style="text-align: center;">殘值 Sisa nilai aset</td></tr>
                <tr><td></td></tr>
            </table>
        </td>
        <td colspan="2" rowspan="4"></td>
      </tr>
      <tr>
        <td colspan="2" style="height: 30px; text-align: center;"></td>
      </tr>
    </tbody>
    <tfoot>
        <tr>
            <th class="text-center">副 總 <br> Vice GM</th>
            <th class="text-center">經 理 <br> Manager</th>
            <th class="text-center">課 長 <br> Sec. Head</th>
            <th class="text-center">經 辦 <br> Pelaksana</th>

            <th class="text-center">經 理 <br> Manager</th>
            <th class="text-center">經 辦 <br> Pelaksana</th>

            <th class="text-center">副 總 <br> Vice GM</th>
            <th class="text-center">經 理 <br> Manager</th>
            <th class="text-center">課 長 <br> Sec. Head</th>
            <th class="text-center">經 辦 <br> Pelaksana</th>

            <td class="signature-box" colspan="2" rowspan="2"></td>
        </tr>
        <tr>
            <td class="signature-box"></td>
            <td class="signature-box"></td>
            <td class="signature-box"></td>
            <td class="signature-box"></td>
            
            <td class="signature-box"></td>
            <td class="signature-box"></td>

            <td class="signature-box"></td>
            <td class="signature-box"></td>
            <td class="signature-box"></td>
            <td class="signature-box"></td>
        </tr>
    </tfoot>
  </table>

  <div class="footer-notes">
      <span>第一聯:主管單位存(白)<br>Lembar 1 disimpan unit Manager (putih),</span>
      <span>第二聯:財務部存(紅)<br>lembar 2 disimpan unit F&A (merah),</span>
      <span>第三聯:保管單位存(黃)<br>lembar 3 disimpan unit User (kuning)</span>
  </div>

</div>
</body>
</html>
    `;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=1123,height=794'); // A4 landscape
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
            <Card className="w-full max-w-7xl mx-auto">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Formulir Disposal Aset</CardTitle>
                            <CardDescription>
                                Ini adalah pratinjau formulir untuk proses disposal aset.
                            </CardDescription>
                        </div>
                        <Button onClick={handlePrint} variant="outline">
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak Form
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div ref={formRef} dangerouslySetInnerHTML={{ __html: formHtml.replace('<div class="page">', '<div class="page" style="transform: scale(0.85); transform-origin: top left;">') }} />
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
