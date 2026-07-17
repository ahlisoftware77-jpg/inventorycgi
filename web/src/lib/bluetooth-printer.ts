/**
 * @fileOverview Modul Utilitas Kompilasi ESC/POS Native dan Pengiriman Biner via Web Bluetooth.
 * Menggunakan font bawaan dan perintah QR Code perangkat keras printer thermal 58mm untuk ketajaman sempurna layaknya aplikasi kasir.
 */

export const sendRawBluetooth = async (
  bytes: Uint8Array,
  toast: any
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
  
  try {
    toast({ title: 'Mencari Printer...', description: 'Silakan pilih printer Bluetooth Anda.' });
    
    const btDevice = await navigator.bluetooth.requestDevice({
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

    toast({ title: 'Mencetak...', description: 'Mengirim biner struk kasir ke printer...' });

    // Send raw bytes in chunks of 512 bytes
    const MAX_CHUNK_SIZE = 512;
    for (let i = 0; i < bytes.length; i += MAX_CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + MAX_CHUNK_SIZE);
        await characteristic.writeValueWithoutResponse(chunk);
    }

    toast({ title: 'Cetak Selesai', description: 'Label berhasil dicetak.' });
    
    setTimeout(() => {
      btDevice.gatt?.disconnect();
    }, 1000);
    return true;

  } catch (error: any) {
    console.error('Bluetooth Print Error:', error);
    let errorMsg = error.message || 'Koneksi Bluetooth dibatalkan atau terputus.';
    const lowerMsg = errorMsg.toLowerCase();
    
    if (lowerMsg.includes('gatt') || lowerMsg.includes('connection attempt') || lowerMsg.includes('failed to connect') || lowerMsg.includes('networkerror')) {
      errorMsg = 'Koneksi GATT Gagal. 1) Pastikan printer Bluetooth tidak sedang terhubung ke HP/perangkat lain. 2) Jika printer Anda menggunakan Bluetooth Classic (memerlukan PIN), silakan gunakan tombol "Cetak Browser (58mm)" setelah printer ditambahkan di sistem.';
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
 * Membuat perintah biner QR Code hardware ESC/POS printer.
 */
export const buildEscPosQrCode = (dataStr: string): Uint8Array => {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(dataStr);
  const len = dataBytes.length + 3;
  const pL = len & 0xFF;
  const pH = (len >> 8) & 0xFF;

  // Function 167: Set QR Code size (3 to 8, 6 is perfect for 58mm)
  const sizeCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06]);
  
  // Function 169: Set QR Code error correction level (level 49 = M)
  const errCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]);
  
  // Function 180: Store symbol data in storage area
  const storeHeader = new Uint8Array([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
  const storeCmd = new Uint8Array(storeHeader.length + dataBytes.length);
  storeCmd.set(storeHeader, 0);
  storeCmd.set(dataBytes, storeHeader.length);

  // Function 181: Print symbol data
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
 * Kompilasi spesifikasi komputer/workstation ke format teks ESC/POS murni.
 */
export const compileComputerEscPos = (asset: any, mainAssetId: string | null): Uint8Array => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  // Initialize printer
  chunks.push(new Uint8Array([0x1B, 0x40]));
  
  // Align center
  chunks.push(new Uint8Array([0x1B, 0x61, 0x01]));
  
  // Bold + Double Width untuk Header
  chunks.push(new Uint8Array([0x1B, 0x21, 0x28]));
  chunks.push(encoder.encode("PT. CHINA GLAZE INDONESIA\n"));
  
  // Regular text untuk Sub-header
  chunks.push(new Uint8Array([0x1B, 0x21, 0x00]));
  chunks.push(encoder.encode("IT DEPARTMENT\n"));
  chunks.push(encoder.encode("--------------------------------\n"));

  // Double width untuk Nama Komputer
  chunks.push(new Uint8Array([0x1B, 0x21, 0x20]));
  chunks.push(encoder.encode(`${asset.computerName}\n`));

  // Bold untuk Kode Aset
  chunks.push(new Uint8Array([0x1B, 0x21, 0x08]));
  chunks.push(encoder.encode(`CODE: ${asset.assetCode}\n`));
  chunks.push(new Uint8Array([0x1B, 0x21, 0x00]));
  chunks.push(encoder.encode("--------------------------------\n"));

  // Align left untuk spesifikasi
  chunks.push(new Uint8Array([0x1B, 0x61, 0x00]));

  const specs = [
    ["User", asset.currentUser || '-'],
    ["Dept", asset.department || '-'],
    ["CPU", asset.cpu || '-'],
    ["RAM", asset.ram || '-'],
    ["Disk", `${asset.storage || '-'}${asset.storage2 ? ` + ${asset.storage2}` : ''}`],
    ["OS", asset.os || '-'],
    ["IP", asset.ipAddress || '-']
  ];

  for (const [label, val] of specs) {
    const paddedLabel = label.padEnd(5, ' ');
    const lineText = `${paddedLabel}: ${val}\n`;
    chunks.push(encoder.encode(lineText));
  }

  chunks.push(encoder.encode("--------------------------------\n"));

  // Align center untuk QR Code
  chunks.push(new Uint8Array([0x1B, 0x61, 0x01]));
  chunks.push(new Uint8Array([0x1B, 0x21, 0x08]));
  chunks.push(encoder.encode("SCAN UNTUK VERIFIKASI\n\n"));
  chunks.push(new Uint8Array([0x1B, 0x21, 0x00]));

  // Buat QR Code verifikasi publik
  const host = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = `${host}/public/asset?assetId=${mainAssetId || asset.id}`;
  chunks.push(buildEscPosQrCode(qrUrl));

  // Feed 6 baris agar mudah disobek
  chunks.push(new Uint8Array([0x1B, 0x64, 0x06]));
  
  // Cut paper (GS V 66 0)
  chunks.push(new Uint8Array([0x1D, 0x56, 0x42, 0x00]));

  // Satukan seluruh chunks
  let totalLength = 0;
  for (const chunk of chunks) totalLength += chunk.length;
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

/**
 * Kompilasi aset umum ke format teks ESC/POS murni.
 */
export const compileAssetEscPos = (asset: any): Uint8Array => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  // Initialize
  chunks.push(new Uint8Array([0x1B, 0x40]));
  
  // Align center
  chunks.push(new Uint8Array([0x1B, 0x61, 0x01]));
  
  // Header
  chunks.push(new Uint8Array([0x1B, 0x21, 0x08]));
  chunks.push(encoder.encode("PT. CHINA GLAZE INDONESIA\n"));
  chunks.push(new Uint8Array([0x1B, 0x21, 0x00]));
  chunks.push(encoder.encode("--------------------------------\n"));

  // Kode Aset Ukuran Double Size
  chunks.push(new Uint8Array([0x1B, 0x21, 0x30]));
  chunks.push(encoder.encode(`${asset.code}\n`));
  
  // Detail aset
  chunks.push(new Uint8Array([0x1B, 0x21, 0x08]));
  chunks.push(encoder.encode(`${asset.name}\n`));
  chunks.push(new Uint8Array([0x1B, 0x21, 0x00]));
  chunks.push(encoder.encode(`${asset.location}\n`));
  chunks.push(encoder.encode("--------------------------------\n"));

  // QR Code
  chunks.push(new Uint8Array([0x1B, 0x61, 0x01]));
  chunks.push(new Uint8Array([0x1B, 0x21, 0x08]));
  chunks.push(encoder.encode("SCAN UNTUK VERIFIKASI\n\n"));
  chunks.push(new Uint8Array([0x1B, 0x21, 0x00]));

  const host = typeof window !== 'undefined' ? window.location.origin : '';
  let qrUrl = `${host}/public/asset?assetId=${asset.id}`;
  if (asset.status === 'Bukan_Asset_Perusahaan') {
    qrUrl = `${host}/public/personal?id=${asset.id}`;
  } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
    qrUrl = `${host}/public/utility?id=${asset.id}`;
  }
  chunks.push(buildEscPosQrCode(qrUrl));

  // Feed 6 baris
  chunks.push(new Uint8Array([0x1B, 0x64, 0x06]));
  
  // Cut paper
  chunks.push(new Uint8Array([0x1D, 0x56, 0x42, 0x00]));

  // Satukan
  let totalLength = 0;
  for (const chunk of chunks) totalLength += chunk.length;
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

export const imageToEscPos = (imageData: ImageData): Uint8Array[] => {
    const { width, height, data } = imageData;
    const threshold = 128;
    
    // Calculate width in bytes (each byte represents 8 pixels/bits)
    const widthBytes = Math.ceil(width / 8);
    
    // GS v 0 m xL xH yL yH d1...dk
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
    chunks.push(new Uint8Array([0x1B, 0x40]));
    
    const combined = new Uint8Array(header.length + body.length);
    combined.set(header, 0);
    combined.set(body, header.length);
    chunks.push(combined);
    
    chunks.push(new Uint8Array([0x1B, 0x64, 4]));
    return chunks;
};

export const printCanvasBluetooth = async (
  canvas: HTMLCanvasElement,
  toast: any
): Promise<boolean> => {
  try {
    const targetWidth = 384;
    const targetHeight = Math.round((canvas.height * targetWidth) / canvas.width);
    
    const normalizedCanvas = document.createElement('canvas');
    normalizedCanvas.width = targetWidth;
    normalizedCanvas.height = targetHeight;
    const context = normalizedCanvas.getContext('2d');
    if (!context) throw new Error('Gagal memproses gambar untuk printer.');
    
    context.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
    const escPosChunks = imageToEscPos(imageData);
    
    let totalLength = 0;
    for (const chunk of escPosChunks) totalLength += chunk.length;
    const bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of escPosChunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    
    return sendRawBluetooth(bytes, toast);
  } catch (error: any) {
    console.error('printCanvasBluetooth error:', error);
    toast({ variant: 'destructive', title: 'Gagal Mencetak', description: error.message });
    return false;
  }
};
