import React, { useEffect, useState } from 'react';
import { Button, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { getDiagnostics, isSamsungDevice, openBatteryOptimizationSettings, openLocationSettings, openNotificationSettings } from '../services/diagnostics';
import { requestPermissions } from '../services/locationTracking';

type ChecklistState = {
  fg: string;
  bg: string;
  notifications: string;
  servicesEnabled: boolean;
  batteryStatus: string;
};

export const SetupScreen = (): React.JSX.Element => {
  const [state, setState] = useState<ChecklistState>({
    fg: 'unknown',
    bg: 'unknown',
    notifications: 'unknown',
    servicesEnabled: false,
    batteryStatus: 'unknown',
  });
  const [isSamsung, setIsSamsung] = useState(false);

  const refresh = async (): Promise<void> => {
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    const notif = await Notifications.getPermissionsAsync();
    const d = await getDiagnostics();

    setState({
      fg: fg.status,
      bg: bg.status,
      notifications: notif.granted ? 'granted' : notif.status,
      servicesEnabled: d.locationServicesEnabled,
      batteryStatus: d.batteryOptimization,
    });
    setIsSamsung(isSamsungDevice());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onRequestAll = async (): Promise<void> => {
    await requestPermissions();
    await refresh();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Setup guidato</Text>
      <Text>1) Foreground location: {state.fg}</Text>
      <Text>2) Background location: {state.bg}</Text>
      <Text>3) Notifiche: {state.notifications}</Text>
      <Text>4) Servizi posizione attivi: {state.servicesEnabled ? 'si' : 'no'}</Text>
      <Text>5) Battery optimization: {state.batteryStatus}</Text>

      <View style={styles.spacer} />
      <Button title="Request permissions (FG + BG + notifiche)" onPress={onRequestAll} />
      <View style={styles.spacer} />
      <Button title="Apri settings localizzazione" onPress={() => void openLocationSettings()} />
      <View style={styles.spacer} />
      <Button title="Apri settings notifiche" onPress={() => void openNotificationSettings()} />
      {Platform.OS === 'android' ? (
        <>
          <View style={styles.spacer} />
          <Button title="Apri battery optimization" onPress={() => void openBatteryOptimizationSettings()} />
        </>
      ) : null}

      <Text style={styles.section}>Note importanti</Text>
      <Text>- Su Android 12+ il tracking BG richiede foreground service con notifica persistente.</Text>
      <Text>- Imposta GPS su modalità precisa / high accuracy in impostazioni di sistema.</Text>
      <Text>- Se il sistema uccide la app, riapri e verifica sessione/diagnostica.</Text>

      {Platform.OS === 'android' && isSamsung ? (
        <View>
          <Text style={styles.section}>Samsung tips (solo Samsung)</Text>
          <Text>1. Device care → Battery → Background usage limits.</Text>
          <Text>2. Aggiungi l'app in Never sleeping apps.</Text>
          <Text>3. Disattiva eventuale Adaptive battery per l'app.</Text>
          <Text>4. Verifica permesso "Always allow" per location.</Text>
        </View>
      ) : null}

      <View style={styles.spacer} />
      <Button title="Refresh checklist" onPress={() => void refresh()} />
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
  },
  section: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 8,
  },
});
