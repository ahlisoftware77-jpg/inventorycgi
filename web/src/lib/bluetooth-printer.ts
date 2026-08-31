/**
 * @fileOverview Modul Utilitas Kompilasi ESC/POS Native dan Pengiriman Biner via Web Bluetooth.
 * Mendukung penyandingan (pairing) printer default, auto-connect tanpa dialog modal, 
 * serta fallback otomatis ke pemilihan printer lain jika printer default tidak tersedia.
 */

import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface SavedBluetoothPrinter {
  id: string | null;
  name: string | null;
  autoConnect: boolean;
}

/**
 * Mengambil informasi printer Bluetooth default yang tersimpan di localStorage.
 */
export const getSavedBluetoothPrinter = (): SavedBluetoothPrinter => {
  if (typeof window === 'undefined') return { id: null, name: null, autoConnect: true };
  const id = localStorage.getItem('savedBluetoothPrinterId');
  const name = localStorage.getItem('savedBluetoothPrinterName');
  const autoConnectStr = localStorage.getItem('autoConnectBluetooth');
  const autoConnect = autoConnectStr !== 'false';
  return { id, name, autoConnect };
};

/**
 * Menyandingkan dan menyimpan printer Bluetooth sebagai default.
 */
export const pairAndSaveDefaultPrinter = async (toast: any): Promise<boolean> => {
  if (!navigator.bluetooth) {
    toast({ 
      variant: 'destructive', 
      title: 'Web Bluetooth Tidak Didukung', 
      description: 'Browser Anda tidak mendukung Web Bluetooth API. Gunakan Google Chrome.' 
    });
    return false;
  }

  const targetServices = [
    '00001101-0000-1000-8000-00805f9b34fb', // SPP
    '000018f0-0000-1000-8000-00805f9b34fb', // Generic Printer
    '0000ffe0-0000-1000-8000-00805f9b34fb', // FFE0
    '0000ffe1-0000-1000-8000-00805f9b34fb', // FFE1
    '0000ae30-0000-1000-8000-00805f9b34fb', // AE30
    '0000af30-0000-1000-8000-00805f9b34fb', // AF30
    'e7e10001-ac28-433e-87ec-a4df2c5d4886', // Rongta BLE
    '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC
  ];

  try {
    toast({ title: 'Mencari Printer...', description: 'Silakan pilih printer Bluetooth yang ingin disandingkan.' });
    
    const btDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: targetServices
    });

    if (btDevice) {
      if (btDevice.id) localStorage.setItem('savedBluetoothPrinterId', btDevice.id);
      if (btDevice.name) localStorage.setItem('savedBluetoothPrinterName', btDevice.name);
      localStorage.setItem('autoConnectBluetooth', 'true');
      
      toast({ 
        title: 'Printer Default Disimpan', 
        description: `Printer "${btDevice.name || 'Thermal'}" berhasil disandingkan sebagai default.` 
      });
      return true;
    }
    return false;
  } catch (error: any) {
    if (error.name !== 'NotFoundError') {
      toast({ variant: 'destructive', title: 'Gagal Menyandingkan', description: error.message });
    }
    return false;
  }
};

/**
 * Menghapus pengaturan printer Bluetooth default.
 */
export const forgetDefaultPrinter = (toast: any) => {
  localStorage.removeItem('savedBluetoothPrinterId');
  localStorage.removeItem('savedBluetoothPrinterName');
  toast({ title: 'Printer Default Dihapus', description: 'Pengaturan printer tersimpan telah dibersihkan.' });
};

/**
 * Mengatur mode auto-connect Bluetooth printer.
 */
export const setAutoConnectMode = (enabled: boolean) => {
  localStorage.setItem('autoConnectBluetooth', String(enabled));
};

/**
 * Mengirim biner ke printer Bluetooth.
 * Secara otomatis mencoba koneksi ke printer default tanpa pop-up dialog.
 * Jika printer default mati/tidak ditemukan, otomatis membuka dialog pemilihan printer Bluetooth lain.
 */
export const sendRawBluetooth = async (
  bytes: Uint8Array,
  toast: any,
  forceSelectModal: boolean = false
): Promise<boolean> => {
  if (!navigator.bluetooth) {
    toast({ 
      variant: 'destructive', 
      title: 'Web Bluetooth Tidak Didukung', 
      description: 'Browser Anda tidak mendukung Web Bluetooth API. Gunakan Google Chrome.' 
    });
    return false;
  }

  const targetServices = [
    '00001101-0000-1000-8000-00805f9b34fb', // SPP
    '000018f0-0000-1000-8000-00805f9b34fb', // Generic Printer
    '0000ffe0-0000-1000-8000-00805f9b34fb', // FFE0
    '0000ffe1-0000-1000-8000-00805f9b34fb', // FFE1
    '0000ae30-0000-1000-8000-00805f9b34fb', // AE30
    '0000af30-0000-1000-8000-00805f9b34fb', // AF30
    'e7e10001-ac28-433e-87ec-a4df2c5d4886', // Rongta BLE
    '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC
  ];

  const savedId = localStorage.getItem('savedBluetoothPrinterId');
  const savedName = localStorage.getItem('savedBluetoothPrinterName');
  const isAutoConnect = localStorage.getItem('autoConnectBluetooth') !== 'false';

  let btDevice: BluetoothDevice | null = null;
  let isAutoAttempt = false;

  // 1. Coba koneksi otomatis ke printer tersimpan (jika tidak dipaksa pilih ulang)
  if (!forceSelectModal && isAutoConnect && (savedId || savedName) && navigator.bluetooth.getDevices) {
    try {
      const permittedDevices = await navigator.bluetooth.getDevices();
      if (permittedDevices.length > 0) {
        if (savedId) {
          btDevice = permittedDevices.find(d => d.id === savedId) || null;
        }
        if (!btDevice && savedName) {
          btDevice = permittedDevices.find(d => d.name === savedName) || null;
        }
        // Jika tidak ada kecocokan ID/nama tetapi browser memiliki izin untuk printer, pilih yang pertama saja secara otomatis
        if (!btDevice) {
          btDevice = permittedDevices[0];
        }
      }
      if (btDevice) {
        isAutoAttempt = true;
      }
    } catch (e) {
      console.log('getDevices error / unsupported:', e);
    }
  }

  // Jika printer tersimpan ditemukan dari perizinan browser, langsung terhubung!
  if (btDevice && isAutoAttempt) {
    try {
      toast({ title: 'Menghubungkan Otomatis...', description: `Menghubungkan ke ${btDevice.name || 'Printer Default'}...` });
      const server = await btDevice.gatt?.connect();
      if (server) {
        let service: BluetoothRemoteGATTService | null = null;
        let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

        for (const serviceUuid of targetServices) {
          try {
            service = await server.getPrimaryService(serviceUuid);
            if (service) {
              const characteristics = await service.getCharacteristics();
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  characteristic = char;
                  break;
                }
              }
              if (characteristic) break;
            }
          } catch (e) {
            // Skip
          }
        }

        if (characteristic) {
          toast({ title: 'Mencetak...', description: `Mengirim biner ke ${btDevice.name || 'Printer Default'}...` });
          const MAX_CHUNK_SIZE = 100;
          for (let i = 0; i < bytes.length; i += MAX_CHUNK_SIZE) {
            const chunk = bytes.slice(i, i + MAX_CHUNK_SIZE);
            await characteristic.writeValueWithoutResponse(chunk);
            await new Promise(resolve => setTimeout(resolve, 60)); // Delay untuk mencegah buffer overflow printer
          }
          toast({ title: 'Cetak Selesai', description: 'Label berhasil dicetak.' });
          
          setTimeout(() => {
            btDevice?.gatt?.disconnect();
          }, 1000);

          // Perbarui status printer tersimpan
          if (btDevice.id) localStorage.setItem('savedBluetoothPrinterId', btDevice.id);
          if (btDevice.name) localStorage.setItem('savedBluetoothPrinterName', btDevice.name);

          return true;
        }
      }
    } catch (err: any) {
      console.warn('Gagal terhubung ke printer default, membuka pilihan printer lain:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Printer Default Tidak Ditemukan / Off', 
        description: `Tidak dapat terhubung ke "${savedName || 'Printer Default'}". Membuka pilihan printer Bluetooth lain...` 
      });
      btDevice = null;
    }
  }

  // 2. Jika auto-connect tidak tersedia atau gagal, otomatis buka dialog pemilih printer Bluetooth!
  try {
    toast({ title: 'Mencari Printer...', description: 'Silakan pilih printer Bluetooth yang aktif.' });
    
    btDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: targetServices
    });

    toast({ title: 'Menghubungkan...', description: `Menghubungkan ke ${btDevice.name || 'Printer Bluetooth'}...` });
    
    const server = await btDevice.gatt?.connect();
    if (!server) throw new Error('Gagal menghubungkan ke GATT server.');

    let service: BluetoothRemoteGATTService | null = null;
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    for (const serviceUuid of targetServices) {
      try {
        service = await server.getPrimaryService(serviceUuid);
        if (service) {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              break;
            }
          }
          if (characteristic) break;
        }
      } catch (e) {
        // Skip
      }
    }

    if (!characteristic) {
      throw new Error('No Services matching UUID found in Device. Pastikan printer menyalakan Bluetooth BLE.');
    }

    toast({ title: 'Mencetak...', description: 'Mengirim data biner ke printer thermal Bluetooth...' });

    const MAX_CHUNK_SIZE = 100;
    for (let i = 0; i < bytes.length; i += MAX_CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + MAX_CHUNK_SIZE);
        await characteristic.writeValueWithoutResponse(chunk);
        await new Promise(resolve => setTimeout(resolve, 60)); // Delay untuk mencegah buffer overflow printer
    }

    toast({ title: 'Cetak Selesai', description: 'Label berhasil dicetak.' });
    
    // Otomatis simpan printer ini sebagai printer default untuk pencetakan berikutnya!
    if (btDevice.id) localStorage.setItem('savedBluetoothPrinterId', btDevice.id);
    if (btDevice.name) localStorage.setItem('savedBluetoothPrinterName', btDevice.name);
    localStorage.setItem('autoConnectBluetooth', 'true');

    setTimeout(() => {
      btDevice?.gatt?.disconnect();
    }, 1000);
    return true;

  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      // User membatalkan dialog pemilih printer
      return false;
    }
    console.error('Bluetooth Print Error:', error);
    let errorMsg = error.message || 'Koneksi Bluetooth dibatalkan atau terputus.';
    const lowerMsg = errorMsg.toLowerCase();
    
    if (lowerMsg.includes('gatt') || lowerMsg.includes('connection attempt') || lowerMsg.includes('failed to connect') || lowerMsg.includes('networkerror')) {
      errorMsg = 'Koneksi GATT Gagal. 1) Pastikan printer Bluetooth tidak terhubung ke HP lain. 2) Jika printer menggunakan PIN (Classic), pasangkan terlebih dahulu di OS.';
    }
    
    toast({ 
      variant: 'destructive', 
      title: 'Gagal Mencetak', 
      description: errorMsg 
    });
    return false;
  }
};

/**
 * Membuat data raster GS v 0 dari URL QR Code sehingga QR Code 100% pasti ter-print pada printer thermal Bluetooth 58mm apapun.
 */
export const createQrCodeRasterBytes = async (qrUrl: string, qrSize: number = 240): Promise<Uint8Array> => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = qrSize;
    canvas.height = qrSize;
    await QRCode.toCanvas(canvas, qrUrl, {
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    const ctx = canvas.getContext('2d');
    if (!ctx) return new Uint8Array(0);
    const imageData = ctx.getImageData(0, 0, qrSize, qrSize);
    
    const totalWidth = 384;
    const totalWidthBytes = 48;
    const startX = Math.max(0, Math.floor((totalWidth - qrSize) / 2));
    
    const xL = totalWidthBytes & 0xFF;
    const xH = (totalWidthBytes >> 8) & 0xFF;
    const yL = qrSize & 0xFF;
    const yH = (qrSize >> 8) & 0xFF;

    const cancelKanji = new Uint8Array([0x1C, 0x2E]); // FS . -> Disable Chinese Kanji Mode
    const selectAscii = new Uint8Array([0x1B, 0x74, 0x00]); // ESC t 0 -> Select Standard ASCII Page 0
    const gsV0Header = new Uint8Array([0x1D, 0x76, 0x30, 0, xL, xH, yL, yH]);
    const body = new Uint8Array(totalWidthBytes * qrSize);
    const data = imageData.data;

    for (let y = 0; y < qrSize; y++) {
      for (let x = 0; x < qrSize; x++) {
        const i = (y * qrSize + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 128) {
          const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
          if (grayscale < 128) {
            const targetX = startX + x;
            if (targetX < totalWidth) {
              const byteIndex = y * totalWidthBytes + Math.floor(targetX / 8);
              const bitIndex = targetX % 8;
              body[byteIndex] |= (0x80 >> bitIndex);
            }
          }
        }
      }
    }

    const totalHeaderLen = cancelKanji.length + selectAscii.length + gsV0Header.length;
    const result = new Uint8Array(totalHeaderLen + body.length);
    let offset = 0;
    result.set(cancelKanji, offset); offset += cancelKanji.length;
    result.set(selectAscii, offset); offset += selectAscii.length;
    result.set(gsV0Header, offset); offset += gsV0Header.length;
    result.set(body, offset);
    return result;
  } catch (e) {
    console.error('Error generating QR raster bytes:', e);
    return new Uint8Array(0);
  }
};

/**
 * Fallback perintah biner QR Code hardware ESC/POS printer.
 */
export const buildEscPosQrCode = (dataStr: string): Uint8Array => {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(dataStr);
  const len = dataBytes.length + 3;
  const pL = len & 0xFF;
  const pH = (len >> 8) & 0xFF;

  const sizeCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06]);
  const errCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]);
  const storeHeader = new Uint8Array([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
  const storeCmd = new Uint8Array(storeHeader.length + dataBytes.length);
  storeCmd.set(storeHeader, 0);
  storeCmd.set(dataBytes, storeHeader.length);

  const printCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);

  const result = new Uint8Array(sizeCmd.length + errCmd.length + storeCmd.length + printCmd.length);
  let offset = 0;
  result.set(sizeCmd, offset); offset += sizeCmd.length;
  result.set(errCmd, offset); offset += errCmd.length;
  result.set(storeCmd, offset); offset += storeCmd.length;
  result.set(printCmd, offset);

  return result;
};

/**
 * Helper: menggabungkan beberapa Uint8Array menjadi satu.
 */
const concatBytes = (...arrays: Uint8Array[]): Uint8Array => {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
};

/**
 * Kompilasi spesifikasi komputer/workstation ke format ESC/POS dengan QR Code hardware.
 * 
 * Menggunakan perintah GS ( k untuk meminta printer merender QR Code secara internal.
 * Jauh lebih andal dibanding mengirim bitmap raster GS v 0 yang rentan rusak.
 *   Part 1: Teks header + spesifikasi (via POS Encoder, diakhiri align center)
 *   Part 2: QR Code hardware (GS ( k) — printer render sendiri
 *   Part 3: Teks footer (via POS Encoder terpisah)
 */
export const compileComputerEscPos = async (asset: any, mainAssetId?: string | null): Promise<Uint8Array> => {
  if (typeof window === 'undefined') return new Uint8Array(0);

  const host = window.location.origin;
  const publicUrl = `${host}/public/asset?assetId=${mainAssetId || asset.id}`;
  const displayUrl = publicUrl.replace(/^https?:\/\//, '');

  // Ambil data asset utama dari collection 'assets' untuk mendapatkan Lokasi dll jika ada
  let mainAsset: any = null;
  if (asset.assetCode) {
    try {
      const q = query(collection(db, 'assets'), where('code', '==', asset.assetCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        mainAsset = snap.docs[0].data();
      }
    } catch (e) {
      console.error('Failed to fetch related main asset:', e);
    }
  }

  const userVal = asset.currentUser || asset.user || '-';
  const deptVal = asset.department || '-';
  const brandVal = asset.brandModel || '-';
  const cpuVal = asset.cpu || '-';
  const ramVal = asset.ram || '-';
  const diskVal = `${asset.storage || '-'}${asset.storage2 ? ` + ${asset.storage2}` : ''}`;
  const gpuVal = asset.gpu || '-';
  const osVal = asset.os || '-';
  const ipVal = asset.ipAddress || '-';
  const macVal = asset.macAddress || '-';
  const snVal = asset.serialNumber || '-';
  const mbVal = asset.mainboard || '-';
  const kondisiVal = asset.condition || '-';
  const statusVal = asset.status || '-';
  const lokasiVal = mainAsset?.location || asset.location || '-';

  // === PART 1: Teks header + spesifikasi ===
  const enc1 = new ReceiptPrinterEncoder({ language: 'esc-pos', width: 32 });

  enc1
    .initialize()
    .raw(new Uint8Array([0x1C, 0x2E])) // FS . -> Disable Chinese Kanji mode
    .raw(new Uint8Array([0x1B, 0x74, 0x00])) // ESC t 0 -> ASCII Page 0
    .align('center')
    .bold(true)
    .line('PT. CHINA GLAZE INDONESIA')
    .bold(false)
    .line('IT WORKSTATION SYSTEM')
    .line('--------------------------------')
    .bold(true)
    .size('double-width-double-height')
    .line(asset.computerName || asset.code || '-')
    .size('normal')
    .line(`CODE: ${asset.assetCode || '-'}`)
    .bold(false)
    .line('--------------------------------')
    .align('left');

  const printLine = (label: string, val: string) => {
    const paddedLabel = label.padEnd(8, ' ');
    enc1.line(`${paddedLabel}: ${val || '-'}`);
  };

  printLine('User', userVal);
  printLine('Dept', deptVal);
  printLine('Brand', brandVal);
  printLine('M/Board', mbVal);
  printLine('CPU', cpuVal);
  printLine('RAM', ramVal);
  printLine('Disk', diskVal);
  printLine('GPU', gpuVal);
  printLine('OS', osVal);
  printLine('IP Addr', ipVal);
  printLine('MAC', macVal);
  printLine('S/N', snVal);
  printLine('Lokasi', lokasiVal);
  printLine('Kondisi', kondisiVal);
  printLine('Status', statusVal);

  enc1
    .line('--------------------------------')
    .align('center')
    .bold(true)
    .line('SCAN UNTUK VERIFIKASI')
    .bold(false)
    .newline();

  const part1 = enc1.encode();

  // === PART 2: QR Code HARDWARE (printer render sendiri via GS ( k) ===
  const centerCmd = new Uint8Array([0x1B, 0x61, 0x01]); // ESC a 1 = center alignment
  const qrBytes = buildEscPosQrCode(publicUrl);

  // === PART 3: Teks footer ===
  const enc3 = new ReceiptPrinterEncoder({ language: 'esc-pos', width: 32 });

  enc3
    .align('center')
    .newline()
    .line(displayUrl)
    .line('--------------------------------')
    .bold(true)
    .line('ASSET LABELLING SYSTEM')
    .bold(false)
    .raw(new Uint8Array([0x1B, 0x64, 0x01])) // Feed 1 baris
    .raw(new Uint8Array([0x1D, 0x56, 0x42, 0x00])); // Cut

  const part3 = enc3.encode();

  // Gabungkan: part1 + centerCmd + qrBytes + part3
  return concatBytes(part1, centerCmd, qrBytes, part3);
};

/**
 * Kompilasi aset umum ke format ESC/POS dengan QR Code hardware.
 * Menggunakan pola split 3 bagian yang sama dengan compileComputerEscPos.
 */
export const compileAssetEscPos = async (asset: any): Promise<Uint8Array> => {
  if (typeof window === 'undefined') return new Uint8Array(0);

  const host = window.location.origin;
  let qrUrl = `${host}/public/asset?assetId=${asset.id}`;
  if (asset.status === 'Bukan_Asset_Perusahaan') {
    qrUrl = `${host}/public/personal?id=${asset.id}`;
  } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
    qrUrl = `${host}/public/utility?id=${asset.id}`;
  }
  const displayUrl = qrUrl.replace(/^https?:\/\//, '');

  // Ambil data spesifikasi IT dari collection 'it_assets' jika ada kecocokan kode aset
  let itAsset: any = null;
  if (asset.code) {
    try {
      const q = query(collection(db, 'it_assets'), where('assetCode', '==', asset.code));
      const snap = await getDocs(q);
      if (!snap.empty) {
        itAsset = snap.docs[0].data();
      }
    } catch (e) {
      console.error('Failed to fetch related it_asset:', e);
    }
  }

  // === PART 1: Teks header + spesifikasi ===
  const enc1 = new ReceiptPrinterEncoder({ language: 'esc-pos', width: 32 });

  enc1
    .initialize()
    .raw(new Uint8Array([0x1C, 0x2E])) // Disable Chinese Kanji mode
    .raw(new Uint8Array([0x1B, 0x74, 0x00])) // Select ASCII page
    .align('center')
    .bold(true)
    .line('PT. CHINA GLAZE INDONESIA')
    .bold(false);

  if (itAsset) {
    enc1.line('IT WORKSTATION SYSTEM');
  } else {
    enc1.line('SYSTEM INVENTARIS ASET');
  }

  enc1
    .line('--------------------------------')
    .bold(true)
    .size('double-width-double-height');

  if (itAsset) {
    enc1.line(itAsset.computerName || asset.code || '-');
  } else {
    enc1.line(asset.code || '-');
  }

  enc1.size('normal');

  if (itAsset) {
    enc1.line(`CODE: ${asset.code || '-'}`);
  } else {
    enc1.line(asset.name || '-');
  }

  enc1
    .bold(false)
    .line('--------------------------------')
    .align('left');

  const printLine = (label: string, val: string) => {
    const paddedLabel = label.padEnd(9, ' ');
    enc1.line(`${paddedLabel}: ${val || '-'}`);
  };

  if (itAsset) {
    printLine('User', itAsset.currentUser || itAsset.user || asset.user || asset.currentUser || '-');
    printLine('Dept', itAsset.department || asset.department || asset.costCenter || '-');
    printLine('Brand', itAsset.brandModel || asset.brand || '-');
    printLine('CPU', itAsset.cpu || '-');
    printLine('RAM', itAsset.ram || '-');
    const diskVal = `${itAsset.storage || '-'}${itAsset.storage2 ? ` + ${itAsset.storage2}` : ''}`;
    printLine('Disk', diskVal);
    printLine('GPU', itAsset.gpu || '-');
    printLine('OS', itAsset.os || '-');
    printLine('IP Addr', itAsset.ipAddress || '-');
    printLine('No. Seri', itAsset.serialNumber || asset.serialNumber || '-');
    printLine('Lokasi', asset.location || '-');
    printLine('Kondisi', asset.condition || '-');
    printLine('Status', asset.status || '-');
  } else {
    printLine('Kategori', asset.category);
    printLine('Dept', asset.department || asset.costCenter);
    printLine('Pemakai', asset.user || asset.currentUser);
    printLine('Lokasi', asset.location);
    printLine('Kondisi', asset.condition);
    printLine('Status', asset.status);
    printLine('Merk/Tipe', asset.brand);
    printLine('No. Seri', asset.serialNumber);
    if (asset.qty && asset.qty > 1) printLine('Qty', String(asset.qty));
    printLine('No. PR', asset.prNumber);
    printLine('Supplier', asset.supplier);
    printLine('Catatan', asset.notes);
  }

  enc1
    .line('--------------------------------')
    .align('center')
    .bold(true)
    .line('SCAN UNTUK VERIFIKASI')
    .bold(false)
    .newline();

  const part1 = enc1.encode();

  // === PART 2: QR Code HARDWARE (printer render sendiri via GS ( k) ===
  const centerCmd = new Uint8Array([0x1B, 0x61, 0x01]); // ESC a 1 = center alignment
  const qrBytes = buildEscPosQrCode(qrUrl);

  // === PART 3: Teks footer ===
  const enc3 = new ReceiptPrinterEncoder({ language: 'esc-pos', width: 32 });

  enc3
    .align('center')
    .newline()
    .line(displayUrl)
    .line('--------------------------------')
    .bold(true)
    .line('ASSET LABELLING SYSTEM')
    .bold(false)
    .raw(new Uint8Array([0x1B, 0x64, 0x01])) // Feed 1 baris
    .raw(new Uint8Array([0x1D, 0x56, 0x42, 0x00])); // Cut

  const part3 = enc3.encode();

  // Gabungkan: part1 + centerCmd + qrBytes + part3
  return concatBytes(part1, centerCmd, qrBytes, part3);
};

export const imageToEscPos = (imageData: ImageData): Uint8Array[] => {
    const { width, height, data } = imageData;
    const threshold = 160; // Ambang kontras lebih tinggi agar teks tercetak pekat tajam
    const widthBytes = Math.ceil(width / 8);
    
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;
    
    const header = new Uint8Array([0x1D, 0x76, 0x30, 0, xL, xH, yL, yH]);
    const body = new Uint8Array(widthBytes * height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];
            
            if (a < 10) continue;
            const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
            if (grayscale < threshold) {
                const byteIndex = y * widthBytes + Math.floor(x / 8);
                const bitIndex = x % 8;
                body[byteIndex] |= (0x80 >> bitIndex);
            }
        }
    }
    
    const chunks: Uint8Array[] = [];
    // Initialize printer (ESC @)
    chunks.push(new Uint8Array([0x1B, 0x40]));
    // Disable Chinese Kanji Mode (FS .) -> Mencegah Teks Mandarin Acak saat cetak bitmap
    chunks.push(new Uint8Array([0x1C, 0x2E]));
    // Select Standard Character Table Page 0 (ESC t 0)
    chunks.push(new Uint8Array([0x1B, 0x74, 0x00]));
    
    const combined = new Uint8Array(header.length + body.length);
    combined.set(header, 0);
    combined.set(body, header.length);
    chunks.push(combined);
    
    chunks.push(new Uint8Array([0x1B, 0x64, 4]));
    return chunks;
};

export const printCanvasBluetooth = async (
  canvas: HTMLCanvasElement,
  toast: any,
  forceSelectModal: boolean = false
): Promise<boolean> => {
  try {
    const targetWidth = 384;
    const targetHeight = Math.round((canvas.height * targetWidth) / canvas.width);
    
    const normalizedCanvas = document.createElement('canvas');
    normalizedCanvas.width = targetWidth;
    normalizedCanvas.height = targetHeight;
    const context = normalizedCanvas.getContext('2d');
    if (!context) throw new Error('Gagal memproses gambar untuk printer.');
    
    // Solid white background first
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, targetWidth, targetHeight);

    context.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
    const escPosChunks = imageToEscPos(imageData);

    // Append feed and cut commands
    escPosChunks.push(new Uint8Array([0x1B, 0x64, 6])); // Feed 6 lines
    escPosChunks.push(new Uint8Array([0x1D, 0x56, 0x42, 0x00])); // Cut paper
    
    let totalLength = 0;
    for (const chunk of escPosChunks) totalLength += chunk.length;
    const bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of escPosChunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    
    return sendRawBluetooth(bytes, toast, forceSelectModal);
  } catch (error: any) {
    console.error('printCanvasBluetooth error:', error);
    toast({ variant: 'destructive', title: 'Gagal Mencetak', description: error.message });
    return false;
  }
};
