"use client";

import React from 'react';
import { WarehouseItem } from '@/app/warehouse/page';

interface WarehousePrintOpnameProps {
  items: WarehouseItem[];
}

import { renderToString } from 'react-dom/server';

export const printWarehouseOpname = (items: WarehouseItem[]) => {
  const today = new Date();
    const months = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    const period = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    // Calculate Grand Totals
    let totalLastStock = 0;
    let totalStockIn = 0;
    let totalFritSpare = 0;
    let totalFritPacking = 0;
    let totalMtc = 0;
    let totalMixer = 0;
    let totalQcRdLabApp = 0;
    let totalPpic = 0;
    let totalGa = 0;
    let totalEndingStock = 0;

    const renderedItems = items.map((item, index) => {
      const stockOut = item.stockOut || {};
      
      const getVal = (keys: string[]) => {
        let sum = 0;
        keys.forEach(k => {
          const matchKey = Object.keys(stockOut).find(
            sk => sk.toLowerCase().replace(/\s+/g, ' ').trim() === k.toLowerCase().replace(/\s+/g, ' ').trim()
          );
          if (matchKey) sum += (stockOut[matchKey] || 0);
        });
        return sum;
      };

      const fritSpare = getVal(["FRIT Spare Part", "Spare Part"]);
      const fritPacking = getVal(["FRIT Packing", "Packing"]);
      const mtc = getVal(["MTc", "Maintenance"]);
      const mixer = getVal(["Mixer"]);
      const qcRdLabApp = getVal(["QC", "R&D", "LAB", "APP"]);
      const ppic = getVal(["PPIC"]);
      const ga = getVal(["GA"]);

      const stockOutTotal = Object.values(stockOut).reduce((sum, val) => sum + (val || 0), 0);
      const endingStock = (item.lastStock || 0) + (item.stockIn || 0) - stockOutTotal;
      const isWarning = endingStock <= 2;

      totalLastStock += (item.lastStock || 0);
      totalStockIn += (item.stockIn || 0);
      totalFritSpare += fritSpare;
      totalFritPacking += fritPacking;
      totalMtc += mtc;
      totalMixer += mixer;
      totalQcRdLabApp += qcRdLabApp;
      totalPpic += ppic;
      totalGa += ga;
      totalEndingStock += endingStock;

      return (
        <tr key={item.id} className="text-center text-[10px] sm:text-xs">
          <td className="border border-black p-1">
            {index + 1}
          </td>
          <td className="border border-black p-1 font-semibold">{item.materialCode || '-'}</td>
          <td className="border border-black p-1 text-left">{item.materialName || '-'}</td>
          <td className="border border-black p-1 text-left">{item.specification || '-'}</td>
          <td className="border border-black p-1">{item.unit || '-'}</td>
          <td className="border border-black p-1">{item.location || '-'}</td>
          <td className="border border-black p-1">{item.status || '-'}</td>
          <td className="border border-black p-1">{item.lastStock === 0 ? '-' : item.lastStock}</td>
          <td className="border border-black p-1">{item.stockIn === 0 ? '-' : item.stockIn}</td>
          <td className="border border-black p-1">{fritSpare === 0 ? '' : fritSpare}</td>
          <td className="border border-black p-1">{fritPacking === 0 ? '' : fritPacking}</td>
          <td className="border border-black p-1">{mtc === 0 ? '' : mtc}</td>
          <td className="border border-black p-1">{mixer === 0 ? '' : mixer}</td>
          <td className="border border-black p-1">{qcRdLabApp === 0 ? '' : qcRdLabApp}</td>
          <td className="border border-black p-1">{ppic === 0 ? '' : ppic}</td>
          <td className="border border-black p-1">{ga === 0 ? '' : ga}</td>
          <td className="border border-black p-1 font-bold">{endingStock === 0 ? '-' : endingStock}</td>
          <td className={`border border-black p-1 font-bold ${isWarning ? 'text-red-600' : 'text-green-600'}`}>
            {isWarning ? 'BELI' : 'AMAN'}
          </td>
        </tr>
      );
    });

    const content = (
      <div className="w-full bg-white text-black p-0 m-0 font-sans" style={{ width: '100%' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { size: landscape; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}} />
        
        <div className="text-center font-bold mb-4 leading-tight">
          <h1 className="text-lg md:text-xl">PT CHINA GLAZE INDONESIA</h1>
          <h2 className="text-base md:text-lg">GENERAL & SPARE PART REPORT OPNAME</h2>
          <h3 className="text-base md:text-lg">PERIODE :{period}</h3>
        </div>

        <table className="w-full border-collapse border border-black text-[9px] sm:text-[11px] mb-8" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-white text-black leading-tight">
              <th rowSpan={3} className="border border-black p-1 w-[4%]">盤點卡<br/>No</th>
              <th rowSpan={3} className="border border-black p-1 w-[8%]">原料編號<br/>Material<br/>Code</th>
              <th rowSpan={3} className="border border-black p-1 w-[12%]">品名<br/>Material Name</th>
              <th rowSpan={3} className="border border-black p-1 w-[12%]">包裝規格<br/>Specification</th>
              <th rowSpan={3} className="border border-black p-1 w-[4%]">單位<br/>Unit</th>
              <th rowSpan={3} className="border border-black p-1 w-[5%]">Location</th>
              <th rowSpan={3} className="border border-black p-1 w-[5%]">Status</th>
              <th rowSpan={3} className="border border-black p-1 w-[5%]">Last<br/>Stock</th>
              <th rowSpan={3} className="border border-black p-1 w-[5%]">Stock In</th>
              <th colSpan={7} className="border border-black p-1 py-1">STOCK OUT DEPT</th>
              <th rowSpan={3} className="border border-black p-1 w-[6%]">Ending Stock</th>
              <th rowSpan={3} className="border border-black p-1 w-[6%]">Warning</th>
            </tr>
            <tr className="text-black">
              <th colSpan={2} className="border border-black p-1 bg-[#00a2e8] text-white">FRIT</th>
              <th rowSpan={2} className="border border-black p-1 bg-[#fff200] text-black">MTc</th>
              <th rowSpan={2} className="border border-black p-1 bg-[#ffc90e] text-black">Mixer</th>
              <th rowSpan={2} className="border border-black p-1 bg-[#7030a0] text-white whitespace-nowrap">QC R&D<br/>LAB APP</th>
              <th rowSpan={2} className="border border-black p-1 bg-[#92d050] text-black">PPIC</th>
              <th rowSpan={2} className="border border-black p-1 bg-[#00b050] text-white">GA</th>
            </tr>
            <tr className="text-black">
              <th className="border border-black p-1 bg-[#00a2e8] text-white font-normal">Spare Part</th>
              <th className="border border-black p-1 bg-[#00a2e8] text-white font-normal">Packing</th>
            </tr>
          </thead>
          <tbody>
            {renderedItems}
            
            {/* Grand Total Row */}
            <tr className="text-center font-bold text-[10px] sm:text-xs">
              <td colSpan={7} className="border border-black p-1 text-left px-4">Grand Total</td>
              <td className="border border-black p-1">{totalLastStock.toLocaleString()}</td>
              <td className="border border-black p-1">{totalStockIn.toLocaleString()}</td>
              <td className="border border-black p-1">{totalFritSpare === 0 ? '' : totalFritSpare.toLocaleString()}</td>
              <td className="border border-black p-1">{totalFritPacking === 0 ? '' : totalFritPacking.toLocaleString()}</td>
              <td className="border border-black p-1">{totalMtc === 0 ? '' : totalMtc.toLocaleString()}</td>
              <td className="border border-black p-1">{totalMixer === 0 ? '' : totalMixer.toLocaleString()}</td>
              <td className="border border-black p-1">{totalQcRdLabApp === 0 ? '' : totalQcRdLabApp.toLocaleString()}</td>
              <td className="border border-black p-1">{totalPpic === 0 ? '' : totalPpic.toLocaleString()}</td>
              <td className="border border-black p-1">{totalGa === 0 ? '' : totalGa.toLocaleString()}</td>
              <td className="border border-black p-1">{totalEndingStock.toLocaleString()}</td>
              <td className="border border-black p-1"></td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="flex justify-center mt-6 page-break-inside-avoid">
          <table className="border-collapse border border-black w-3/4 max-w-3xl text-center text-xs md:text-sm font-bold">
            <thead>
              <tr>
                <th className="border border-black py-2 w-1/3">APPROVED BY</th>
                <th className="border border-black py-2 w-1/3">CHECKED BY</th>
                <th className="border border-black py-2 w-1/3">MADE BY</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black h-20"></td>
                <td className="border border-black h-20"></td>
                <td className="border border-black h-20"></td>
              </tr>
              <tr>
                <td className="border border-black py-1">Mr.Tsai Chang ken</td>
                <td className="border border-black py-1">WARSITO</td>
                <td className="border border-black py-1">ISMAIL</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Warehouse Opname</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
            }
            body { font-family: sans-serif; background: white; margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${renderToString(content)}
        </body>
      </html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);
    
    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      
      // Wait for tailwind to process
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 1000);
    }

    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 5000);
};
