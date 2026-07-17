/**
 * @fileOverview Modul Utilitas Koneksi dan Pencetakan Langsung via Web Bluetooth untuk Printer Thermal ESC/POS (58mm).
 */
import html2canvas from 'html2canvas';

export const imageToEscPos = (imageData: ImageData): Uint8Array[] => {
    const { width, height, data } = imageData;
    const threshold = 128;
    
    // Calculate width in bytes (each byte represents 8 pixels/bits)
    const widthBytes = Math.ceil(width / 8);
    
    // GS v 0 m xL xH yL yH d1...dk
    // xL, xH: number of data bytes in horizontal direction
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;
    
    // yL, yH: number of dots in vertical direction
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;
    
    // Header for GS v 0 command
    const header = new Uint8Array([0x1D, 0x76, 0x30, 0, xL, xH, yL, yH]);
    
    // Body for monochrome pixel bits
    const body = new Uint8Array(widthBytes * height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];
            
            // Treat transparent pixels as white
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
    // Initialize printer command (ESC @)
    chunks.push(new Uint8Array([0x1B, 0x40]));
    
    // Combine header and body
    const combined = new Uint8Array(header.length + body.length);
    combined.set(header, 0);
    combined.set(body, header.length);
    chunks.push(combined);
    
    // Feed lines to clear the print head (ESC d 4)
    chunks.push(new Uint8Array([0x1B, 0x64, 4]));
    return chunks;
};

export const printCanvasBluetooth = async (
  canvas: HTMLCanvasElement,
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
    toast({ title: 'Mencari Printer...', description: 'Silakan pilih printer Bluetooth Anda dari popup.' });
    
    const btDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: targetServices
    });

    toast({ title: 'Menghubungkan...', description: `Menghubungkan ke ${btDevice.name || 'Printer Bluetooth'}...` });
    
    const server = await btDevice.gatt?.connect();
    if (!server) throw new Error('Gagal menghubungkan ke GATT server.');

    let service: BluetoothRemoteGATTService | null = null;
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    // Loop through each service to find one that is supported and has a write characteristic
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
        // Skip unsupported services silently
      }
    }

    if (!characteristic) {
      throw new Error('No Services matching UUID found in Device. Pastikan printer menyalakan Bluetooth BLE dan mendukung protokol ESC/POS.');
    }

    toast({ title: 'Mencetak...', description: 'Mengirim data biner stiker ke printer...' });

    // Normalize width to exactly 384px (58mm physical standard width) to prevent wrapping
    const targetWidth = 384;
    const targetHeight = Math.round((canvas.height * targetWidth) / canvas.width);
    
    const normalizedCanvas = document.createElement('canvas');
    normalizedCanvas.width = targetWidth;
    normalizedCanvas.height = targetHeight;
    const context = normalizedCanvas.getContext('2d');
    if (!context) throw new Error('Gagal memproses gambar untuk printer.');
    
    // Scale image
    context.drawImage(canvas, 0, 0, targetWidth, targetHeight);

    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
    const escPosChunks = imageToEscPos(imageData);

    // Send data to printer in chunks
    for (const chunk of escPosChunks) {
       const MAX_CHUNK_SIZE = 512;
       for (let i = 0; i < chunk.length; i += MAX_CHUNK_SIZE) {
           const subChunk = chunk.slice(i, i + MAX_CHUNK_SIZE);
           await characteristic.writeValueWithoutResponse(subChunk);
       }
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
      errorMsg = 'Koneksi GATT Gagal. 1) Pastikan printer Bluetooth tidak sedang terhubung ke HP/perangkat lain (putuskan dahulu). 2) Jika printer Anda menggunakan Bluetooth Classic (memerlukan PIN/pairing), silakan gunakan tombol "Cetak Browser (58mm)" setelah printer ditambahkan di sistem.';
    }
    
    toast({ 
      variant: 'destructive', 
      title: 'Gagal Mencetak', 
      description: errorMsg 
    });
    return false;
  }
};
