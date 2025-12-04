export interface VehicleData {
  id: string;
  driverName: string;
  companyName?: string;
  licensePlate: string;
  vehicleModel: string;
  value: string;
  photoDataUrl: string | null;
  paymentStatus: 'Pago' | 'Pendente';
}

export interface User {
  name: string;
}

export interface ExtractedVehicleInfo {
  licensePlate?: string;
  vehicleModel?: string;
}
