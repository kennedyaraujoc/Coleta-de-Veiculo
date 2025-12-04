import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Car, User as UserIcon, FileText, DollarSign, UploadCloud, CheckCircle, Loader2, Plus, Trash2, List, Camera as CameraIcon, LogOut, Building2 } from 'lucide-react';
import { Input } from './components/Input';
import { PhotoUploader } from './components/PhotoUploader';
import { VehicleData, User } from './types';
import { LoginScreen } from './components/LoginScreen';
import { extractVehicleInfoFromImage } from './services/ai.ts';


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
type AnalysisStatus = 'IDLE' | 'ANALYZING' | 'SUCCESS' | 'ERROR';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [vehicleList, setVehicleList] = useState<VehicleData[]>([]);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption>('MANAUS');
  
  const initialFormData = {
    id: Date.now().toString(),
    driverName: '',
    companyName: '',
    licensePlate: '',
    vehicleModel: '',
    value: '',
    photoDataUrl: null,
    paymentStatus: 'Pendente' as 'Pago' | 'Pendente',
  };

  const [formData, setFormData] = useState<VehicleData>(initialFormData);

  const [pdfStatus, setPdfStatus] = useState<'IDLE' | 'GENERATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('IDLE');
  const [statusMessage, setStatusMessage] = useState('');
  
  const licensePlateRegex = /^[A-Z]{3}-?[0-9][A-Z0-9]{3}$/;

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setVehicleList([]);
    resetForm();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'licensePlate') {
      const maskedValue = applyPlateMask(value);
      setFormData(prev => ({ ...prev, [name]: maskedValue }));
    } else if (name === 'value') {
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

  const applyPlateMask = (plate: string) => {
    const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let maskedValue = cleaned;
    if (cleaned.length > 3) {
      maskedValue = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
    }
    return maskedValue.substring(0, 8);
  };

  const handlePhotoSelect = async (dataUrl: string | null) => {
    setFormData(prev => ({ ...prev, photoDataUrl: dataUrl }));
    if (dataUrl) {
      setAnalysisStatus('ANALYZING');
      setStatusMessage('Analisando imagem...');
      try {
        const info = await extractVehicleInfoFromImage(dataUrl);
        setFormData(prev => ({
          ...prev,
          licensePlate: info.licensePlate ? applyPlateMask(info.licensePlate) : prev.licensePlate,
          vehicleModel: info.vehicleModel || prev.vehicleModel,
        }));
        setAnalysisStatus('SUCCESS');
        setStatusMessage('Informações extraídas!');
      } catch (error) {
        setAnalysisStatus('ERROR');
        setStatusMessage((error as Error).message);
      }
    } else {
        setAnalysisStatus('IDLE');
    }
  };

  useEffect(() => {
    if (analysisStatus === 'SUCCESS' || analysisStatus === 'ERROR') {
      const timer = setTimeout(() => setAnalysisStatus('IDLE'), 3000);
      return () => clearTimeout(timer);
    }
  }, [analysisStatus]);


  const resetForm = () => {
    setFormData({ ...initialFormData, id: Date.now().toString() });
  };

  const handleAddVehicle = () => {
    const finalPlate = formData.licensePlate.replace('-', '');
    if (!formData.driverName || !finalPlate || !formData.value) {
      alert("Por favor, preencha todos os campos obrigatórios (Motorista, Placa e Valor).");
      return;
    }

    if (!licensePlateRegex.test(formData.licensePlate)) {
        alert("Placa inválida. Use o formato brasileiro padrão (ex: ABC-1234 ou ABC1B23).");
        return;
    }

    setVehicleList(prev => [...prev, formData]);
    setIsListExpanded(false);
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

    setPdfStatus('GENERATING');
    setStatusMessage('Gerando planilha PDF...');

    try {
      const doc = new jsPDF();
      
      const pdfTitle = selectedRoute === 'MANAUS' 
        ? 'Relatório de Veículos de Manaus à Santarém'
        : 'Relatório de Veículos de Santarém à Manaus';

      doc.setFontSize(18);
      doc.text(pdfTitle, 14, 20);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50);
      doc.text(`Funcionário: ${currentUser?.name}`, 14, 26);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 32);

      let yPos = 40;
      const rowHeight = 22;
      const pageHeight = doc.internal.pageSize.height;
      const photoSize = 16;

      const cols = {
        photo:    { x: 10,  w: 20, title: 'Foto' },
        driver:   { x: 30,  w: 45, title: 'Motorista / Empresa' },
        plate:    { x: 75,  w: 25, title: 'Placa' },
        model:    { x: 100, w: 35, title: 'Modelo' },
        value:    { x: 135, w: 20, title: 'Valor' },
        status:   { x: 155, w: 20, title: 'Status' },
        sign:     { x: 175, w: 25, title: 'Assinatura' }
      };
      
      const tableWidth = Object.values(cols).reduce((sum, col) => sum + col.w, 0);
      const tableEndX = cols.photo.x + tableWidth;

      doc.setFillColor(240, 240, 240);
      doc.rect(cols.photo.x, yPos - 5, tableWidth, 7, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      
      Object.values(cols).forEach(col => {
        doc.text(col.title, col.x + 2, yPos);
      });
      
      yPos += 2;
      doc.setLineWidth(0.5);
      doc.line(cols.photo.x, yPos, tableEndX, yPos);
      
      doc.setFont("helvetica", "normal");
      
      for (const vehicle of vehicleList) {
        if (yPos + rowHeight > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }

        const currentY = yPos + (rowHeight / 2);

        if (vehicle.photoDataUrl) {
          try {
            doc.addImage(vehicle.photoDataUrl, 'JPEG', cols.photo.x + 2, currentY - (photoSize/2), photoSize, photoSize);
          } catch(e) { console.error("Error adding image to PDF", e); }
        }

        doc.setFontSize(9);
        doc.text(vehicle.driverName, cols.driver.x + 2, currentY - 1, { maxWidth: cols.driver.w - 4 });
        if (vehicle.companyName) {
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text(vehicle.companyName, cols.driver.x + 2, currentY + 4, { maxWidth: cols.driver.w - 4 });
            doc.setTextColor(0);
        }

        doc.setFontSize(9);
        doc.text(vehicle.licensePlate, cols.plate.x + 2, currentY + 2);
        doc.text(vehicle.vehicleModel, cols.model.x + 2, currentY + 2, { maxWidth: cols.model.w - 4 });
        doc.text(vehicle.value, cols.value.x + 2, currentY + 2);
        
        if (vehicle.paymentStatus === 'Pago') {
            doc.setFillColor(34, 197, 94); // green
            doc.setTextColor(34, 197, 94);
            doc.circle(cols.status.x + 4, currentY + 1.5, 1.5, 'F');
            doc.text("Pago", cols.status.x + 7, currentY + 2);
        } else {
            doc.setFillColor(239, 68, 68); // red
            doc.setTextColor(239, 68, 68);
            doc.circle(cols.status.x + 4, currentY + 1.5, 1.5, 'F');
            doc.text("Pendente", cols.status.x + 7, currentY + 2);
        }
        doc.setTextColor(0);

        doc.setLineWidth(0.1);
        doc.line(cols.sign.x + 2, currentY + 4, cols.sign.x + cols.sign.w - 2, currentY + 4);

        yPos += rowHeight;
        doc.setDrawColor(200);
        doc.line(cols.photo.x, yPos, tableEndX, yPos);
      }
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado por: ${currentUser?.name}`, 14, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 35, pageHeight - 10);
      }
      
      doc.save(`Relatorio_Frota_${Date.now()}.pdf`);

      setPdfStatus('SUCCESS');
      setStatusMessage('Planilha salva com sucesso!');
      
      setTimeout(() => {
        setPdfStatus('IDLE');
        setVehicleList([]);
      }, 3000);

    } catch (error) {
      console.error("PDF Error", error);
      setPdfStatus('ERROR');
      setStatusMessage('Erro ao gerar documento.');
    }
  };
  
  const isFormValid = formData.driverName && licensePlateRegex.test(formData.licensePlate) && formData.value && analysisStatus !== 'ANALYZING';

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
                  <p className="text-xs text-gray-500">{vehicle.licensePlate.toUpperCase()} • {vehicle.paymentStatus}</p>
              </div>
          </div>
          <button
              onClick={(e) => {
                  if (!isLast || isListExpanded) e.stopPropagation();
                  removeVehicle(vehicle.id)
              }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
              <Trash2 size={18} />
          </button>
      </div>
  );

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  
  const isAnalyzing = analysisStatus === 'ANALYZING';

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="text-blue-600" size={20}/>
            <span className="font-semibold text-gray-800">{currentUser.name}</span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1.5">
            Sair
            <LogOut size={16} />
          </button>
        </div>
        <div className="max-w-md mx-auto px-4 pb-3 flex items-center justify-center gap-2 border-t border-gray-100">
          <button 
              onClick={() => setSelectedRoute('MANAUS')}
              className={`px-6 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ease-in-out transform active:scale-95 ${
                  selectedRoute === 'MANAUS' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          > MANAUS </button>
          <button
              onClick={() => setSelectedRoute('SANTARÉM')}
              className={`px-6 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ease-in-out transform active:scale-95 ${
                  selectedRoute === 'SANTARÉM' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          > SANTARÉM </button>
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
            isAnalyzing={isAnalyzing}
          />

          {analysisStatus !== 'IDLE' && (
             <div className={`text-center text-sm p-2 mb-4 rounded-md ${analysisStatus === 'ANALYZING' ? 'bg-blue-50 text-blue-700' : analysisStatus === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {statusMessage}
             </div>
          )}

          <Input
            label="Nome do Motorista"
            name="driverName"
            value={formData.driverName}
            onChange={handleInputChange}
            placeholder="Ex: João da Silva"
            icon={<UserIcon size={18} />}
          />
          <Input
            label="Nome da Empresa (Opcional)"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder="Ex: Transportes Brasil"
            icon={<Building2 size={18} />}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Placa"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleInputChange}
              placeholder="AAA-1B23"
              icon={isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              className="uppercase"
              maxLength={8}
              disabled={isAnalyzing}
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
            icon={isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Car size={18} />}
            list="vehicle-models-list"
            disabled={isAnalyzing}
          />
          <datalist id="vehicle-models-list">
            {vehicleModels.map((model) => (<option key={model} value={model} />))}
          </datalist>
          
          <div className="mt-4 mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status do Pagamento</label>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'Pago' }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${formData.paymentStatus === 'Pago' ? 'bg-green-500 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >Pago</button>
              <button 
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'Pendente' }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${formData.paymentStatus === 'Pendente' ? 'bg-red-500 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >Pendente</button>
            </div>
          </div>


          <button
            onClick={handleAddVehicle}
            disabled={!isFormValid || pdfStatus !== 'IDLE'}
            className={`w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white transition-all
              ${isFormValid && pdfStatus === 'IDLE' ? 'bg-gray-900 hover:bg-black shadow-md' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            <Plus size={20} />
            Adicionar à Lista
          </button>
        </div>

        {vehicleList.length > 0 && (
          <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2"><List size={16} /> Veículos Adicionados ({vehicleList.length})</h2>
              {!isListExpanded ? (
                  <div onClick={() => vehicleList.length > 1 && setIsListExpanded(true)} className={`${vehicleList.length > 1 ? 'cursor-pointer' : ''} space-y-2`}>
                      {vehicleList.length > 1 && (<p className="text-xs font-semibold text-center text-blue-600">+{vehicleList.length - 1} registro(s) anterior(es)</p>)}
                      {renderVehicleCard(vehicleList[vehicleList.length - 1], true)}
                  </div>
              ) : (
                  <div className="space-y-3">
                      {[...vehicleList].reverse().map((vehicle) => renderVehicleCard(vehicle, false))}
                      {vehicleList.length > 1 && (<button onClick={() => setIsListExpanded(false)} className="w-full text-center text-sm text-blue-600 font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors mt-2">Mostrar apenas o último</button>)}
                  </div>
              )}
          </div>
        )}

        {pdfStatus === 'SUCCESS' && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700 animate-fade-in">
            <CheckCircle size={24} /><p className="font-semibold">Documento Salvo!</p>
          </div>
        )}
         {pdfStatus === 'ERROR' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"><p className="font-semibold">Erro ao salvar.</p></div>
        )}
      </main>

      {vehicleList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="max-w-md mx-auto">
            <button
              onClick={generateAndSavePDF}
              disabled={pdfStatus !== 'IDLE' && pdfStatus !== 'SUCCESS'}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white shadow-lg transition-all transform active:scale-95
                ${pdfStatus === 'IDLE' || pdfStatus === 'SUCCESS' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {pdfStatus === 'GENERATING' ? (<><Loader2 className="animate-spin" size={20} />{statusMessage}</>) : (<><UploadCloud size={20} />Gerar Planilha PDF</>)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
