import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface PhotoUploaderProps {
  photoDataUrl: string | null;
  onPhotoSelect: (dataUrl: string | null) => void;
  isAnalyzing: boolean;
}

// Função para ler a orientação EXIF de uma imagem
function getOrientation(file: File, callback: (orientation: number) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const view = new DataView(e.target?.result as ArrayBuffer);
    if (view.getUint16(0, false) !== 0xFFD8) {
      return callback(-2); // Not a JPEG
    }
    const length = view.byteLength;
    let offset = 2;
    while (offset < length) {
      if (view.getUint16(offset + 2, false) <= 8) return callback(-1); // Invalid EXIF
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xFFE1) {
        if (view.getUint32(offset += 2, false) !== 0x45786966) return callback(-1);
        const little = view.getUint16(offset += 6, false) === 0x4949;
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;
        for (let i = 0; i < tags; i++) {
          if (view.getUint16(offset + (i * 12), little) === 0x0112) {
            return callback(view.getUint16(offset + (i * 12) + 8, little));
          }
        }
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
    return callback(-1); // Not found
  };
  reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
}

// Função para rotacionar a imagem com base na orientação
function resetOrientation(srcBase64: string, srcOrientation: number, callback: (dataUrl: string) => void) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = img.width;
    let height = img.height;
    
    if (srcOrientation >= 5 && srcOrientation <= 8) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    switch (srcOrientation) {
      case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
      case 7: ctx.transform(0, -1, -1, 0, height, width); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
      default: break;
    }

    ctx.drawImage(img, 0, 0);
    callback(canvas.toDataURL());
  };
  img.src = srcBase64;
}


export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ photoDataUrl, onPhotoSelect, isAnalyzing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        getOrientation(file, (orientation) => {
          resetOrientation(reader.result as string, orientation, (rotatedDataUrl) => {
            onPhotoSelect(rotatedDataUrl);
          });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onPhotoSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Foto do Veículo (Opcional)
      </label>
      
      {!photoDataUrl ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer flex flex-col items-center justify-center h-48"
        >
          <Camera className="w-10 h-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">Toque para tirar ou carregar foto</p>
          <span className="text-xs text-blue-500 mt-1">IA irá preencher Placa e Modelo</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <img src={photoDataUrl} alt="Preview" className="w-full h-48 object-cover" />
          <button
            onClick={handleRemove}
            disabled={isAnalyzing}
            className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-md text-gray-700 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
