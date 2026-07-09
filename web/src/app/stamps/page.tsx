
'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function StampsPage() {

  const handlePrint = () => {
    const stampBlock = `
      <div class="stamp disposal">
        <span>🗑️</span>
        DISPOSAL
      </div>
      <div class="stamp approve">
        <span>✅</span>
        APPROVE
      </div>
      <div class="stamp mutasi">
        <span>🔄</span>
        MUTASI
      </div>
      <div class="stamp perbaikan">
        <span>🔧</span>
        DALAM<br>PERBAIKAN
      </div>
    `;

    const stampHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
      <meta charset="UTF-8">
      <title>Halaman Stempel Aset</title>
      <style>
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
        }
        body {
          font-family: Arial, sans-serif;
        }
        .stamp-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        .stamp {
          width: 58mm;
          height: 58mm;
          border: 3px solid #000;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 14pt;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.3),
                      inset -2px -2px 5px rgba(255,255,255,0.5),
                      3px 3px 8px rgba(0,0,0,0.4);
          page-break-inside: avoid;
        }
        .stamp span {
          font-size: 28pt;
          margin-bottom: 5px;
        }
        .disposal { color: red; text-shadow: 2px 2px 3px rgba(0,0,0,0.6); }
        .approve { color: green; text-shadow: 2px 2px 3px rgba(0,0,0,0.6); }
        .mutasi { color: blue; text-shadow: 2px 2px 3px rgba(0,0,0,0.6); }
        .perbaikan { color: orange; text-shadow: 2px 2px 3px rgba(0,0,0,0.6); }
      </style>
      </head>
      <body>
        <h2>Stempel Aset</h2>
        <div class="stamp-container">
          ${stampBlock.repeat(5)}
        </div>
      </body>
      </html>`;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(stampHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const stampPreviewBlock = (
    <>
        <div className="stamp disposal">
            <span>🗑️</span>
            DISPOSAL
        </div>
        <div className="stamp approve">
            <span>✅</span>
            APPROVE
        </div>
        <div className="stamp mutasi">
            <span>🔄</span>
            MUTASI
        </div>
        <div className="stamp perbaikan">
            <span>🔧</span>
            DALAM<br />PERBAIKAN
        </div>
    </>
    );

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Stempel Aset</CardTitle>
                    <CardDescription>
                        Kumpulan stempel yang dapat dicetak untuk keperluan Berita Acara.
                    </CardDescription>
                </div>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Stempel
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <style>{`
                .stamp-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                .stamp {
                    width: 150px;
                    height: 150px;
                    border: 3px solid #000;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-size: 14pt;
                    font-weight: bold;
                    text-align: center;
                    text-transform: uppercase;
                    background-color: #f0f0f0;
                    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.3),
                                inset -2px -2px 5px rgba(255,255,255,0.5),
                                3px 3px 8px rgba(0,0,0,0.4);
                }
                .stamp span {
                    font-size: 28pt;
                    margin-bottom: 5px;
                }
                .disposal { color: red; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
                .approve { color: green; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
                .mutasi { color: blue; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
                .perbaikan { color: orange; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
            `}</style>
            <div className="stamp-container">
                {Array.from({ length: 5 }).map((_, i) => (
                    <React.Fragment key={i}>
                        {stampPreviewBlock}
                    </React.Fragment>
                ))}
            </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
