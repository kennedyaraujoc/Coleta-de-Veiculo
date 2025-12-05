import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Car, User as UserIcon, FileText, DollarSign, UploadCloud, Loader2, List, Camera as CameraIcon, LogOut, Building2, Edit, Trash2 } from 'lucide-react';
import { Input } from './components/Input';
import { PhotoUploader } from './components/PhotoUploader';
import { LoginScreen } from './components/LoginScreen';
import { extractVehicleInfoFromImage } from './services/ai.ts';
import { supabase } from './services/supabase';

interface VehicleData {
  id: string;
  driverName: string;
  companyName: string;
  licensePlate: string;
  vehicleModel: string;
  value: string;
  photoDataUrl: string | null;
  paymentStatus: 'Pago' | 'Pendente';
  foto_url?: string;
}

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

const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]); 
  let n = bstr.length; 
  const u8arr = new Uint8Array(n);
  while(n--){ u8arr[n] = bstr.charCodeAt(n); }
  return new Blob([u8arr], {type:mime});
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [vehicleList, setVehicleList] = useState<VehicleData[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<'MANAUS' | 'SANTARÉM'>('MANAUS');
  const [loadingData, setLoadingData] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormData: VehicleData = {
    id: '', driverName: '', companyName: '', licensePlate: '', vehicleModel: '', value: '', photoDataUrl: null, paymentStatus: 'Pendente',
  };

  const [formData, setFormData] = useState<VehicleData>(initialFormData);
  const [pdfStatus, setPdfStatus] = useState<'IDLE' | 'GENERATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [analysisStatus, setAnalysisStatus] = useState<'IDLE' | 'ANALYZING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({ name: session.user.email?.split('@')[0], email: session.user.email, id: session.user.id });
        carregarDadosDoBanco();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({ name: session.user.email?.split('@')[0], email: session.user.email, id: session.user.id });
        carregarDadosDoBanco();
      } else {
        setCurrentUser(null);
        setVehicleList([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const carregarDadosDoBanco = async () => {
    setLoadingData(true);
    const { data } = await supabase.from('coletas').select('*').order('created_at', { ascending: false });
    if (data) {
      setVehicleList(data.map((item: any) => ({
        id: item.id,
        driverName: item.motorista || '',
        companyName: item.empresa || '',
        licensePlate: item.placa || '',
        vehicleModel: item.modelo || '',
        value: item.valor || '',
        paymentStatus: item.status === 'Pago' ? 'Pago' : 'Pendente',
        photoDataUrl: item.foto_url || null, 
        foto_url: item.foto_url
      })));
    }
    setLoadingData(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setVehicleList([]);
    resetForm();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'licensePlate') setFormData(prev => ({ ...prev, [name]: value.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 8) }));
    else if (name === 'value') {
      const onlyDigits = value.replace(/\D/g, '');
      if (!onlyDigits) { setFormData(prev => ({ ...prev, value: '' })); return; }
      setFormData(prev => ({ ...prev, value: (parseFloat(onlyDigits) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }));
    } else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = async (dataUrl: string | null) => {
    setFormData(prev => ({ ...prev, photoDataUrl: dataUrl }));
    if (dataUrl) {
      setAnalysisStatus('ANALYZING');
      setStatusMessage('Analisando imagem...');
      try {
        const info = await extractVehicleInfoFromImage(dataUrl);
        setFormData(prev => ({ ...prev, licensePlate: info.licensePlate || prev.licensePlate, vehicleModel: info.vehicleModel || prev.vehicleModel }));
        setAnalysisStatus('SUCCESS'); setStatusMessage('Informações extraídas!');
      } catch (error) { setAnalysisStatus('ERROR'); setStatusMessage('Erro na leitura.'); }
    } else setAnalysisStatus('IDLE');
  };

  const resetForm = () => { setFormData({ ...initialFormData }); setEditingId(null); };

  const handleSaveVehicle = async () => {
    if (!formData.driverName || !formData.licensePlate || !formData.value) return alert("Preencha Motorista, Placa e Valor.");
    setLoadingData(true);
    let publicPhotoUrl = formData.foto_url || null;

    try {
      if (formData.photoDataUrl && formData.photoDataUrl.startsWith('data:image')) {
        const fileBlob = dataURLtoBlob(formData.photoDataUrl);
        const fileName = `${currentUser.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('fotos').upload(fileName, fileBlob);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(fileName);
          publicPhotoUrl = publicUrl;
        }
      }
      const dadosParaBanco = {
        motorista: formData.driverName, empresa: formData.companyName, placa: formData.licensePlate,
        modelo: formData.vehicleModel, valor: formData.value, status: formData.paymentStatus,
        user_id: currentUser.id, foto_url: publicPhotoUrl
      };

      if (editingId) await supabase.from('coletas').update(dadosParaBanco).eq('id', editingId);
      else await supabase.from('coletas').insert([dadosParaBanco]);
      
      carregarDadosDoBanco();
      resetForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) { alert('Erro: ' + error.message); } 
    finally { setLoadingData(false); }
  };

  // --- TRAVA DE SEGURANÇA RECOLOCADA AQUI ---
  const removeVehicle = async (id: string, fotoUrl?: string) => {
    // 1. Pergunta antes de fazer qualquer coisa
    if (!confirm("Tem certeza que deseja excluir este veículo?")) {
      return; // Se clicar em Cancelar, para tudo
    }

    setLoadingData(true);
    if (fotoUrl) {
       try {
         const path = fotoUrl.split('/fotos/')[1];
         if (path) await supabase.storage.from('fotos').remove([path]);
       } catch (e) { console.error("Erro foto", e); }
    }
    const { error } = await supabase.from('coletas').delete().eq('id', id);
    if (error) alert('Erro do Banco: ' + error.message);
    else carregarDadosDoBanco();
    setLoadingData(false);
  };

  // --- TRAVA DE SEGURANÇA RECOLOCADA AQUI TAMBÉM ---
  const removeAllVehicles = async () => {
    // 1. Pergunta com aviso forte
    if (!confirm("ATENÇÃO: Isso apagará TODOS os veículos da lista. Deseja continuar?")) {
      return; // Para tudo se cancelar
    }

    setLoadingData(true);
    const { data: items } = await supabase.from('coletas').select('foto_url').eq('user_id', currentUser.id);
    if (items) {
      const fotos = items.filter(i => i.foto_url).map(i => i.foto_url!.split('/fotos/')[1]).filter(p => p);
      if (fotos.length) await supabase.storage.from('fotos').remove(fotos);
    }
    const { error } = await supabase.from('coletas').delete().eq('user_id', currentUser.id);
    if (error) alert('Erro do Banco: ' + error.message);
    else setVehicleList([]);
    setLoadingData(false);
  };

  const startEditing = (vehicle: VehicleData) => {
    setEditingId(vehicle.id);
    setFormData({ ...vehicle });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Lógica do PDF em Tabela (igual ao ANTES.pdf)
  const generateAndSavePDF = async () => {
    if (vehicleList.length === 0) return alert("Lista vazia.");
    setPdfStatus('GENERATING');
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
          doc.setFillColor(240, 240, 240);
          doc.rect(cols.photo.x, yPos - 5, tableWidth, 7, 'F');
          doc.setFont("helvetica", "bold");
          Object.values(cols).forEach(col => doc.text(col.title, col.x + 2, yPos));
          yPos += 2;
          doc.setFont("helvetica", "normal");
        }

        const currentY = yPos + (rowHeight / 2);

        if (vehicle.photoDataUrl) {
          try {
            doc.addImage(vehicle.photoDataUrl, 'JPEG', cols.photo.x + 2, currentY - (photoSize/2), photoSize, photoSize);
          } catch(e) { console.error("PDF Image Error", e); }
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
      
      const pageCount = (doc as any).internal.pages.length;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado por: ${currentUser?.name}`, 14, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 35, pageHeight - 10);
      }
      
      doc.save(`Relatorio_Frota_${Date.now()}.pdf`);
      setPdfStatus('SUCCESS'); setTimeout(() => setPdfStatus('IDLE'), 3000);
    } catch (e) { setPdfStatus('ERROR'); }
  };

  if (!currentUser) return <LoginScreen onLogin={(user) => { setCurrentUser(user); carregarDadosDoBanco(); }} />;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm p-4 flex justify-between items-center">
        <div className="flex gap-2 items-center"><UserIcon className="text-blue-600"/> <b>{currentUser.name}</b></div>
        <button onClick={handleLogout} className="text-gray-500"><LogOut size={20}/></button>
      </header>
      
      <div className="p-4 flex justify-center gap-2 bg-white border-b">
         <button onClick={() => setSelectedRoute('MANAUS')} className={`px-4 py-1 rounded-full text-sm font-bold ${selectedRoute === 'MANAUS' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>MANAUS</button>
         <button onClick={() => setSelectedRoute('SANTARÉM')} className={`px-4 py-1 rounded-full text-sm font-bold ${selectedRoute === 'SANTARÉM' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>SANTARÉM</button>
      </div>

      <main className="max-w-md mx-auto p-4">
        <div className={`bg-white rounded-xl shadow-sm p-6 border ${editingId ? 'border-yellow-400' : 'border-gray-100'} relative`}>
          <div className="absolute top-2 right-2 text-xs font-bold text-gray-400">{editingId ? 'EDITANDO' : 'NOVO'}</div>
          <PhotoUploader photoDataUrl={formData.photoDataUrl} onPhotoSelect={handlePhotoSelect} isAnalyzing={analysisStatus === 'ANALYZING'} />
          
          <Input label="Motorista" name="driverName" value={formData.driverName} onChange={handleInputChange} placeholder="Nome" icon={<UserIcon size={18} />} />
          <Input label="Empresa" name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Empresa (Opc)" icon={<Building2 size={18} />} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Placa" name="licensePlate" value={formData.licensePlate} onChange={handleInputChange} placeholder="ABC-1234" icon={<FileText size={18} />} className="uppercase" maxLength={8} />
            <Input label="Valor" name="value" value={formData.value} onChange={handleInputChange} placeholder="R$ 0,00" icon={<DollarSign size={18} />} />
          </div>
          <Input label="Modelo" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} placeholder="Modelo" icon={<Car size={18} />} list="models" />
          <datalist id="models">{vehicleModels.map(m => <option key={m} value={m} />)}</datalist>

          <div className="mt-4 flex gap-2">
             <button onClick={() => setFormData(p => ({...p, paymentStatus: 'Pago'}))} className={`flex-1 py-2 rounded ${formData.paymentStatus === 'Pago' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>Pago</button>
             <button onClick={() => setFormData(p => ({...p, paymentStatus: 'Pendente'}))} className={`flex-1 py-2 rounded ${formData.paymentStatus === 'Pendente' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>Pendente</button>
          </div>

          <div className="flex gap-2 mt-6">
            {editingId && <button onClick={resetForm} className="px-4 bg-gray-200 rounded text-gray-700">Cancelar</button>}
            <button onClick={handleSaveVehicle} disabled={loadingData} className={`flex-1 py-3 rounded text-white font-bold ${editingId ? 'bg-yellow-500' : 'bg-gray-900'}`}>
              {loadingData ? <Loader2 className="animate-spin mx-auto"/> : (editingId ? 'Salvar Alteração' : 'Adicionar')}
            </button>
          </div>
        </div>

        {vehicleList.length > 0 && (
          <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-gray-500 flex items-center gap-2"><List size={16} /> Salvos ({vehicleList.length})</h2>
                <button onClick={removeAllVehicles} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-red-200">
                  <Trash2 size={12} /> Limpar Lista
                </button>
              </div>

              <div className="space-y-3">
                  {vehicleList.map((vehicle) => (
                    <div key={vehicle.id} className="bg-white p-3 rounded-lg border shadow-sm flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          {vehicle.photoDataUrl ? <img src={vehicle.photoDataUrl} className="w-10 h-10 rounded-full object-cover bg-gray-100"/> : <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><CameraIcon size={20} className="text-gray-400"/></div>}
                          <div><p className="font-bold text-sm">{vehicle.driverName}</p><p className="text-xs text-gray-500">{vehicle.licensePlate} • {vehicle.paymentStatus}</p></div>
                       </div>
                       <div className="flex gap-1">
                          <button onClick={() => startEditing(vehicle)} className="p-2 text-blue-500 bg-blue-50 rounded"><Edit size={16}/></button>
                          <button onClick={() => removeVehicle(vehicle.id, vehicle.foto_url)} className="p-2 text-red-500 bg-red-50 rounded"><Trash2 size={16}/></button>
                       </div>
                    </div>
                  ))}
              </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 w-full bg-white border-t p-4 z-30">
        <button onClick={generateAndSavePDF} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2">
           {pdfStatus === 'GENERATING' ? <Loader2 className="animate-spin"/> : <UploadCloud/>} Gerar PDF
        </button>
      </div>
    </div>
  );
}