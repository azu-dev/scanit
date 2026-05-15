export interface ScannedItem {
  id: string;
  raw_value: string;
  format: string;
  scanned_at: string;
}

export type ScannerStateType = 'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR';

export interface ScanResult {
  text: string;
  format: string;
}
