import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getSessionPointCount } from '../services/db';
import { getDefaultConfig, getRuntimeState, isTrackingRunning, startTracking, stopTracking, type TrackingConfig } from '../services/locationTracking';

type RootStackParamList = {
  Home: undefined;
  Setup: undefined;
  'Sessions/Export': undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const parsePositive = (v: string, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const HomeScreen = ({ navigation }: Props): React.JSX.Element => {
  const defaults = getDefaultConfig();
  const [running, setRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [timeIntervalMs, setTimeIntervalMs] = useState(String(defaults.timeIntervalMs));
  const [distanceIntervalM, setDistanceIntervalM] = useState(String(defaults.distanceIntervalM));
  const [deferredInterval, setDeferredInterval] = useState(String(defaults.deferredUpdatesIntervalMs));
  const [deferredDistance, setDeferredDistance] = useState(String(defaults.deferredUpdatesDistanceM));

  useEffect(() => {
    const refresh = async (): Promise<void> => {
      const tracking = await isTrackingRunning();
      const runtime = getRuntimeState();
      setRunning(tracking);
      setActiveSessionId(runtime.activeSessionId);
      setLastUpdate(runtime.lastUpdateTs);
      if (runtime.activeSessionId) {
        setPointCount(getSessionPointCount(runtime.activeSessionId));
      } else {
        setPointCount(0);
      }
    };

    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const onStart = async (): Promise<void> => {
    const config: TrackingConfig = {
      timeIntervalMs: parsePositive(timeIntervalMs, defaults.timeIntervalMs),
      distanceIntervalM: parsePositive(distanceIntervalM, defaults.distanceIntervalM),
      deferredUpdatesIntervalMs: parsePositive(deferredInterval, defaults.deferredUpdatesIntervalMs),
      deferredUpdatesDistanceM: parsePositive(deferredDistance, defaults.deferredUpdatesDistanceM),
    };
    const sessionId = await startTracking(config);
    setRunning(true);
    setActiveSessionId(sessionId);
  };

  const onStop = async (): Promise<void> => {
    await stopTracking();
    setRunning(false);
    setActiveSessionId(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Samsung GPS Background Tester</Text>
      <Text>Tracking: {running ? 'ATTIVO' : 'FERMO'}</Text>
      <Text>Sessione: {activeSessionId ?? 'nessuna'}</Text>
      <Text>Ultimo update: {lastUpdate ?? 'n/d'}</Text>
      <Text>Punti raccolti nella sessione: {pointCount}</Text>

      <Text style={styles.section}>Configurazione</Text>
      <Text>timeInterval (ms)</Text>
      <TextInput value={timeIntervalMs} onChangeText={setTimeIntervalMs} keyboardType="number-pad" style={styles.input} />
      <Text>distanceInterval (m)</Text>
      <TextInput value={distanceIntervalM} onChangeText={setDistanceIntervalM} keyboardType="number-pad" style={styles.input} />
      <Text>deferredUpdatesInterval (ms)</Text>
      <TextInput value={deferredInterval} onChangeText={setDeferredInterval} keyboardType="number-pad" style={styles.input} />
      <Text>deferredUpdatesDistance (m)</Text>
      <TextInput value={deferredDistance} onChangeText={setDeferredDistance} keyboardType="number-pad" style={styles.input} />
      <Text style={styles.help}>
        deferredUpdates* permette al sistema di consegnare batch di punti meno frequenti per risparmio energetico.
      </Text>

      <View style={styles.spacer} />
      <Button title="Start tracking" onPress={onStart} disabled={running} />
      <View style={styles.spacer} />
      <Button title="Stop tracking" onPress={onStop} disabled={!running} />
      <View style={styles.spacer} />
      <Button title="Vai a Setup" onPress={() => navigation.navigate('Setup')} />
      <View style={styles.spacer} />
      <Button title="Vai a Sessions/Export" onPress={() => navigation.navigate('Sessions/Export')} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  section: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    padding: 8,
  },
  help: {
    fontSize: 12,
    color: '#555',
  },
  spacer: {
    height: 8,
  },
});
