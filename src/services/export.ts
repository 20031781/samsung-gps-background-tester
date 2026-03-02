import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";

import { getSessionPointsChunk, writeLog } from "./db";

const chunkSize = 500;

const ensureDir = async (): Promise<string> => {
  if (!FileSystem.documentDirectory) {
    throw new Error("Directory documenti non disponibile");
  }
  const base = `${FileSystem.documentDirectory}exports/`;
  const info = await FileSystem.getInfoAsync(base);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(base, { intermediates: true });
  }
  return base;
};

const appendFile = async (uri: string, content: string): Promise<void> => {
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
    append: true,
  });
};

const mapRow = (row: Record<string, unknown>) => ({
  id: row.id,
  sessionId: row.sessionId,
  seq: row.seq,
  ts: row.ts,
  lat: row.lat,
  lon: row.lon,
  acc: row.acc,
  alt: row.alt,
  altitudeAccuracy: row.altitudeAccuracy,
  speed: row.speed,
  heading: row.heading,
  rawJson: row.rawJson,
});

export const exportSession = async (
  sessionId: string,
): Promise<{ csvUri: string; jsonlUri: string }> => {
  const dir = await ensureDir();
  const csvUri = `${dir}${sessionId}.csv`;
  const jsonlUri = `${dir}${sessionId}.jsonl`;

  await FileSystem.writeAsStringAsync(
    csvUri,
    "id,sessionId,seq,ts,lat,lon,acc,alt,altitudeAccuracy,speed,heading\n",
    { encoding: FileSystem.EncodingType.UTF8 },
  );
  await FileSystem.writeAsStringAsync(jsonlUri, "", {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let offset = 0;
  while (true) {
    const rows = getSessionPointsChunk(sessionId, chunkSize, offset);
    if (!rows.length) {
      break;
    }

    const csvChunk = rows
      .map(mapRow)
      .map((r) =>
        [
          r.id,
          r.sessionId,
          r.seq,
          r.ts,
          r.lat,
          r.lon,
          r.acc,
          r.alt,
          r.altitudeAccuracy,
          r.speed,
          r.heading,
        ].join(","),
      )
      .join("\n");

    const jsonlChunk = rows
      .map(mapRow)
      .map((r) => JSON.stringify(r))
      .join("\n");

    await appendFile(csvUri, `${csvChunk}\n`);
    await appendFile(jsonlUri, `${jsonlChunk}\n`);

    offset += rows.length;
  }

  writeLog("info", "export", `Export completato per ${sessionId}`);
  return { csvUri, jsonlUri };
};

export const shareFile = async (uri: string): Promise<void> => {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing non disponibile su questo device");
  }
  await Sharing.shareAsync(uri);
};

export const openFile = async (uri: string): Promise<void> => {
  const targetUri =
    Platform.OS === "android" ? await FileSystem.getContentUriAsync(uri) : uri;
  await Linking.openURL(targetUri);
};

export const clearExportsDirectory = async (): Promise<number> => {
  const dir = await ensureDir();
  const entries = await FileSystem.readDirectoryAsync(dir);

  await FileSystem.deleteAsync(dir, { idempotent: true });
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  writeLog(
    "info",
    "export",
    `Cartella export svuotata (${entries.length} elementi).`,
  );
  return entries.length;
};
