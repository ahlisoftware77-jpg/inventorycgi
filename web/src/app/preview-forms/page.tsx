
'use client';

import { useRef, useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

export default function PreviewFormsPage() {
    const formAssetRef = useRef<HTMLDivElement>(null);
    const formMutationRef = useRef<HTMLDivElement>(null);
    const formDisposalRef = useRef<HTMLDivElement>(null);
    const formAuditRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sampleQrUrl, setSampleQrUrl] = useState<string>('');
    const { toast } = useToast();

    useEffect(() => {
        QRCode.toDataURL('CGI-SAMPLE', { margin: 1, width: 250 }).then(setSampleQrUrl);
    }, []);

    const formAssetHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <title>Form FIX ASSET</title>
    <style>
      @media print {
        @page { size: 215.9mm 160mm; margin: 2mm; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        .page { border: none !important; page-break-after: always; transform: scale(1) !important; margin: 0; padding: 8mm; }
      }
      body { font-family: 'BiauKai', Arial, sans-serif; margin: 0; padding: 0; }
      .page { width: 215.9mm; height: 160mm; margin: auto; padding: 8mm; box-sizing: border-box; border: 1px solid #000; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      td { border: 1px solid #000; vertical-align: middle; font-size: 12px; padding: 1px 3px; text-align: center; height: 14px; }
      .title { text-align: center; font-weight: bold; font-size: 17px; }
      .subtitle { text-align: center; font-size: 13px; }
      .formtitle { text-align: center; font-weight: bold; font-size: 15px; }
      .input { text-align: left; font-size: 12px; }
      .no-border td { border: none !important; }
      .label-cell { border: none; text-align: left; vertical-align: bottom; font-size: 11px; }
      .qr-container {
        width: 115px;
        height: 115px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .qr-container img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
    </style>
    </head>
    <body>
    <div class="page">
      <table class="no-border" style="width:100%; margin-bottom:4px;">
        <tr> <td class="title">PT. CHINA GLAZE INDONESIA</td> </tr>
        <tr> <td class="subtitle"> 不動產、廠房及設備保管卡 <span class="formtitle">FORM FIX ASSET</span> </td> </tr>
      </table>
      <table>
        <tr class="no-border">
          <td class="label-cell">財產類別<br>Item Fix Asset</td> <td colspan="2" class="input"></td>
          <td class="label-cell" style="padding-left: 10px;">建卡日期<br>Tgl Input</td>
          <td class="label-cell">Tgl</td> <td class="label-cell">Bulan</td> <td class="label-cell">Tahun</td>
          <td colspan="2" class="input" style="border-bottom: none !important; font-size:9px; vertical-align: bottom; text-align:right;">
            □ 正本 / Asli &nbsp;&nbsp; □ 副本 / Copy <br> □ 列帳 / FixA &nbsp;&nbsp; □ 列管 / FixB
          </td>
        </tr>
        <tr>
          <td>財產編號<br><br>No. Fix Asset</td> <td class="input" style="font-size: 10px;"></td>
          <td>財產名稱<br><br>Nama Barang</td> <td colspan="2" class="input"></td>
          <td>單位<br><br>Satuan</td> <td class="input"></td>
          <td>耐用年限<br><br>Ketahanan</td> <td class="input"></td>
        </tr>
        <tr>
          <td rowspan="3">規格<br><br>Spec Barang</td> <td rowspan="3" colspan="3" class="input">
            <div class="qr-container">
                ${sampleQrUrl ? `<img src="${sampleQrUrl}" alt="QR" />` : ''}
            </div>
          </td>
          <td colspan="5" style="vertical-align: middle;">憑單編號/No. Dokument</td>
        </tr>
        <tr>
          <td>工程單號<br><br><span style="font-size:9px;">No.Insp Proyek</span></td> <td class="input"></td>
          <td>工程驗收單<br><br><span style="font-size:8px;">Tgl Insp Proyek</span></td> <td colspan="2" class="input"></td>
        </tr>
        <tr>
          <td>請購單號<br><br><span style="font-size:9px;">No.PR</span></td> <td class="input"></td>
          <td>物料驗收單<br><br><span style="font-size:9px;">No.Insp</span></td> <td colspan="2" class="input"></td>
        </tr>
        <tr>
          <td>購入金額<br><br>Harga Barang</td> <td class="input"></td>
          <td>購入日期<br><br>Tgl Diterima</td> <td class="input"></td>
          <td>供應商<br><br>Supplier</td> <td class="input" style="font-size: 8px;"></td>
          <td>存放地點<br><br>Ditempatkan</td> <td colspan="2" class="input"></td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: middle; height: 25px;">附屬設備</td>
          <td colspan="4" class="input"></td> <td colspan="4" class="input"></td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: middle; height: 25px;">Kelengkapan</td>
          <td colspan="4" class="input"></td> <td colspan="4" class="input"></td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: middle; height: 25px;">Barang</td>
          <td colspan="4" class="input"></td> <td colspan="4" class="input"></td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: middle; height: 25px;">Lainnya</td>
          <td colspan="4" class="input"></td> <td colspan="4" class="input"></td>
        </tr>
        <tr>
          <td>主管<br><br>Atasan</td> <td colspan="2" class="input"></td>
          <td>保管人<br><br>Yg Merawat</td> <td class="input"></td>
          <td>主管<br><br>Atasan</td> <td class="input"></td>
          <td>建卡人<br><br>Dibuat</td> <td class="input"></td>
        </tr>
      </table>
      <div style="text-align:right; font-size:10px; margin-top:2mm;"> 表號:0-32-024 </div>
    </div>
    </body>
    </html>
    `;

    const formMutationHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <title>FORM PEMBERITAHUAN MUTASI DAN ASSET</title>
    <style>
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        .page { border: none !important; transform: scale(1) !important; }
      }
      body { font-family: 'BiauKai', Arial, sans-serif; font-size: 11pt; }
      .page { width: 297mm; height: 210mm; margin: auto; padding: 15mm; box-sizing: border-box; border: 1px solid #000; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      td, th { border: 1px solid #000; padding: 6px; vertical-align: top; text-align: left; font-size: 11pt; }
      .header-table, .header-table td { border: none; padding: 0; margin-bottom: 10px; }
      .header-main { text-align: center; font-size: 16pt; font-weight: bold; }
      .header-sub { text-align: center; font-size: 14pt; font-weight: bold; }
      .text-center { text-align: center; } .text-right { text-align: right; }
      .checkbox-label { display: inline-flex; align-items: center; margin-right: 15px; }
      .checkbox { width: 16px; height: 16px; border: 1px solid #000; margin-right: 5px; display: inline-block; }
      .signature-box { height: 60px; }
      .no-border, .no-border td { border: none; }
      .th-center { text-align: center; font-weight: bold; }
      .label-cell { width: 18%; }
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
            <tr> <td>單位 Satuan :</td> <td class="text-right">Tgl ____ Bulan ____ Tahun ____</td> </tr>
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
                <tr> <td style="text-align: center;">財產名稱 Nama Barang</td> <td colspan="2"></td> <td colspan="2"></td> </tr>
                <tr> <td style="text-align: center;">財產編號 No.Fix Asset</td> <td colspan="2"></td> <td colspan="2"></td> </tr>
                <tr> <td style="text-align: center;">保管單位 Satuan</td> <td colspan="2"></td> <td colspan="2"></td> </tr>
                <tr> <td style="text-align: center;">存放地點 Ditempatkan</td> <td colspan="2"></td> <td colspan="2"></td> </tr>
                <tr> <td style="height: 80px; text-align: center; vertical-align: middle;">備註 Keterangan</td> <td colspan="4"></td> </tr>
                <tr>
                    <td rowspan="2" class="text-center" style="vertical-align: middle;">單位保管人<br>Kustodian Satuan</td>
                    <td class="text-center">主管 Atasan</td> <td class="text-center">保管人 Yg merawat</td>
                    <td class="text-center">主管 Atasan</td> <td class="text-center">保管人 Yg merawat</td>
                </tr>
                <tr> <td class="signature-box"></td> <td class="signature-box"></td> <td class="signature-box"></td> <td class="signature-box"></td> </tr>
                <tr> <td style="text-align: center; vertical-align: middle;">主管單位簽核<br>Pihak berwenang menandatangani</td> <td colspan="4"></td> </tr>
            </tbody>
        </table>
      <div style="text-align:right; font-size:10px; margin-top:5px;"> 表號: 0-32-026 </div>
    </div>
    </body>
    </html>
    `;

    const formDisposalHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <title>FORM DISPOSAL ASET</title>
    <style>
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        .page { border: none !important; transform: scale(1) !important; }
      }
      body { font-family: 'BiauKai', Arial, sans-serif; font-size: 11pt; }
      .page { width: 297mm; height: 210mm; margin: auto; padding: 10mm; box-sizing: border-box; border: 1px solid #000; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #000; padding: 4px; vertical-align: top; text-align: center; }
      .header-main { font-size: 16pt; font-weight: bold; } .header-sub { font-size: 14pt; font-weight: bold; }
      .no-border, .no-border td, .no-border th { border: none; padding: 0; }
      .text-right { text-align: right; } .signature-box { height: 60px; }
      .footer-notes { display: flex; justify-content: space-between; font-size: 9pt; margin-top: 5px; padding: 0 10px; }
      .footer-notes span { text-align: center; flex: 1; }
      .nested-table { width: 100%; height: 100%; }
      .nested-table td { border: none; text-align: left; vertical-align: top; padding: 1px 4px; }
      .nested-table td:first-child { width: auto; white-space: nowrap; }
    </style>
    </head>
    <body>
    <div class="page">
      <table style="border: none; margin-bottom: 10px;">
        <tr class="no-border"> <td class="header-main" colspan="3">PT. CHINA GLAZE INDONESIA</td> </tr>
        <tr class="no-border"> <td class="header-sub" colspan="3">不動產/廠房及設備處理申請單</td> </tr>
        <tr class="no-border"> <td class="header-sub" colspan="3">FORM DISPOSAL ASET BANGUNAN, PABRIK, DAN MESIN</td> </tr>
        <tr class="no-border" style="font-size: 10pt;">
            <td style="width: 33.33%; text-align: left;">單位Bagian: ____________________</td>
            <td style="width: 33.33%;" class="text-center">____日/DD ____月/MM ____年/YYYY</td>
            <td style="width: 33.34%;" class="text-right">表號: 0-32-025</td>
        </tr>
      </table>
      <table>
        <thead>
            <tr>
                <th colspan="4">(保管單位填) <br> diisi Unit User</th>
                <th colspan="2">(財務部填) <br> diisi Unit F&A</th>
                <th colspan="4">(主管單位填) <br> diisi Unit Manager</th>
                <th colspan="2">核 准 <br> Persetujuan</th>
            </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="4" style="height: 30px; padding: 0;"> <table class="nested-table"> <tr><td>名稱 Nama:</td><td></td></tr> </table> </td>
            <td colspan="2" rowspan="2" style="height: 30px; text-align: center; padding: 0;">
                 <table class="nested-table" style="border-collapse: collapse;"> <tr style="border-bottom: 1px solid #000;"><td style="text-align: center;">購入金額 Harga beli</td></tr> <tr><td>&nbsp;</td></tr> </table>
            </td>
            <td colspan="4" style="height: 30px; padding: 0;"> <table class="nested-table"> <tr><td style="white-space: nowrap; text-align: center;">購入日期 Tgl pembelian:</td><td></td></tr> </table> </td>
            <td colspan="2" rowspan="6"></td>
          </tr>
          <tr>
            <td colspan="4" style="height: 30px; padding: 0;"> <table class="nested-table"> <tr><td>編號 Nomor:</td><td></td></tr> </table> </td>
            <td colspan="4" rowspan="10" style="padding: 0;">
                <table class="nested-table">
                    <tr><td style="text-align: left; padding: 5px;">处理方式 Metode disposal: Disposal</td></tr>
                    <tr>
                        <td style="text-align: center; vertical-align: middle; height: 200px;">
                            ${sampleQrUrl ? `<img src="${sampleQrUrl}" style="width: 180px; height: 180px;" />` : '<div style="font-size:8px; color:#ccc;">QR CODE</div>'}
                            <div style="font-size: 7pt; color: #666; margin-top: 2px;">Verification Link</div>
                        </td>
                    </tr>
                </table>
            </td>
          </tr>
          <tr>
            <td colspan="4" rowspan="8" style="padding: 0;"> <table class="nested-table"> <tr><td>原因 Alasan:</td><td></td></tr> </table> </td>
            <td colspan="2" style="height: 30px; text-align: center; padding: 0;"> <table class="nested-table"> <tr><td style="text-align: center;">耐用年限 Masa guna</td></tr> <tr><td></td></tr> </table> </td>
          </tr>
          <tr> <td colspan="2" style="height: 30px; text-align: center;"></td> </tr>
          <tr> <td colspan="2" rowspan="2" style="height: 30px; text-align: center; padding: 0;"> <table class="nested-table"> <tr><td style="text-align: center;">已提列折舊金額<br>Nilai depresiasi</td></tr> <tr><td></td></tr> </table> </td> </tr>
          <tr> </tr>
          <tr> <td colspan="2" rowspan="2" style="height: 30px; text-align: center;"></td> <td rowspan="2" colspan="2">備  註<br>Keterangan</td> </tr>
          <tr> </tr>
          <tr>
            <td colspan="2" style="height: 30px; text-align: center; padding: 0;"> <table class="nested-table"> <tr><td style="text-align: center;">殘值 Sisa nilai aset</td></tr> <tr><td></td></tr> </table> </td>
            <td colspan="2" rowspan="4"></td>
          </tr>
          <tr> <td colspan="2" style="height: 30px; text-align: center;"></td> </tr>
        </tbody>
        <tfoot>
            <tr>
                <th class="text-center">副 總 <br> Vice GM</th> <th class="text-center">經 理 <br> Manager</th> <th class="text-center">課 長 <br> Sec. Head</th> <th class="text-center">經 辦 <br> Pelaksana</th>
                <th class="text-center">經 理 <br> Manager</th> <th class="text-center">經 辦 <br> Pelaksana</th>
                <th class="text-center">副 總 <br> Vice GM</th> <th class="text-center">經 理 <br> Manager</th> <th class="text-center">課 長 <br> Sec. Head</th> <th class="text-center">經 辦 <br> Pelaksana</th>
                <td class="signature-box" colspan="2" rowspan="2"></td>
            </tr>
            <tr>
                <td class="signature-box"></td> <td class="signature-box"></td> <td class="signature-box"></td> <td class="signature-box"></td>
                <td class="signature-box"></td> <td class="signature-box"></td>
                <td class="signature-box"></td> <td class="signature-box"></td> <td class="signature-box"></td> <td class="signature-box"></td>
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

    const formAuditHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <title>LIST OF STOCK OPNAME</title>
    <style>
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        .page { border: none !important; transform: scale(1) !important; width: 100% !important; }
        .watermark { display: flex !important; }
      }
      body { font-family: 'BiauKai', Arial, sans-serif; font-size: 10pt; }
      .page { width: 297mm; height: 210mm; margin: auto; padding: 10mm; box-sizing: border-box; border: 1px solid #000; position: relative; }
      .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; pointer-events: none; z-index: -1; }
      .content-wrapper { position: relative; z-index: 1; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px dotted #000; padding: 2px; vertical-align: middle; text-align: center; }
      .header-table { border: none; margin-bottom: 5px; table-layout: fixed; width: 100%; }
      .header-table td { border: none; padding: 0; vertical-align: middle; }
      .main-title { font-size: 14pt; font-weight: bold; }
      .sub-title { font-size: 12pt; font-weight: bold; }
      .main-table th { border: 1px solid #000; font-weight: bold; }
      .main-table td { border: 1px dotted #000; height: 20px; }
      .main-table tbody td { text-align: left; padding-left: 4px; }
      .main-table tbody td:first-child, .main-table tbody td:nth-child(6) { text-align: center; }
      .total-row td { border: 1px solid #000; font-weight: bold; }
      .signature-table { margin-top: 10px; table-layout: fixed; width: 100%; }
      .signature-table th, .signature-table td { border: 1px solid #000; font-weight: bold; }
      .signature-box { height: 50px; }
    </style>
    </head>
    <body>
    <div class="page">
      <div class="watermark">
          <img src="https://res.cloudinary.com/dbguqcgeq/image/upload/v1759996987/logo_CGI_with_text_kozoo8.png" alt="Watermark" width="500" height="500">
      </div>
      <div class="content-wrapper">
        <table class="header-table">
          <tr>
            <td colspan="4" style="text-align: center;">
              <div style="display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
                <img src="/cgi.png" alt="Logo" style="height: 40px; vertical-align: middle;">
                <div style="display: inline-block; vertical-align: middle; text-align: center; margin-left: 10px;">
                  <div class="main-title">PT CHINA GLAZE INDONESIA</div>
                  <div class="sub-title">LIST OF STOCK OPNAME</div>
                </div>
              </div>
            </td>
          </tr>
           <tr><td colspan="4" style="height: 1rem;"></td></tr>
          <tr>
            <td style="text-align: left; vertical-align: top;">事業部/Dept: HR &amp; GA<br>Prepare by Accounting Dept</td>
            <td colspan="2" style="text-align: left; vertical-align: top;">
               <div style="border-bottom: 3px double #000; padding-bottom: 1px;">Fixed Asset</div>
            </td>
            <td style="text-align: right; vertical-align: top;">Page: 1 / 1</td>
          </tr>
        </table>
        <table class="main-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 8%;">盤點卡<br>Card No.</th>
              <th rowspan="2" style="width: 8%;">Area Code</th>
              <th rowspan="2" style="width: 10%;">Inspection Date</th>
              <th rowspan="2" style="width: 12%;">Kode Asset</th>
              <th rowspan="2" style="width: 22%;">Nama Asset</th>
              <th rowspan="2" style="width: 5%;">Qty</th>
              <th colspan="4">盤點數量<br>Quantity</th>
            </tr>
            <tr>
              <th style="width: 8.75%;">1st Checker</th>
              <th style="width: 8.75%;">2nd Checker</th>
              <th style="width: 8.75%;">Auditor</th>
              <th style="width: 8.75%;">Difference</th>
            </tr>
          </thead>
          <tbody>
            <!-- AUDIT_ROWS -->
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="5" style="text-align: center;">TOTAL</td>
              <td><!-- TOTAL_QTY --></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <table class="signature-table">
          <thead>
            <tr>
              <th>Acknowledge By</th>
              <th>Approved By</th>
              <th>Auditor By</th>
              <th>2nd Checker</th>
              <th>1st Checker</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="signature-box"></td>
              <td class="signature-box"></td>
              <td class="signature-box"></td>
              <td class="signature-box"></td>
              <td class="signature-box"></td>
            </tr>
            <tr>
              <td>Mr Tsai Chang Ken</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </body>
    </html>
    `;

    const handlePrint = (html: string, width: number, height: number) => {
        const printWindow = window.open('', '', `width=${width},height=${height}`);
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };
    
    const handlePrintAuditFix = async () => {
        setIsLoading(true);
        try {
            const auditYear = 2025;
            
            // 1. Fetch all assets from Firestore
            const querySnapshot = await getDocs(collection(db, 'assets'));
            const allAssets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));

            // 2. Filter in the client
            const assetsForYear = allAssets.filter(asset => {
                const isCategoryA = asset.category.startsWith('A');
                const purchaseYear = asset.purchaseDate ? asset.purchaseDate.toDate().getFullYear() : null;
                return isCategoryA && purchaseYear === auditYear;
            });

            // 3. Sort by purchaseDate
            assetsForYear.sort((a, b) => (a.purchaseDate?.toMillis() || 0) - (b.purchaseDate?.toMillis() || 0));

            if (assetsForYear.length === 0) {
                toast({
                    variant: 'destructive',
                    title: 'Tidak Ada Data',
                    description: `Tidak ditemukan aset Seri A dengan tanggal pembelian di tahun ${auditYear}.`,
                });
                setIsLoading(false);
                return;
            }
            
            const formatDate = (timestamp: Timestamp | null | undefined) => {
              if (!timestamp) return '';
              try {
                return new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID');
              } catch(e) { return '' }
            }

            const totalQty = assetsForYear.reduce((sum, asset) => sum + (asset.qty || 0), 0);
            
            let tableRows = assetsForYear.map(asset => `
                <tr>
                    <td></td>
                    <td>${asset.costCenter || ''}</td>
                    <td>${formatDate(asset.projectInspectionDate)}</td>
                    <td>${asset.code}</td>
                    <td>${asset.name}</td>
                    <td style="text-align: center;">${asset.qty || 0}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `).join('');

            const emptyRowCount = Math.max(0, 20 - assetsForYear.length);
            tableRows += Array(emptyRowCount).fill('<tr><td></td><td></td><td></td><td></td><td></td><td style="text-align: center;"></td><td></td><td></td><td></td><td></td></tr>').join('');
            
            const filledForm = formAuditHtml
                .replace('<!-- AUDIT_ROWS -->', tableRows)
                .replace(
                    '<div style="border-bottom: 3px double #000; padding-bottom: 1px;">Fixed Asset</div>',
                    `<div style="border-bottom: 3px double #000; padding-bottom: 1px;">Fixed Asset : ${auditYear}</div>`
                )
                .replace('<td><!-- TOTAL_QTY --></td>', `<td style="text-align: center;">${totalQty}</td>`);
            
            handlePrint(filledForm, 1123, 794);

        } catch (error) {
            console.error("Error fetching or printing fixed audit assets:", error);
            toast({
                variant: 'destructive',
                title: 'Gagal Mencetak',
                description: 'Terjadi kesalahan saat mengambil data aset.',
            });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <DashboardLayout>
            <Card>
                <CardHeader>
                    <CardTitle>Pratinjau Formulir</CardTitle>
                    <CardDescription>
                        Pratinjau formulir standar yang digunakan untuk aset, mutasi, dan disposal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="asset">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="asset">Formulir Aset</TabsTrigger>
                            <TabsTrigger value="mutation">Formulir Mutasi</TabsTrigger>
                            <TabsTrigger value="disposal">Formulir Disposal</TabsTrigger>
                            <TabsTrigger value="audit">Form AUDIT Tahunan</TabsTrigger>
                        </TabsList>
                        <TabsContent value="asset" className="mt-4">
                            <div className="flex justify-end mb-4">
                                <Button onClick={() => handlePrint(formAssetHtml, 815, 605)} variant="outline" disabled={!sampleQrUrl}>
                                    {!sampleQrUrl && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Printer className="mr-2 h-4 w-4" />
                                    Cetak Form Aset
                                </Button>
                            </div>
                            <div ref={formAssetRef} dangerouslySetInnerHTML={{ __html: formAssetHtml.replace('<div class="page">', '<div class="page" style="transform: scale(0.9); transform-origin: top left;">') }} />
                        </TabsContent>
                        <TabsContent value="mutation" className="mt-4">
                             <div className="flex justify-end mb-4">
                                <Button onClick={() => handlePrint(formMutationHtml, 1123, 794)} variant="outline">
                                    <Printer className="mr-2 h-4 w-4" />
                                    Cetak Form Mutasi
                                </Button>
                            </div>
                            <div ref={formMutationRef} dangerouslySetInnerHTML={{ __html: formMutationHtml.replace('<div class="page">', '<div class="page" style="transform: scale(0.85); transform-origin: top left;">') }} />
                        </TabsContent>
                        <TabsContent value="disposal" className="mt-4">
                             <div className="flex justify-end mb-4">
                                <Button onClick={() => handlePrint(formDisposalHtml, 1123, 794)} variant="outline" disabled={!sampleQrUrl}>
                                    {!sampleQrUrl && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Printer className="mr-2 h-4 w-4" />
                                    Cetak Form Disposal
                                </Button>
                            </div>
                            <div ref={formDisposalRef} dangerouslySetInnerHTML={{ __html: formDisposalHtml.replace('<div class="page">', '<div class="page" style="transform: scale(0.85); transform-origin: top left;">') }} />
                        </TabsContent>
                         <TabsContent value="audit" className="mt-4">
                             <div className="flex justify-end mb-4 gap-2">
                                <Button onClick={handlePrintAuditFix} variant="secondary" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                                    Cetak Audit Fix
                                </Button>
                                <Button onClick={() => handlePrint(formAuditHtml.replace('<!-- AUDIT_ROWS -->', Array(20).fill('<tr><td></td><td></td><td></td><td></td><td></td><td style="text-align: center;"></td><td></td><td></td><td></td><td></td></tr>').join('')), 1123, 794)} variant="outline">
                                    <Printer className="mr-2 h-4 w-4" />
                                    Cetak Form Audit
                                </Button>
                            </div>
                            <div ref={formAuditRef} dangerouslySetInnerHTML={{ __html: formAuditHtml.replace('<!-- AUDIT_ROWS -->', Array(20).fill('<tr><td></td><td></td><td></td><td></td><td></td><td style="text-align: center;"></td><td></td><td></td><td></td><td></td></tr>').join('')).replace('<div class="page">', '<div class="page" style="transform: scale(0.85); transform-origin: top left;">') }} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
