import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, storageKeys } from "../api/client";
import SectionCard from "../components/SectionCard";
import { useAuth } from "../context/AuthContext";

export default function CheckerScreen() {
  const { token } = useAuth();
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
      if (!permission) {
        await requestPermission();
      }
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
      const syncedCount = Array.isArray(result?.items)
        ? result.items.filter((item) => item.status === "SYNCED").length
        : 0;
      setStatus(`Synced ${syncedCount} check-ins`);
      await saveQueue([]);
    } catch (e) {
      Alert.alert("Sync failed", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SectionCard>
        <Text style={styles.title}>Checker Scan</Text>
        {permission && !permission.granted ? (
          <Text style={styles.meta}>Camera permission denied. Please enable camera access in settings.</Text>
        ) : null}
        <Text style={styles.meta}>Mode: {online ? "Online" : "Offline"}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setOnline((v) => !v)}>
            <Text>Switch {online ? "Offline" : "Online"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={onSync}>
            <Text>Sync Queue</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#22c55e" }]}
          onPress={() => setScannerVisible(true)}
          disabled={permission ? !permission.granted : true}
        >
          <Text style={styles.actionText}>Open Camera Scanner</Text>
        </TouchableOpacity>
        <TextInput value={qrCode} onChangeText={setQrCode} placeholder="Paste scanned QR payload" style={styles.input} />
        <TouchableOpacity style={styles.actionBtn} onPress={onScan}>
          <Text style={styles.actionText}>Scan / Submit QR</Text>
        </TouchableOpacity>
        <Text style={styles.meta}>{status}</Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Offline Queue ({queue.length})</Text>
        <FlatList
          data={queue}
          keyExtractor={(item) => item.offlineSyncId}
          renderItem={({ item }) => <Text style={styles.meta}>• {item.offlineSyncId}</Text>}
        />
      </SectionCard>

      <Modal visible={scannerVisible} animationType="slide">
        <SafeAreaView style={styles.scannerContainer}>
          <Text style={styles.title}>Scan QR Code</Text>
          <View style={styles.scannerBox}>
            {permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => {
                  if (scanning) return;
                  setScanning(true);
                  setScannerVisible(false);
                  setQrCode(data);
                  submitQrPayload(data).finally(() => setScanning(false));
                }}
              />
            ) : (
              <Text style={styles.meta}>Requesting camera permission...</Text>
            )}
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setScannerVisible(false)}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef4ff", padding: 10 },
  title: { fontWeight: "700", color: "#1e3a8a", fontSize: 16, marginBottom: 8 },
  meta: { color: "#334155", marginBottom: 6, fontSize: 12 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  navBtn: { flex: 1, borderWidth: 1, borderColor: "#93c5fd", backgroundColor: "#fff", borderRadius: 8, padding: 10, alignItems: "center" },
  input: { borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8, padding: 10, backgroundColor: "#fff", marginBottom: 8 },
  actionBtn: { backgroundColor: "#1e3a8a", borderRadius: 8, padding: 10, alignItems: "center", marginBottom: 8 },
  actionText: { color: "#fff", fontWeight: "700" },
  scannerContainer: { flex: 1, backgroundColor: "#eef4ff", padding: 10 },
  scannerBox: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#0f172a",
    marginBottom: 12
  }
});
