import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Car, User, FileText, DollarSign, UploadCloud, CheckCircle, Loader2, Plus, Trash2, List, Camera as CameraIcon } from 'lucide-react';
import { Input } from './components/Input';
import { PhotoUploader } from './components/PhotoUploader';
import { VehicleData, AppStatus } from './types';

const vehicleModels = [
  "CARRETA (ATÉ 19.40m)",
  "BITREM CURTO (18.60m)",
  "RODOTREM (25.80m)",
  "RODOTREM (30m)",
  "PRANCHA (22m x 3.20m)",
  "PRANCHA (25m x 3.20m)",
  "TRUCK ORIGINAL (9m)",
  "TRUCK BAÚ (14m)",
  "CAMINHÃO TOCO",
  "CAMINHÃO 3/4",
  "RODOTREM TANQUE (INFLAMÁVEL)",
  "CARRETA (SEM CAVALO)",
  "CAVALO MECÂNICO",
];

type RouteOption = 'MANAUS' | 'SANTARÉM';

export default function App() {
  const [vehicleList, setVehicleList] = useState<VehicleData[]>([]);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption>('MANAUS');
  
  const [formData, setFormData] = useState<VehicleData>({
    id: Date.now().toString(),
    driverName: '',
    licensePlate: '',
    vehicleModel: '',
    value: '',
    photoDataUrl: null
  });

  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [statusMessage, setStatusMessage] = useState('');
  
  const licensePlateRegex = /^[A-Z]{3}-[0-9][A-Z0-9]{3}$/;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'licensePlate') {
      // Apply Brazilian license plate mask (Mercosul/Standard)
      const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      let maskedValue = cleaned;
      if (cleaned.length > 3) {
        maskedValue = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
      }
      setFormData(prev => ({ ...prev, [name]: maskedValue }));
    } else if (name === 'value') {
      // Format currency as user types
      const onlyDigits = value.replace(/\D/g, '');
      if (!onlyDigits) {
        setFormData(prev => ({ ...prev, value: '' }));
        return;
      }
      
      const number = parseFloat(onlyDigits) / 100;
      const formattedValue = number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      
      setFormData(prev => ({ ...prev, value: formattedValue }));
    }
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoSelect = (dataUrl: string | null) => {
    setFormData(prev => ({ ...prev, photoDataUrl: dataUrl }));
  };

  const resetForm = () => {
    setFormData({
      id: Date.now().toString(),
      driverName: '',
      licensePlate: '',
      vehicleModel: '',
      value: '',
      photoDataUrl: null
    });
  };

  const handleAddVehicle = () => {
    if (!formData.driverName || !formData.licensePlate || !formData.value) {
      alert("Por favor, preencha todos os campos obrigatórios (Motorista, Placa e Valor).");
      return;
    }

    if (!licensePlateRegex.test(formData.licensePlate)) {
        alert("Placa inválida. Use o formato brasileiro padrão com 8 caracteres (ex: ABC-1234 ou ABC-1B23).");
        return;
    }

    setVehicleList(prev => [...prev, formData]);
    setIsListExpanded(false); // Collapse list on new entry
    resetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeVehicle = (id: string) => {
    setVehicleList(prev => prev.filter(v => v.id !== id));
  };

  const generateAndSavePDF = () => {
    if (vehicleList.length === 0) {
      alert("Adicione pelo menos um veículo à lista.");
      return;
    }

    setStatus(AppStatus.GENERATING_PDF);
    setStatusMessage('Gerando planilha PDF...');

    try {
      const doc = new jsPDF();
      
      const pdfTitle = selectedRoute === 'MANAUS' 
        ? 'Relatório de Veículos de Manaus à Santarém'
        : 'Relatório de Veículos de Santarém à Manaus';

      doc.setFontSize(18);
      doc.text(pdfTitle, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);

      let yPos = 35;
      const rowHeight = 18; // Increased height for photo
      const pageHeight = doc.internal.pageSize.height;
      const photoSize = 12; // 1:1 photo size

      const cols = {
        index:    { x: 10,  w: 8,  title: '#' },
        photo:    { x: 18,  w: 15, title: 'Foto' },
        driver:   { x: 33,  w: 45, title: 'Motorista' },
        plate:    { x: 78,  w: 25, title: 'Placa' },
        model:    { x: 103, w: 37, title: 'Modelo' },
        value:    { x: 140, w: 25, title: 'Valor' },
        sign:     { x: 165, w: 35, title: 'Assinatura' }
      };
      
      const tableWidth = Object.values(cols).reduce((sum, col) => sum + col.w, 0);
      const tableEndX = cols.index.x + tableWidth;

      // Draw Table Header
      doc.setFillColor(240, 240, 240);
      doc.rect(cols.index.x, yPos - 5, tableWidth, 7, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      
      Object.values(cols).forEach(col => {
        doc.text(col.title, col.x + 2, yPos);
      });
      
      yPos += 2;
      doc.setLineWidth(0.5);
      doc.line(cols.index.x, yPos, tableEndX, yPos);
      
      doc.setFont("helvetica", "normal");
      
      for (const [index, vehicle] of vehicleList.entries()) {
        if (yPos + rowHeight > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
          doc.setFont("helvetica", "bold");
          doc.text("Continuação...", 10, yPos - 5);
          doc.line(10, tableEndX, yPos);
        }

        const currentY = yPos + (rowHeight / 2); // Center align text vertically
        const textY = currentY + 3; // Baseline adjustment for text

        // Photo
        if (vehicle.photoDataUrl) {
          try {
            doc.addImage(vehicle.photoDataUrl, 'JPEG', cols.photo.x + 1.5, currentY - (photoSize/2), photoSize, photoSize);
          } catch(e) {
            console.error("Error adding image to PDF", e);
            doc.text('Erro', cols.photo.x + 2, textY);
          }
        } else {
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text('S/ Foto', cols.photo.x + 2, textY);
          doc.setTextColor(0);
        }

        doc.setFontSize(9);
        // #
        doc.text((index + 1).toString(), cols.index.x + 2, textY);
        
        // Driver Name
        doc.text(vehicle.driverName.substring(0, 22), cols.driver.x + 2, textY, { maxWidth: cols.driver.w - 4 });

        // License Plate
        doc.text(vehicle.licensePlate, cols.plate.x + 2, textY);

        // Model
        doc.text(vehicle.vehicleModel.substring(0, 20), cols.model.x + 2, textY, { maxWidth: cols.model.w - 4 });

        // Value (Formatted as Currency)
        doc.text(vehicle.value, cols.value.x + 2, textY);

        // Signature Line
        doc.setLineWidth(0.1);
        doc.line(cols.sign.x + 2, currentY + 4, cols.sign.x + cols.sign.w - 2, currentY + 4);

        yPos += rowHeight;
        doc.setDrawColor(200);
        doc.line(cols.index.x, yPos, tableEndX, yPos);
      }
      
      doc.save(`Relatorio_Frota_${Date.now()}.pdf`);

      setStatus(AppStatus.SUCCESS);
      setStatusMessage('Planilha salva com sucesso!');
      
      setTimeout(() => {
        setStatus(AppStatus.IDLE);
        setVehicleList([]);
      }, 3000);

    } catch (error) {
      console.error("PDF Error", error);
      setStatus(AppStatus.ERROR);
      setStatusMessage('Erro ao gerar documento.');
    }
  };
  
  const isFormValid = formData.driverName && licensePlateRegex.test(formData.licensePlate) && formData.value;

  const renderVehicleCard = (vehicle: VehicleData, isLast: boolean) => (
      <div key={vehicle.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-start justify-between">
          <div className="flex items-center gap-3">
              {vehicle.photoDataUrl ? (
                  <img src={vehicle.photoDataUrl} alt="Veículo" className="w-10 h-10 rounded-full object-cover bg-gray-100" />
              ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <CameraIcon size={20} />
                  </div>
              )}
              <div>
                  <p className="font-medium text-gray-900">{vehicle.driverName}</p>
                  <p className="text-xs text-gray-500">{vehicle.licensePlate.toUpperCase()} • {vehicle.vehicleModel}</p>
              </div>
          </div>
          <button
              onClick={(e) => {
                  if (!isLast || isListExpanded) { // Prevent click propagation only if it's the last item in collapsed view
                      e.stopPropagation();
                  }
                  removeVehicle(vehicle.id)
              }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
              <Trash2 size={18} />
          </button>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Car className="text-blue-600" />
            Coleta Veicular
          </h1>
        </div>
        <div className="max-w-md mx-auto px-4 pb-3 flex items-center justify-center gap-2 border-t border-gray-100">
          <button 
              onClick={() => setSelectedRoute('MANAUS')}
              className={`px-6 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ease-in-out transform active:scale-95 ${
                  selectedRoute === 'MANAUS' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
              MANAUS
          </button>
          <button
              onClick={() => setSelectedRoute('SANTARÉM')}
              className={`px-6 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ease-in-out transform active:scale-95 ${
                  selectedRoute === 'SANTARÉM' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
              SANTARÉM
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 relative">
          <div className="absolute top-0 right-0 p-4">
             <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Novo Cadastro</span>
          </div>

          <PhotoUploader 
            key={formData.id}
            photoDataUrl={formData.photoDataUrl} 
            onPhotoSelect={handlePhotoSelect} 
          />

          <Input
            label="Nome do Motorista"
            name="driverName"
            value={formData.driverName}
            onChange={handleInputChange}
            placeholder="Ex: João da Silva"
            icon={<User size={18} />}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Placa (Padrão Brasileiro)"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleInputChange}
              placeholder="AAA-1B23"
              icon={<FileText size={18} />}
              className="uppercase"
              maxLength={8}
            />
             <Input
              label="Valor (R$)"
              name="value"
              type="text"
              inputMode="decimal"
              value={formData.value}
              onChange={handleInputChange}
              placeholder="R$ 0,00"
              icon={<DollarSign size={18} />}
            />
          </div>

          <Input
            label="Modelo do Veículo"
            name="vehicleModel"
            value={formData.vehicleModel}
            onChange={handleInputChange}
            placeholder="Selecione ou digite um modelo"
            icon={<Car size={18} />}
            list="vehicle-models-list"
          />
          <datalist id="vehicle-models-list">
            {vehicleModels.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>

          <button
            onClick={handleAddVehicle}
            disabled={!isFormValid || status !== AppStatus.IDLE}
            className={`w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white transition-all
              ${isFormValid && status === AppStatus.IDLE
                ? 'bg-gray-900 hover:bg-black shadow-md' 
                : 'bg-gray-300 cursor-not-allowed'}`}
          >
            <Plus size={20} />
            Adicionar à Lista
          </button>
          
        </div>

        {vehicleList.length > 0 && (
          <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                  <List size={16} />
                  Veículos Adicionados ({vehicleList.length})
              </h2>
              
              {!isListExpanded ? (
                  <div 
                    onClick={() => vehicleList.length > 1 && setIsListExpanded(true)} 
                    className={`${vehicleList.length > 1 ? 'cursor-pointer' : ''} space-y-2`}
                  >
                      {vehicleList.length > 1 && (
                          <p className="text-xs font-semibold text-center text-blue-600">
                              +{vehicleList.length - 1} registro(s) anterior(es)
                          </p>
                      )}
                      {renderVehicleCard(vehicleList[vehicleList.length - 1], true)}
                  </div>
              ) : (
                  <div className="space-y-3">
                      {[...vehicleList].reverse().map((vehicle) => renderVehicleCard(vehicle, false))}
                      {vehicleList.length > 1 && (
                          <button
                              onClick={() => setIsListExpanded(false)}
                              className="w-full text-center text-sm text-blue-600 font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors mt-2"
                          >
                              Mostrar apenas o último
                          </button>
                      )}
                  </div>
              )}
          </div>
        )}

        {status === AppStatus.SUCCESS && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700 animate-fade-in">
            <CheckCircle size={24} />
            <div>
              <p className="font-semibold">Documento Salvo!</p>
              <p className="text-sm">A planilha com {vehicleList.length > 0 ? vehicleList.length : 'os'} registros foi gerada.</p>
            </div>
          </div>
        )}

         {status === AppStatus.ERROR && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
             <p className="font-semibold">Erro</p>
             <p className="text-sm">Não foi possível salvar o documento.</p>
          </div>
        )}

      </main>

      {vehicleList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
              <span>Total de registros: <strong>{vehicleList.length}</strong></span>
            </div>
            <button
              onClick={generateAndSavePDF}
              disabled={status !== AppStatus.IDLE && status !== AppStatus.SUCCESS}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white shadow-lg transition-all transform active:scale-95
                ${status === AppStatus.IDLE || status === AppStatus.SUCCESS 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                  : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {status === AppStatus.GENERATING_PDF ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {statusMessage}
                </>
              ) : (
                <>
                  <UploadCloud size={20} />
                  Gerar Planilha PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}