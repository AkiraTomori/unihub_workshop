import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { useNetInfo } from "@react-native-community/netinfo";
import { api } from "../../api/client";
import {
  clearSyncedCheckins,
  createOfflineSyncId,
  getPendingCheckins,
  getQueuedCheckins,
  initCheckinQueueStore,
  markQueuedCheckinsFailed,
  markSyncResults,
  upsertQueuedCheckin
} from "../../storage/checkinQueueStore";

export function useCheckerData(token) {
  const [qrCode, setQrCode] = useState("");
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState("No scan yet");
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [storeReady, setStoreReady] = useState(false);
  const netInfo = useNetInfo();

  const online = useMemo(
    () => netInfo.isConnected !== false && netInfo.isInternetReachable !== false,
    [netInfo.isConnected, netInfo.isInternetReachable]
  );

  const refreshQueue = useCallback(async () => {
    const records = await getQueuedCheckins();
    setQueue(records);
  }, []);

  const syncPendingQueue = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;
      const pending = await getPendingCheckins();
      if (pending.length === 0) {
        if (!silent) setStatus("Queue is empty");
        return;
      }

      if (!online) {
        if (!silent) setStatus("Offline - scans will sync when the network returns");
        return;
      }

      const items = pending.map((item) => ({
        qrCode: item.qrCode,
        offlineSyncId: item.offlineSyncId,
        checkedInAt: item.checkedInAt,
        deviceId: item.deviceId
      }));

      try {
        const result = await api.syncCheckins(token, items);
        const acceptedItems = Array.isArray(result?.items) ? result.items : [];
        await markSyncResults(acceptedItems);
        await refreshQueue();

        const syncedCount = acceptedItems.filter((item) => {
          const normalized = String(item?.status || "").toUpperCase();
          return normalized === "SYNCED" || normalized === "DUPLICATE" || normalized === "UPDATED";
        }).length;
        const duplicateCount = acceptedItems.filter((item) => {
          const normalized = String(item?.status || "").toUpperCase();
          return normalized === "DUPLICATE" || normalized === "UPDATED";
        }).length;

        if (!silent) {
          setStatus(`Synced ${syncedCount} queued check-ins`);
          if (duplicateCount > 0) {
            Alert.alert(
              "Duplicate scan",
              "One or more scans were already checked in. Existing records were updated instead of creating duplicates."
            );
          }
        }
      } catch (error) {
        await markQueuedCheckinsFailed(pending, error.message || "SYNC_FAILED");
        await refreshQueue();
        if (!silent) {
          setStatus(`Sync failed: ${error.message}`);
        }
      }
    },
    [online, refreshQueue, token]
  );

  useEffect(() => {
    (async () => {
      await initCheckinQueueStore();
      await refreshQueue();
      if (!permission) await requestPermission();
      setStoreReady(true);
    })();
  }, [permission, refreshQueue, requestPermission]);

  useEffect(() => {
    if (!storeReady || !online) return;
    syncPendingQueue({ silent: true }).catch((error) => {
      setStatus(error.message || "Auto sync failed");
    });
  }, [online, storeReady, syncPendingQueue]);

  const submitQrPayload = async (payload) => {
    const value = String(payload || "").trim();
    if (!value) return;

    const offlineSyncId = createOfflineSyncId();
    const checkedInAt = new Date().toISOString();

    if (online) {
      try {
        const result = await api.verifyScan(token, value);
        setStatus(
          result.alreadyCheckedIn
            ? `Already checked in: ${result.studentName} - ${result.workshopTitle}`
            : `Checked in: ${result.studentName} - ${result.workshopTitle}`
        );
        setQrCode("");
        return;
      } catch (e) {
        if (!e.isNetworkError) {
          setStatus(e.message);
          setQrCode("");
          return;
        }

        await upsertQueuedCheckin({
          offlineSyncId,
          qrCode: value,
          checkedInAt,
          deviceId: "mobile-checker"
        });
        await refreshQueue();
        setStatus(`Network error, saved offline (${e.message})`);
        setQrCode("");
        return;
      }
    }

    const localResult = await upsertQueuedCheckin({
      offlineSyncId,
      qrCode: value,
      checkedInAt,
      deviceId: "mobile-checker"
    });
    await refreshQueue();
    if (localResult.wasDuplicate) {
      const message = "Duplicate scan detected. Existing offline record was updated.";
      setStatus(message);
      Alert.alert("Duplicate scan", message);
    } else {
      setStatus("Saved offline. It will sync when connectivity returns.");
    }
    setQrCode("");
  };

  const onScan = async () => submitQrPayload(qrCode);

  const onSync = async () => {
    if (!token) return;
    try {
      await syncPendingQueue({ silent: false });
    } catch (e) {
      Alert.alert("Sync failed", e.message);
    }
  };

  const pendingCount = queue.filter((item) => item.status !== "SYNCED").length;

  return {
    qrCode,
    setQrCode,
    queue,
    online,
    pendingCount,
    status,
    permission,
    scannerVisible,
    setScannerVisible,
    scanning,
    setScanning,
    submitQrPayload,
    onScan,
    onSync,
    clearSyncedCheckins: async () => {
      await clearSyncedCheckins();
      await refreshQueue();
    }
  };
}
