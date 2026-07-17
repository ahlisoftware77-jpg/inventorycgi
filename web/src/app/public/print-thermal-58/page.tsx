'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import QRCode from 'qrcode';
import { Loader2 } from 'lucide-react';

function PrintThermalPageContent() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId') || searchParams.get('id');
  const type = searchParams.get('type') || 'general'; // 'general' or 'computer'
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (!assetId) {
      setError('ID Aset tidak ditemukan');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        let assetData: any = null;
        let qrLink = '';

        if (type === 'computer') {
          const docRef = doc(db, 'it_assets', assetId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            assetData = { id: docSnap.id, ...docSnap.data() };
            if (assetData.assetCode) {
              const mainQuery = query(collection(db, 'assets'), where('code', '==', assetData.assetCode));
              const mainSnap = await getDocs(mainQuery);
              if (!mainSnap.empty) {
                qrLink = `${window.location.origin}/public/asset?assetId=${mainSnap.docs[0].id}`;
              } else {
                qrLink = `${window.location.origin}/public/personal?id=${assetData.id}`;
              }
            } else {
              qrLink = `${window.location.origin}/public/personal?id=${assetData.id}`;
            }
          }
        } else {
          const docRef = doc(db, 'assets', assetId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            assetData = { id: docSnap.id, ...docSnap.data() };
            qrLink = `${window.location.origin}/public/asset?assetId=${assetData.id}`;
            if (assetData.status === 'Bukan_Asset_Perusahaan') {
              qrLink = `${window.location.origin}/public/personal?id=${assetData.id}`;
            } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(assetData.category)) {
              qrLink = `${window.location.origin}/public/utility?id=${assetData.id}`;
            }
          }
        }

        if (!assetData) {
          setError('Aset tidak ditemukan');
          setLoading(false);
          return;
        }

        setData(assetData);

        const qr = await QRCode.toDataURL(qrLink, { margin: 1, width: 200 });
        setQrUrl(qr);
        setLoading(false);

        setTimeout(() => {
          window.print();
        }, 800);

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Gagal memuat data');
        setLoading(false);
      }
    };

    fetchData();
  }, [assetId, type]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black p-4 text-center font-mono">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <div className="text-xs font-bold uppercase tracking-wider">Menyiapkan Cetakan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black p-4 text-center font-mono text-xs border border-dashed border-red-500">
        <div className="font-bold text-red-600 uppercase mb-2">ERROR</div>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="print-container">
      <style>{`
        @page {
          size: 58mm auto;
          margin: 0;
        }
        @media print {
          html, body {
            width: 58mm;
            background: white;
            color: black;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        body {
          font-family: monospace;
          background: #f0f0f0;
          margin: 0;
          padding: 10px 0;
          display: flex;
          justify-content: center;
        }
        .print-container {
          width: 48mm;
          background: white;
          padding: 10px 6px;
          box-sizing: border-box;
          text-align: center;
          color: black;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          font-weight: bold;
          font-size: 8pt;
          border-bottom: 1px dashed black;
          padding-bottom: 4px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .title {
          font-weight: bold;
          font-size: 10pt;
          text-transform: uppercase;
          margin: 2px 0;
          word-break: break-word;
        }
        .code {
          font-weight: bold;
          font-size: 12pt;
          border: 1px solid black;
          display: inline-block;
          padding: 2px 6px;
          margin: 6px 0;
        }
        .specs-table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 8pt;
          text-align: left;
        }
        .specs-table td {
          padding: 2px 0;
          vertical-align: top;
        }
        .label {
          font-weight: bold;
          width: 25%;
        }
        .colon {
          width: 5%;
          text-align: center;
        }
        .val {
          width: 70%;
          word-break: break-all;
        }
        .qr-section {
          margin: 10px 0;
        }
        .qr-image {
          width: 32mm;
          height: 32mm;
          margin: 0 auto;
        }
        .footer {
          border-top: 1px dashed black;
          padding-top: 4px;
          margin-top: 8px;
          font-size: 7.5pt;
          font-weight: bold;
        }
        .no-print-btn {
          position: fixed;
          top: 10px;
          right: 10px;
          background: #000;
          color: #fff;
          border: none;
          padding: 8px 16px;
          font-family: sans-serif;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
      `}</style>

      <button className="no-print no-print-btn" onClick={() => window.print()}>
        CETAK
      </button>

      <div className="header">
        PT. China Glaze Indonesia<br />IT DEPARTMENT
      </div>

      {type === 'computer' ? (
        <>
          <div className="title">{data.computerName}</div>
          <div className="code">{data.assetCode || '-'}</div>
          
          <table className="specs-table">
            <tbody>
              <tr><td className="label">User</td><td className="colon">:</td><td className="val">{data.currentUser || '-'}</td></tr>
              <tr><td className="label">Dept</td><td className="colon">:</td><td className="val">{data.department || '-'}</td></tr>
              <tr><td className="label">CPU</td><td className="colon">:</td><td className="val">{data.cpu || '-'}</td></tr>
              <tr><td className="label">RAM</td><td className="colon">:</td><td className="val">{data.ram || '-'}</td></tr>
              <tr><td className="label">Disk</td><td className="val">{data.storage}{data.storage2 ? ` + ${data.storage2}` : ''}</td></tr>
              <tr><td className="label">OS</td><td className="colon">:</td><td className="val">{data.os || '-'}</td></tr>
              <tr><td className="label">IP</td><td className="colon">:</td><td className="val">{data.ipAddress || '-'}</td></tr>
            </tbody>
          </table>
        </>
      ) : (
        <>
          <div className="title">{data.name}</div>
          <div className="code">{data.code}</div>
          
          <table className="specs-table">
            <tbody>
              <tr><td className="label">User</td><td className="colon">:</td><td className="val">{data.user || '-'}</td></tr>
              <tr><td className="label">Lokasi</td><td className="colon">:</td><td className="val">{data.location || '-'}</td></tr>
              <tr><td className="label">Kategori</td><td className="colon">:</td><td className="val">{data.category || '-'}</td></tr>
              <tr><td className="label">Kondisi</td><td className="colon">:</td><td className="val">{data.condition || '-'}</td></tr>
            </tbody>
          </table>
        </>
      )}

      <div className="qr-section">
        {qrUrl && <img className="qr-image" src={qrUrl} alt="QR Code" />}
        <div style={{ fontSize: '6.5pt', marginTop: '2px', fontWeight: 'bold' }}>SCAN UNTUK VERIFIKASI</div>
      </div>

      <div className="footer">
        ASSET LABELLING SYSTEM
      </div>
    </div>
  );
}

export default function PrintThermalPage() {
  return (
    <Suspense fallback={<div>Loading Page...</div>}>
      <PrintThermalPageContent />
    </Suspense>
  );
}
