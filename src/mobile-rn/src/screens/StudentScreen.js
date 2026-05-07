import React from "react";
import { FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import SectionCard from "../components/SectionCard";
import { useAuth } from "../context/AuthContext";
import { useStudentData } from "../features/student/useStudentData";
import { vnd } from "../utils/format";

export default function StudentScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const {
    search,
    setSearch,
    sortOrder,
    setSortOrder,
    pagination,
    registrations,
    notifications,
    confirmWorkshop,
    setConfirmWorkshop,
    paymentFlow,
    setPaymentFlow,
    registeredByWorkshop,
    filtered,
    setPage,
    confirmRegistration,
    runPayment
  } = useStudentData(token);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <SectionCard>
              <View style={styles.titleRow}>
                <Ionicons name="calendar-outline" size={16} color="#1e3a8a" />
                <Text style={styles.title}>Workshop Schedule</Text>
              </View>
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
          const soldOut = item.seats_left <= 0;
          const isRegistered = Boolean(reg) && !pending;
          const registerButtonStyle = [
            styles.actionBtn,
            styles.flexButton,
            styles.actionBtnInline,
            pending && styles.pendingBtn,
            isRegistered && styles.registeredBtn,
            soldOut && styles.soldOutBtn
          ];
          return (
            <SectionCard>
              <Text style={styles.workshopTitle}>{item.title}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={13} color="#475569" />
                <Text style={styles.meta}>{item.speaker} • {item.room} • {item.date_text}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="people-outline" size={13} color="#475569" />
                <Text style={styles.meta}>Seats: {item.seats_left}/{item.total_seats}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="cash-outline" size={13} color="#475569" />
                <Text style={styles.meta}>Fee: {item.fee === 0 ? "Free" : `${vnd(item.fee)} VND`}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="sparkles-outline" size={13} color="#475569" />
                <Text style={styles.meta}>AI summary: {item.summary_status}</Text>
              </View>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.navBtn, styles.flexButton]}
                  onPress={() => navigation.navigate("WorkshopDetail", { workshopId: item.id })}
                >
                  <View style={styles.btnLabelRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#1e3a8a" />
                    <Text>Details</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={registerButtonStyle}
                  disabled={Boolean(reg) || soldOut}
                  onPress={() => setConfirmWorkshop(item)}
                >
                  <Text style={styles.actionText}>
                    {soldOut ? "Sold Out" : pending ? "Pending Payment" : reg ? "Registered" : "Register"}
                  </Text>
                </TouchableOpacity>
              </View>
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
              <View style={styles.titleRow}>
                <Ionicons name="bookmarks-outline" size={16} color="#1e3a8a" />
                <Text style={styles.title}>My Workshops</Text>
              </View>
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
              <View style={styles.titleRow}>
                <Ionicons name="qr-code-outline" size={16} color="#1e3a8a" />
                <Text style={styles.title}>Your QR Tickets</Text>
              </View>
              {registrations.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.ticket}>
                  <Text style={styles.meta}>{item.workshop_title}</Text>
                  {item.qr_code ? <QRCode value={item.qr_code} size={80} /> : <Text style={styles.meta}>Pending payment</Text>}
                </View>
              ))}
            </SectionCard>

            <SectionCard>
              <View style={styles.titleRow}>
                <Ionicons name="notifications-outline" size={16} color="#1e3a8a" />
                <Text style={styles.title}>Notifications</Text>
              </View>
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  title: { fontWeight: "700", color: "#1e3a8a", fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: "#fff" },
  row: { flexDirection: "row", gap: 8 },
  flexButton: { flex: 1 },
  sortBtn: { flex: 1, borderWidth: 1, borderColor: "#93c5fd", borderRadius: 8, padding: 8, alignItems: "center", backgroundColor: "#fff" },
  sortBtnActive: { backgroundColor: "#dbeafe" },
  sortText: { color: "#1e3a8a", fontWeight: "600" },
  workshopTitle: { fontWeight: "700", color: "#1e3a8a", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  meta: { color: "#334155", marginBottom: 2, fontSize: 12 },
  btnLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: { backgroundColor: "#1e3a8a", borderRadius: 8, padding: 10, marginTop: 8, alignItems: "center" },
  actionBtnInline: { marginTop: 0 },
  pendingBtn: { backgroundColor: "#b45309" },
  registeredBtn: { backgroundColor: "#93c5fd" },
  soldOutBtn: { backgroundColor: "#64748b" },
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
