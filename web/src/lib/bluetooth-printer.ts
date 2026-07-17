/**
 * @fileOverview Modul Utilitas Koneksi dan Pencetakan Langsung via Web Bluetooth untuk Printer Thermal ESC/POS (58mm).
 */
import html2canvas from 'html2canvas';

export const imageToEscPos = (imageData: ImageData): Uint8Array[] => {
    const { width, height, data } = imageData;
    const threshold = 128;
    const chunks: Uint8Array[] = [];

    // Initialize printer command (ESC @)
    chunks.push(new Uint8Array([0x1B, 0x40]));
    
    // Set line spacing to 24 dots (ESC 3 24)
    chunks.push(new Uint8Array([0x1B, 0x33, 24]));

    for (let y = 0; y < height; y += 24) {
        // ESC * m n1 n2 d1...dk
        // m = 33 (24-dot double density)
        // n1, n2 = width of the image (low byte, high byte)
        const command = new Uint8Array([0x1B, 0x2A, 33, width & 0xFF, (width >> 8) & 0xFF]);
        const slice = new Uint8Array(width * 3);

        for (let x = 0; x < width; x++) {
            for (let bit = 0; bit < 24; bit++) {
                const y_offset = y + bit;
                if (y_offset >= height) {
                    continue;
                }

                const pixel_index = (y_offset * width + x) * 4;
                const r = data[pixel_index];
                const g = data[pixel_index + 1];
                const b = data[pixel_index + 2];
                const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
                
                if (grayscale < threshold) {
                    slice[x * 3 + Math.floor(bit / 8)] |= (0x80 >> (bit % 8));
                }
            }
        }
        
        const combined = new Uint8Array(command.length + slice.length);
        combined.set(command, 0);
        combined.set(slice, command.length);
        chunks.push(combined);
        // Line feed (LF)
        chunks.push(new Uint8Array([0x0A]));
    }
    
    // Feed lines to clear the print head
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

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Gagal membaca gambar.');

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
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
    toast({ 
      variant: 'destructive', 
      title: 'Gagal Mencetak', 
      description: error.message || 'Koneksi Bluetooth dibatalkan atau terputus.' 
    });
    return false;
  }
};
