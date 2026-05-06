import { CameraView } from "expo-camera";
import React from "react";
import { FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import SectionCard from "../components/SectionCard";
import { useAuth } from "../context/AuthContext";
import { useCheckerData } from "../features/checker/useCheckerData";

export default function CheckerScreen() {
  const { token } = useAuth();
  const {
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
  } = useCheckerData(token);

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
