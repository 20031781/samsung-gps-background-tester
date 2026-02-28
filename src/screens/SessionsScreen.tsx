import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDiagnostics } from '../services/diagnostics';
import { getSessionBounds, getSessionPointCount, getSessions, type SessionRow } from '../services/db';
import { exportSession, shareFile } from '../services/export';

export const SessionsScreen = (): React.JSX.Element => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string>('');

  const refresh = (): void => {
    setSessions(getSessions());
    if (!selected && getSessions().length > 0) {
      setSelected(getSessions()[0].id);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onExport = async (sessionId: string): Promise<void> => {
    const files = await exportSession(sessionId);
    await shareFile(files.csvUri);
    await shareFile(files.jsonlUri);
    Alert.alert('Export completato', `CSV: ${files.csvUri}\nJSONL: ${files.jsonlUri}`);
  };

  const onDumpDiagnostics = async (): Promise<void> => {
    const d = await getDiagnostics();
    setDiagnostics(JSON.stringify(d, null, 2));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sessions & Export</Text>
      <Button title="Refresh" onPress={refresh} />
      <View style={styles.spacer} />
      {sessions.map((s) => {
        const cnt = getSessionPointCount(s.id);
        const bounds = getSessionBounds(s.id);
        return (
          <View key={s.id} style={styles.card}>
            <Text>ID: {s.id}</Text>
            <Text>Punti: {cnt}</Text>
            <Text>Start: {bounds.firstTs ?? s.startedAt}</Text>
            <Text>End: {bounds.lastTs ?? s.endedAt ?? 'running/unknown'}</Text>
            <View style={styles.spacer} />
            <Button title="Seleziona" onPress={() => setSelected(s.id)} />
            <View style={styles.spacer} />
            <Button title="Export CSV + JSONL" onPress={() => void onExport(s.id)} />
          </View>
        );
      })}

      <Text>Sessione selezionata: {selected ?? 'nessuna'}</Text>
      <View style={styles.spacer} />
      <Button title="Dump diagnostics" onPress={() => void onDumpDiagnostics()} />
      {diagnostics ? <Text style={styles.code}>{diagnostics}</Text> : null}
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
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  spacer: {
    height: 8,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 8,
  },
});
