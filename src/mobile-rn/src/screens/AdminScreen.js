import React, { useEffect, useState } from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import SectionCard from "../components/SectionCard";
import { useAuth } from "../context/AuthContext";

export default function AdminScreen() {
  const { token } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [csvLog, setCsvLog] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const load = async () => {
    const [workshopResult, analyticsResult, csvResult] = await Promise.all([
      api.getWorkshops(token, 1, 20),
      api.getAdminAnalytics(token),
      api.getCsvLatest(token)
    ]);
    setWorkshops(workshopResult.data || []);
    setAnalytics(analyticsResult);
    setCsvLog(csvResult);
  };

  useEffect(() => {
    load().catch((e) => Alert.alert("Error", e.message));
  }, []);

  const createWorkshop = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.createWorkshop(token, { title: newTitle, speaker: "TBD", room: "TBD", date: "TBD", totalSeats: 60, fee: 0 });
      setNewTitle("");
      await load();
    } catch (e) {
      Alert.alert("Create failed", e.message);
    }
  };

  const cancelWorkshop = async (id) => {
    try {
      await api.cancelWorkshop(token, id);
      await load();
    } catch (e) {
      Alert.alert("Cancel failed", e.message);
    }
  };

  const uploadDoc = async (id) => {
    try {
      await api.uploadDocument(token, { workshopId: id, fileName: "workshop.pdf" });
      Alert.alert("Accepted", "PDF queued for async summary processing.");
    } catch (e) {
      Alert.alert("Upload failed", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SectionCard>
        <Text style={styles.title}>Admin Analytics</Text>
        <Text style={styles.meta}>Active workshops: {analytics?.activeCount ?? 0}</Text>
        <Text style={styles.meta}>Seats left: {analytics?.seatsLeft ?? 0}</Text>
        <Text style={styles.meta}>AI completed docs: {analytics?.aiCompleted ?? 0}</Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>CSV Sync Latest</Text>
        <Text style={styles.meta}>Processed: {csvLog?.processed_rows ?? 0}</Text>
        <Text style={styles.meta}>Invalid: {csvLog?.invalid_rows ?? 0}</Text>
        <Text style={styles.meta}>Conflicts: {csvLog?.upsert_conflicts ?? 0}</Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Create Workshop</Text>
        <TextInput style={styles.input} placeholder="Workshop title" value={newTitle} onChangeText={setNewTitle} />
        <TouchableOpacity style={styles.actionBtn} onPress={createWorkshop}>
          <Text style={styles.actionText}>Create</Text>
        </TouchableOpacity>
      </SectionCard>

      <FlatList
        data={workshops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <SectionCard>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.meta}>{item.room} • {item.date_text}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.navBtn} onPress={() => uploadDoc(item.id)}>
                <Text>Upload PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => cancelWorkshop(item.id)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef4ff", padding: 10 },
  title: { fontWeight: "700", color: "#1e3a8a", fontSize: 16, marginBottom: 8 },
  meta: { color: "#334155", marginBottom: 2, fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8, padding: 10, backgroundColor: "#fff" },
  actionBtn: { backgroundColor: "#1e3a8a", borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
  actionText: { color: "#fff", fontWeight: "700" },
  itemTitle: { fontWeight: "700", color: "#1e3a8a", marginBottom: 4 },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  navBtn: { flex: 1, borderWidth: 1, borderColor: "#93c5fd", backgroundColor: "#fff", borderRadius: 8, padding: 10, alignItems: "center" }
});
