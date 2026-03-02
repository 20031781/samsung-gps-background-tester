import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getSessionBounds,
  getSessionPointCount,
  getSessions,
  type SessionRow,
} from "../services/db";
import { getDiagnostics } from "../services/diagnostics";
import {
  clearExportsDirectory,
  exportSession,
  openFile,
  shareFile,
} from "../services/export";

type ExportResult = {
  csvUri: string;
  jsonlUri: string;
};

export const SessionsScreen = (): React.JSX.Element => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string>("");
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

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
    setLastExport(files);
    Alert.alert(
      "Export completato",
      `CSV: ${files.csvUri}\nJSONL: ${files.jsonlUri}`,
    );
  };

  const onDumpDiagnostics = async (): Promise<void> => {
    const d = await getDiagnostics();
    setDiagnostics(JSON.stringify(d, null, 2));
  };

  const onExportPress = (sessionId: string): void => {
    onExport(sessionId).catch((error: unknown) => {
      console.error("export failed", error);
      Alert.alert(
        "Errore export",
        error instanceof Error ? error.message : "Errore sconosciuto",
      );
    });
  };

  const onDumpDiagnosticsPress = (): void => {
    onDumpDiagnostics().catch((error: unknown) => {
      console.error("diagnostics failed", error);
      Alert.alert(
        "Errore diagnostics",
        error instanceof Error ? error.message : "Errore sconosciuto",
      );
    });
  };

  const onOpenFilePress = (uri: string): void => {
    openFile(uri).catch((error: unknown) => {
      console.error("open file failed", error);
      Alert.alert(
        "Errore apertura file",
        error instanceof Error ? error.message : "Errore sconosciuto",
      );
    });
  };

  const onShareFilePress = (uri: string): void => {
    shareFile(uri).catch((error: unknown) => {
      console.error("share file failed", error);
      Alert.alert(
        "Errore condivisione file",
        error instanceof Error ? error.message : "Errore sconosciuto",
      );
    });
  };

  const onClearExports = async (): Promise<number> => {
    const removed = await clearExportsDirectory();
    setLastExport(null);
    setDiagnostics("");
    refresh();
    return removed;
  };

  const onClearExportsPress = (): void => {
    onClearExports()
      .then((removed) => {
        Alert.alert("Cartella export svuotata", `Elementi rimossi: ${removed}`);
      })
      .catch((error: unknown) => {
        console.error("clear exports failed", error);
        Alert.alert(
          "Errore svuotamento cartella export",
          error instanceof Error ? error.message : "Errore sconosciuto",
        );
      });
  };

  const onConfirmClearExports = (): void => {
    Alert.alert(
      "Svuotare cartella export?",
      "Questa azione elimina tutti i file esportati.",
      [
        {
          text: "Annulla",
          style: "cancel",
        },
        {
          text: "Svuota",
          style: "destructive",
          onPress: onClearExportsPress,
        },
      ],
    );
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
            <Text>End: {bounds.lastTs ?? s.endedAt ?? "running/unknown"}</Text>
            <View style={styles.spacer} />
            <Button title="Seleziona" onPress={() => setSelected(s.id)} />
            <View style={styles.spacer} />
            <Button
              title="Export CSV + JSONL"
              onPress={() => onExportPress(s.id)}
            />
          </View>
        );
      })}

      <Text>Sessione selezionata: {selected ?? "nessuna"}</Text>
      <View style={styles.spacer} />
      <Button title="Svuota cartella export" onPress={onConfirmClearExports} />

      {lastExport ? (
        <View style={styles.exportBox}>
          <Text style={styles.sectionTitle}>Ultimo export</Text>
          <Text numberOfLines={1}>CSV: {lastExport.csvUri}</Text>
          <View style={styles.spacer} />
          <Button
            title="Apri CSV"
            onPress={() => onOpenFilePress(lastExport.csvUri)}
          />
          <View style={styles.spacer} />
          <Button
            title="Condividi CSV"
            onPress={() => onShareFilePress(lastExport.csvUri)}
          />
          <View style={styles.spacer} />
          <Text numberOfLines={1}>JSONL: {lastExport.jsonlUri}</Text>
          <View style={styles.spacer} />
          <Button
            title="Apri JSONL"
            onPress={() => onOpenFilePress(lastExport.jsonlUri)}
          />
          <View style={styles.spacer} />
          <Button
            title="Condividi JSONL"
            onPress={() => onShareFilePress(lastExport.jsonlUri)}
          />
        </View>
      ) : null}

      <View style={styles.spacer} />
      <Button title="Dump diagnostics" onPress={onDumpDiagnosticsPress} />
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
    fontWeight: "600",
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  exportBox: {
    borderWidth: 1,
    borderColor: "#777",
    borderRadius: 6,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  spacer: {
    height: 8,
  },
  code: {
    fontFamily: "monospace",
    fontSize: 12,
    marginTop: 8,
  },
});
