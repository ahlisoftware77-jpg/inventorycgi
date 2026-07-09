
'use client';

import { useRef } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function MutationFormPage() {
    const formRef = useRef<HTMLDivElement>(null);

    const formHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <title>FORM PEMBERITAHUAN MUTASI DAN ASSET</title>
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
        padding: 15mm;
        box-sizing: border-box;
        border: 1px solid #000;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      td, th {
        border: 1px solid #000;
        padding: 6px;
        vertical-align: top;
        text-align: left;
        font-size: 11pt;
      }
      .header-table, .header-table td {
        border: none;
        padding: 0;
        margin-bottom: 10px;
      }
      .header-main {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
      }
      .header-sub {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .checkbox-label {
        display: inline-flex;
        align-items: center;
        margin-right: 15px;
      }
      .checkbox {
        width: 16px;
        height: 16px;
        border: 1px solid #000;
        margin-right: 5px;
        display: inline-block;
      }
      .signature-box {
        height: 60px;
      }
      .no-border, .no-border td {
          border: none;
      }
      .th-center {
        text-align: center;
        font-weight: bold;
      }
      .label-cell {
          width: 18%;
      }
    </style>
    </head>
    <body>
    <div class="page">
        <table class="header-table">
            <tr><td class="header-main">PT. CHINA GLAZE INDONESIA</td></tr>
            <tr><td class="header-sub">不動產、廠房及設備異動單</td></tr>
            <tr><td class="header-sub" style="padding-bottom: 10px;">FORM PEMBERITAHUAN MUTASI DAN ASSET</td></tr>
        </table>

        <table class="header-table" style="margin-bottom: 10px;">
            <tr>
                <td>單位 Satuan :</td>
                <td class="text-right">Tgl ____ Bulan ____ Tahun ____</td>
            </tr>
        </table>
      
        <table>
            <thead>
                <tr>
                    <td class="label-cell" style="vertical-align: middle; text-align: center;">原因 Alasan</td>
                    <td colspan="4" style="text-align: center;">
                        <div class="checkbox-label"><div class="checkbox"></div> 合併 Gabung</div>
                        <div class="checkbox-label"><div class="checkbox"></div> 分割 Split</div>
                        <div class="checkbox-label"><div class="checkbox"></div> 其他 Lain __________</div>
                    </td>
                </tr>
                <tr>
                    <th class="th-center label-cell">項目 Item</th>
                    <th class="th-center" colspan="2" style="width: 41%;">異動前 Sebelum Mutasi</th>
                    <th class="th-center" colspan="2" style="width: 41%;">異動後 Sesudah Mutasi</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="text-align: center;">財產名稱 Nama Barang</td>
                    <td colspan="2"></td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td style="text-align: center;">財產編號 No.Fix Asset</td>
                    <td colspan="2"></td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td style="text-align: center;">保管單位 Satuan</td>
                    <td colspan="2"></td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td style="text-align: center;">存放地點 Ditempatkan</td>
                    <td colspan="2"></td>
                    <td colspan="2"></td>
                </tr>
                 <tr>
                    <td style="height: 80px; text-align: center; vertical-align: middle;">備註 Keterangan</td>
                    <td colspan="4"></td>
                </tr>
                <tr>
                    <td rowspan="2" class="text-center" style="vertical-align: middle;">單位保管人<br>Kustodian Satuan</td>
                    <td class="text-center">主管 Atasan</td>
                    <td class="text-center">保管人 Yg merawat</td>
                    <td class="text-center">主管 Atasan</td>
                    <td class="text-center">保管人 Yg merawat</td>
                </tr>
                <tr>
                    <td class="signature-box"></td>
                    <td class="signature-box"></td>
                    <td class="signature-box"></td>
                    <td class="signature-box"></td>
                </tr>
                <tr>
                    <td style="text-align: center; vertical-align: middle;">主管單位簽核<br>Pihak berwenang menandatangani</td>
                    <td colspan="4"></td>
                </tr>
            </tbody>
        </table>
      <div style="text-align:right; font-size:10px; margin-top:5px;">
        表號: 0-32-026
      </div>
    </div>
    </body>
    </html>
    `;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=1123,height=794'); // A4 landscape size
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
                            <CardTitle>Formulir Pemberitahuan Mutasi</CardTitle>
                            <CardDescription>
                                Ini adalah pratinjau formulir untuk pemberitahuan mutasi aset.
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
