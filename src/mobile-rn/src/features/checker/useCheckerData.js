import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { api, storageKeys } from "../../api/client";

export function useCheckerData(token) {
  const [qrCode, setQrCode] = useState("");
  const [queue, setQueue] = useState([]);
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState("No scan yet");
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(storageKeys.checkerQueue);
      if (raw) setQueue(JSON.parse(raw));
      if (!permission) await requestPermission();
    })();
  }, [permission, requestPermission]);

  const saveQueue = async (next) => {
    setQueue(next);
    await AsyncStorage.setItem(storageKeys.checkerQueue, JSON.stringify(next));
  };

  const submitQrPayload = async (payload) => {
    const value = String(payload || "").trim();
    if (!value) return;
    if (online) {
      try {
        const result = await api.verifyScan(token, value);
        setStatus(
          result.alreadyCheckedIn
            ? `Already checked in: ${result.studentName} - ${result.workshopTitle}`
            : `Checked in: ${result.studentName} - ${result.workshopTitle}`
        );
      } catch (e) {
        setStatus(e.message);
      }
    } else {
      const item = {
        registrationId: null,
        qrCode: value,
        offlineSyncId: `offline-${Date.now()}`,
        checkedInAt: new Date().toISOString()
      };
      const next = [...queue, item];
      await saveQueue(next);
      setStatus(`Saved offline (${next.length} queued)`);
    }
    setQrCode("");
  };

  const onScan = async () => submitQrPayload(qrCode);

  const onSync = async () => {
    if (queue.length === 0) return setStatus("Queue is empty");
    try {
      const result = await api.syncCheckins(token, queue);
      const syncedCount = Array.isArray(result?.items) ? result.items.filter((item) => item.status === "SYNCED").length : 0;
      setStatus(`Synced ${syncedCount} check-ins`);
      await saveQueue([]);
    } catch (e) {
      Alert.alert("Sync failed", e.message);
    }
  };

  return {
    qrCode,
    setQrCode,
    queue,
    online,
    setOnline,
    status,
    permission,
    scannerVisible,
    setScannerVisible,
    scanning,
    setScanning,
    submitQrPayload,
    onScan,
    onSync
  };
}
