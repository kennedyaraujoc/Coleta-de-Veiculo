import React, { useRef } from 'react';
import { Camera, X } from 'lucide-react';

interface PhotoUploaderProps {
  photoDataUrl: string | null;
  onPhotoSelect: (dataUrl: string | null) => void;
  isAnalyzing: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ photoDataUrl, onPhotoSelect, isAnalyzing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Agora nós enviamos a foto "crua" para o App.tsx.
        // O App.tsx é quem vai usar o Canvas para corrigir a rotação e tamanho.
        onPhotoSelect(reader.result as string);
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
        Foto do Veículo
      </label>
      
      {!photoDataUrl ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer flex flex-col items-center justify-center h-48"
        >
          <Camera className="w-10 h-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">Toque para tirar foto</p>
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
            className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-md text-gray-700 hover:text-red-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};