export interface VehicleData {
  id: string;
  driverName: string;
  licensePlate: string;
  vehicleModel: string;
  value: string;
  photoDataUrl: string | null;
}

export interface ExtractedVehicleInfo {
  licensePlate: string;
  vehicleModel: string;
}

export interface User {
  name: string;
}
