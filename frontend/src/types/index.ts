export interface VitalReading {
  heartRate: number;
  spo2: number;
  systolic: number;
  diastolic: number;
  temperature: number;
  respiratoryRate: number;
  timestamp: number;
}

export interface Patient {
  patientId: string;
  name: string;
  age: number;
  gender: string;
  ward: string;
  bedNumber: string;
  assignedDoctor: string;
  status: 'active' | 'discharged';
  isSimulated: boolean;
  contactNumber?: string;
  emergencyContact?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
}

export interface Alert {
  alertId: string;
  patientId: string;
  severity: 'warning' | 'critical';
  message: string;
  triggeredAt: number;
  resolvedAt: number | null;
  isResolved: boolean;
  aiExplanation?: string;
  recommendations?: string[];
  vitalsAtTrigger?: VitalReading;
}
