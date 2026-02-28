import 'react-native-get-random-values';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import { endSession, getKv, insertPoint, insertSession, setKv, writeLog } from './db';

export const LOCATION_TASK_NAME = 'gps-background-task';

export type TrackingConfig = {
  timeIntervalMs: number;
  distanceIntervalM: number;
  deferredUpdatesIntervalMs: number;
  deferredUpdatesDistanceM: number;
};

const defaultConfig: TrackingConfig = {
  timeIntervalMs: 5000,
  distanceIntervalM: 5,
  deferredUpdatesIntervalMs: 15000,
  deferredUpdatesDistanceM: 20,
};

const safeTaskError = (error: unknown): string => (error instanceof Error ? error.message : JSON.stringify(error));

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    const msg = safeTaskError(error);
    console.error('[task-error]', msg);
    writeLog('error', 'task', msg);
    return;
  }

  const payload = data as Location.LocationTaskBody | undefined;
  if (!payload?.locations?.length) {
    return;
  }

  const sessionId = getKv('activeSessionId');
  if (!sessionId) {
    writeLog('warn', 'task', 'Ricevuto punto senza sessione attiva');
    return;
  }

  const appState = 'background';
  for (const location of payload.locations) {
    const seq = Number(getKv('seq') ?? '0') + 1;
    setKv('seq', `${seq}`);

    let batteryLevel: number | null = null;
    let batteryState: string | null = null;
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
      batteryState = String(await Battery.getBatteryStateAsync());
    } catch {
      batteryLevel = null;
      batteryState = null;
    }

    const raw = {
      ...location,
      providerStatus: payload?.locations?.[0]?.mocked,
      batteryLevel,
      batteryState,
      appState,
    };

    insertPoint({
      sessionId,
      seq,
      ts: new Date(location.timestamp).toISOString(),
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      acc: location.coords.accuracy ?? null,
      alt: location.coords.altitude ?? null,
      altitudeAccuracy: location.coords.altitudeAccuracy ?? null,
      speed: location.coords.speed ?? null,
      heading: location.coords.heading ?? null,
      rawJson: JSON.stringify(raw),
    });
  }

  setKv('lastUpdateTs', new Date().toISOString());
});

export const getDefaultConfig = (): TrackingConfig => defaultConfig;

export const requestPermissions = async (): Promise<{
  fgGranted: boolean;
  bgGranted: boolean;
  notificationsGranted: boolean;
}> => {
  const fg = await Location.requestForegroundPermissionsAsync();
  const bg = await Location.requestBackgroundPermissionsAsync();
  const notif = await Notifications.requestPermissionsAsync();

  return {
    fgGranted: fg.granted,
    bgGranted: bg.granted,
    notificationsGranted: notif.granted || notif.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
  };
};

export const startTracking = async (config: TrackingConfig): Promise<string> => {
  const sessionId = uuidv4();
  const startedAt = new Date().toISOString();
  setKv('activeSessionId', sessionId);
  setKv('seq', '0');
  setKv('lastUpdateTs', startedAt);
  setKv('config', JSON.stringify(config));

  insertSession({
    id: sessionId,
    startedAt,
    endedAt: null,
    configJson: JSON.stringify(config),
  });

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Highest,
    timeInterval: config.timeIntervalMs,
    distanceInterval: config.distanceIntervalM,
    deferredUpdatesInterval: config.deferredUpdatesIntervalMs,
    deferredUpdatesDistance: config.deferredUpdatesDistanceM,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: Platform.OS === 'android'
      ? {
          notificationTitle: 'Tracking attivo',
          notificationBody: 'Raccolta GPS in background in corso.',
          notificationColor: '#222222',
        }
      : undefined,
  });

  writeLog('info', 'tracking', `Sessione avviata: ${sessionId}`);
  return sessionId;
};

export const stopTracking = async (): Promise<void> => {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!running) {
    return;
  }
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

  const activeSessionId = getKv('activeSessionId');
  if (activeSessionId) {
    endSession(activeSessionId, new Date().toISOString());
  }
  setKv('activeSessionId', '');
  writeLog('info', 'tracking', 'Sessione terminata');
};

export const isTrackingRunning = async (): Promise<boolean> =>
  Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

export const getRuntimeState = (): {
  activeSessionId: string | null;
  lastUpdateTs: string | null;
  seq: number;
} => {
  const activeSessionId = getKv('activeSessionId');
  const lastUpdateTs = getKv('lastUpdateTs');
  const seq = Number(getKv('seq') ?? '0');
  return {
    activeSessionId: activeSessionId || null,
    lastUpdateTs,
    seq,
  };
};
