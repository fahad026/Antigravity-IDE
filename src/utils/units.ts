import type { UnitPreferences } from '../types/telemetry';

export const DEFAULT_UNITS: UnitPreferences = {
  pressure: 'BAR',
  temperature: 'C',
  flow: 'SM3H',
  vibration: 'MMS',
};

export function formatPressure(bar: number, unit: 'BAR' | 'PSI', decimals = 2): string {
  if (unit === 'PSI') {
    return `${(bar * 14.50377).toFixed(decimals)} PSI`;
  }
  return `${bar.toFixed(decimals)} Bar`;
}

export function formatPressureValue(bar: number, unit: 'BAR' | 'PSI', decimals = 2): number {
  if (unit === 'PSI') {
    return Number((bar * 14.50377).toFixed(decimals));
  }
  return Number(bar.toFixed(decimals));
}

export function formatTemperature(celsius: number, unit: 'C' | 'F', decimals = 1): string {
  if (unit === 'F') {
    return `${(celsius * 1.8 + 32).toFixed(decimals)} °F`;
  }
  return `${celsius.toFixed(decimals)} °C`;
}

export function formatTemperatureValue(celsius: number, unit: 'C' | 'F', decimals = 1): number {
  if (unit === 'F') {
    return Number((celsius * 1.8 + 32).toFixed(decimals));
  }
  return Number(celsius.toFixed(decimals));
}

export function formatFlow(sm3h: number, unit: 'SM3H' | 'MMSCFD'): string {
  if (unit === 'MMSCFD') {
    const mmscfd = (sm3h * 35.3147) / 1000000 * 24;
    return `${mmscfd.toFixed(2)} MMSCFD`;
  }
  return `${sm3h.toLocaleString()} Sm³/h`;
}

export function formatVibration(mms: number, unit: 'MMS' | 'IPS', decimals = 2): string {
  if (unit === 'IPS') {
    return `${(mms / 25.4).toFixed(decimals)} in/s`;
  }
  return `${mms.toFixed(decimals)} mm/s`;
}
