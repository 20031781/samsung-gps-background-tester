import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { getKv } from './db';

export type DiagnosticsDump = {
  platform: string;
  brand: string | null;
  manufacturer: string | null;
  model: string | null;
  osVersion: string | null;
  appVersion: string | null;
  buildVersion: string | null;
  permissions: {
    foreground: string;
    background: string;
  };
  locationServicesEnabled: boolean;
  batteryOptimization: string;
  lastTaskError: string;
};

export const isSamsungDevice = (): boolean => {
  if (Platform.OS !== 'android') {
    return false;
  }
  const b = `${Device.brand ?? ''} ${Device.manufacturer ?? ''}`.toLowerCase();
  return b.includes('samsung');
};

export const openLocationSettings = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
    return;
  }
  await Linking.openURL('app-settings:');
};

export const openNotificationSettings = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS);
    return;
  }
  await Linking.openURL('app-settings:');
};

export const openBatteryOptimizationSettings = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
};

export const getDiagnostics = async (): Promise<DiagnosticsDump> => {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();
  const servicesEnabled = await Location.hasServicesEnabledAsync();

  return {
    platform: Platform.OS,
    brand: Device.brand ?? null,
    manufacturer: Device.manufacturer ?? null,
    model: Device.modelName ?? null,
    osVersion: Device.osVersion ?? null,
    appVersion: Application.nativeApplicationVersion ?? null,
    buildVersion: Application.nativeBuildVersion ?? null,
    permissions: {
      foreground: fg.status,
      background: bg.status,
    },
    locationServicesEnabled: servicesEnabled,
    batteryOptimization: Platform.OS === 'android' ? 'unknown (Expo managed)' : 'n/a',
    lastTaskError: getKv('lastTaskError') ?? 'none',
  };
};
