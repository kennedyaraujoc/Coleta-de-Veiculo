export interface VehicleData {
  id: string;
  driverName: string;
  licensePlate: string;
  vehicleModel: string;
  value: string;
  photoDataUrl: string | null;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING_PDF = 'GENERATING_PDF',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
