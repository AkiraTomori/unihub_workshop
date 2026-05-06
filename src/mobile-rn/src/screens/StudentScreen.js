import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { api } from "../api/client";
import SectionCard from "../components/SectionCard";
import { useAuth } from "../context/AuthContext";
import { vnd } from "../utils/format";

export default function StudentScreen() {
  const { token } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [confirmWorkshop, setConfirmWorkshop] = useState(null);
  const [paymentFlow, setPaymentFlow] = useState(null);

  const loadData = async (targetPage = page) => {
    const workshopResult = await api.getWorkshops(token, targetPage, 8);
    setWorkshops(workshopResult.data || []);
    setPagination(workshopResult.pagination || null);
    const [regs, notifs] = await Promise.all([api.getMyRegistrations(token), api.getMyNotifications(token)]);
    setRegistrations(regs || []);
    setNotifications(notifs || []);
  };

  useEffect(() => {
    loadData(page).catch((e) => Alert.alert("Error", e.message));
  }, [page]);

  const registeredByWorkshop = useMemo(
    () => new Map(registrations.map((item) => [item.workshop_id, item])),
    [registrations]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = workshops.filter((w) =>
      [w.title, w.speaker, w.room, w.date_text].some((field) => String(field || "").toLowerCase().includes(q))
    );
    return list.sort((a, b) =>
      sortOrder === "asc" ? String(a.date_text).localeCompare(String(b.date_text)) : String(b.date_text).localeCompare(String(a.date_text))
    );
  }, [workshops, search, sortOrder]);

  const confirmRegistration = async () => {
    if (!confirmWorkshop) return;
    const workshop = confirmWorkshop;
    setConfirmWorkshop(null);
    try {
      const registration = await api.registerWorkshop(token, workshop.id);
      if (registration.requires_payment) {
        setPaymentFlow({
          workshop,
          registrationId: registration.id,
          idempotencyKey: `${registration.id}-${Date.now()}`
        });
      } else {
        Alert.alert("Success", `Registered for ${workshop.title}`);
      }
      await loadData(page);
    } catch (e) {
      Alert.alert("Registration failed", e.message);
    }
  };

  const runPayment = async (simulateResult = "success") => {
    if (!paymentFlow) return;
    try {
      const result = await api.checkoutPayment(token, paymentFlow.registrationId, paymentFlow.idempotencyKey, simulateResult);
      if (result.status === "CONFIRMED") {
        Alert.alert("Payment success", "Registration confirmed and QR issued.");
        setPaymentFlow(null);
      } else {
        Alert.alert("Payment pending", result.message || "Please retry.");
      }
      await loadData(page);
    } catch (e) {
      Alert.alert("Payment failed", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <SectionCard>
              <Text style={styles.title}>Workshop Schedule</Text>
              <TextInput value={search} onChangeText={setSearch} placeholder="Search workshop..." style={styles.input} />
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.sortBtn, sortOrder === "asc" && styles.sortBtnActive]}
                  onPress={() => setSortOrder("asc")}
                >
                  <Text style={styles.sortText}>Date Asc</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortBtn, sortOrder === "desc" && styles.sortBtnActive]}
                  onPress={() => setSortOrder("desc")}
                >
                  <Text style={styles.sortText}>Date Desc</Text>
                </TouchableOpacity>
              </View>
            </SectionCard>
          </View>
        }
        renderItem={({ item }) => {
          const reg = registeredByWorkshop.get(item.id);
          const pending = reg?.status === "PENDING_PAYMENT";
          return (
            <SectionCard>
              <Text style={styles.workshopTitle}>{item.title}</Text>
              <Text style={styles.meta}>{item.speaker} • {item.room} • {item.date_text}</Text>
              <Text style={styles.meta}>Seats: {item.seats_left}/{item.total_seats}</Text>
              <Text style={styles.meta}>Fee: {item.fee === 0 ? "Free" : `${vnd(item.fee)} VND`}</Text>
              <Text style={styles.meta}>AI summary: {item.summary_status}</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                disabled={Boolean(reg) || item.seats_left <= 0}
                onPress={() => setConfirmWorkshop(item)}
              >
                <Text style={styles.actionText}>
                  {item.seats_left <= 0 ? "Sold Out" : pending ? "Pending Payment" : reg ? "Registered" : "Register"}
                </Text>
              </TouchableOpacity>
            </SectionCard>
          );
        }}
        ListFooterComponent={
          <View>
            <SectionCard>
              <Text style={styles.meta}>Page {pagination?.page || 1} / {pagination?.totalPages || 1}</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  disabled={!pagination?.hasPrevPage}
                  style={styles.navBtn}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!pagination?.hasNextPage}
                  style={styles.navBtn}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Text>Next</Text>
                </TouchableOpacity>
              </View>
            </SectionCard>

            <SectionCard>
              <Text style={styles.title}>My Workshops</Text>
              {registrations.length === 0 ? (
                <Text style={styles.meta}>You have not registered for any workshops yet.</Text>
              ) : (
                registrations.map((reg) => (
                  <View key={reg.id} style={styles.myWorkshopItem}>
                    <Text style={styles.meta}>{reg.workshop_title}</Text>
                    <Text style={styles.metaSmall}>{reg.workshop_date}</Text>
                    <Text style={styles.metaSmall}>Status: {reg.status}</Text>
                  </View>
                ))
              )}
            </SectionCard>

            <SectionCard>
              <Text style={styles.title}>Your QR Tickets</Text>
              {registrations.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.ticket}>
                  <Text style={styles.meta}>{item.workshop_title}</Text>
                  {item.qr_code ? <QRCode value={item.qr_code} size={80} /> : <Text style={styles.meta}>Pending payment</Text>}
                </View>
              ))}
            </SectionCard>

            <SectionCard>
              <Text style={styles.title}>Notifications</Text>
              {(notifications || []).slice(0, 5).map((n) => (
                <Text key={n.id} style={styles.meta}>
                  • {n.title} ({n.channel})
                </Text>
              ))}
            </SectionCard>
          </View>
        }
      />

      <Modal visible={Boolean(confirmWorkshop)} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Confirm Registration</Text>
            <Text style={styles.meta}>{confirmWorkshop?.title}</Text>
            <Text style={styles.meta}>{confirmWorkshop?.fee === 0 ? "Free" : `${vnd(confirmWorkshop?.fee)} VND`}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.navBtn} onPress={() => setConfirmWorkshop(null)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={confirmRegistration}>
                <Text style={styles.actionText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(paymentFlow)} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Complete Payment</Text>
            <Text style={styles.meta}>{paymentFlow?.workshop?.title}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.navBtn} onPress={() => setPaymentFlow(null)}>
                <Text>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => runPayment("timeout")}>
                <Text>Timeout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => runPayment("success")}>
                <Text style={styles.actionText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef4ff", padding: 10 },
  title: { fontWeight: "700", color: "#1e3a8a", fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: "#fff" },
  row: { flexDirection: "row", gap: 8 },
  sortBtn: { flex: 1, borderWidth: 1, borderColor: "#93c5fd", borderRadius: 8, padding: 8, alignItems: "center", backgroundColor: "#fff" },
  sortBtnActive: { backgroundColor: "#dbeafe" },
  sortText: { color: "#1e3a8a", fontWeight: "600" },
  workshopTitle: { fontWeight: "700", color: "#1e3a8a", marginBottom: 4 },
  meta: { color: "#334155", marginBottom: 2, fontSize: 12 },
  actionBtn: { backgroundColor: "#1e3a8a", borderRadius: 8, padding: 10, marginTop: 8, alignItems: "center" },
  actionText: { color: "#fff", fontWeight: "700" },
  navBtn: { borderWidth: 1, borderColor: "#93c5fd", borderRadius: 8, padding: 10, alignItems: "center", flex: 1, backgroundColor: "#fff" },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "center", alignItems: "center", padding: 16 },
  modal: { width: "100%", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#dbeafe" },
  ticket: { borderWidth: 1, borderColor: "#dbeafe", borderRadius: 10, padding: 8, marginBottom: 8, alignItems: "center", backgroundColor: "#fff" }
  ,
  myWorkshopItem: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    backgroundColor: "#fff"
  },
  metaSmall: { color: "#64748b", marginBottom: 2, fontSize: 11 }
});
