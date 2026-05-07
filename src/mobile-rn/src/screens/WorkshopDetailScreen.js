import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import SectionCard from "../components/SectionCard";
import { api } from "../api/client";
import { vnd } from "../utils/format";

export default function WorkshopDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { workshopId } = route.params || {};
  const { token } = useAuth();
  const [workshop, setWorkshop] = useState(null);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const registrationByWorkshop = useMemo(
    () => new Map(myRegistrations.map((item) => [item.workshop_id, item])),
    [myRegistrations]
  );
  const registration = registrationByWorkshop.get(workshopId);

  useEffect(() => {
    let mounted = true;
    let intervalId;

    async function loadDetail() {
      if (!workshopId) {
        setError("Workshop not found.");
        setLoading(false);
        return;
      }
      try {
        const [detailResponse, regs] = await Promise.all([api.getWorkshopDetail(token, workshopId), api.getMyRegistrations(token)]);
        if (!mounted) return;
        const detail = detailResponse?.data || detailResponse;
        setWorkshop(detail);
        setMyRegistrations(regs || []);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Could not load workshop detail.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDetail();
    intervalId = setInterval(loadDetail, 15000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [token, workshopId]);

  async function onRegister() {
    if (!workshop) return;
    try {
      setSubmitting(true);
      const result = await api.registerWorkshop(token, workshop.id);
      if (result.requires_payment) {
        Alert.alert("Reserved", "Seat reserved. Please complete payment from Workshops screen.");
      } else {
        Alert.alert("Success", "Workshop registered successfully.");
      }
      const regs = await api.getMyRegistrations(token);
      setMyRegistrations(regs || []);
    } catch (e) {
      Alert.alert("Registration failed", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#1e3a8a" />
          <Text style={styles.meta}>Loading workshop detail...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !workshop) {
    return (
      <SafeAreaView style={styles.container}>
        <SectionCard>
          <Text style={styles.errorText}>{error || "Workshop not found."}</Text>
        </SectionCard>
      </SafeAreaView>
    );
  }

  const soldOut = workshop.seats_left <= 0;
  const pendingPayment = registration?.status === "PENDING_PAYMENT";
  const isRegistered = Boolean(registration) && !pendingPayment;
  const registerButtonStyle = [
    styles.actionBtn,
    pendingPayment && styles.pendingBtn,
    isRegistered && styles.registeredBtn,
    soldOut && styles.soldOutBtn
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <SectionCard>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={styles.backRow}>
              <Ionicons name="arrow-back-outline" size={14} color="#1e3a8a" />
              <Text style={styles.backText}>Back to workshops</Text>
            </View>
          </TouchableOpacity>
        </SectionCard>
        <SectionCard>
          <Text style={styles.title}>{workshop.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color="#475569" />
            <Text style={styles.meta}>Speaker: {workshop.speaker || "TBD"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#475569" />
            <Text style={styles.meta}>Room: {workshop.room}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="play-circle-outline" size={14} color="#475569" />
            <Text style={styles.meta}>Start: {new Date(workshop.start_time).toLocaleString()}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="stop-circle-outline" size={14} color="#475569" />
            <Text style={styles.meta}>End: {new Date(workshop.end_time).toLocaleString()}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color="#475569" />
            <Text style={styles.meta}>Seats left: {workshop.seats_left}/{workshop.total_seats}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="cash-outline" size={14} color="#475569" />
            <Text style={styles.meta}>Fee: {workshop.fee === 0 ? "Free" : `${vnd(workshop.fee)} VND`}</Text>
          </View>
          <Text style={styles.description}>{workshop.description || "No detailed description."}</Text>
        </SectionCard>

        {workshop.room_map_image_url ? (
          <SectionCard>
            <View style={styles.titleRow}>
              <Ionicons name="map-outline" size={16} color="#1e3a8a" />
              <Text style={styles.title}>Room Map</Text>
            </View>
            <Image source={{ uri: workshop.room_map_image_url }} style={styles.mapImage} resizeMode="cover" />
          </SectionCard>
        ) : null}

        <SectionCard>
          <TouchableOpacity
            style={registerButtonStyle}
            onPress={onRegister}
            disabled={Boolean(registration) || soldOut || submitting}
          >
            <View style={styles.actionRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.actionText}>
                {submitting
                  ? "Registering..."
                  : soldOut
                  ? "Sold Out"
                  : registration?.status === "PENDING_PAYMENT"
                  ? "Pending Payment"
                  : registration
                  ? "Registered"
                  : "Register Workshop"}
              </Text>
            </View>
          </TouchableOpacity>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef4ff", padding: 10 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  title: { fontWeight: "700", color: "#1e3a8a", fontSize: 16, marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  meta: { color: "#334155", marginBottom: 4, fontSize: 12 },
  description: { color: "#0f172a", marginTop: 8, fontSize: 13, lineHeight: 19 },
  mapImage: { width: "100%", height: 180, borderRadius: 10, borderWidth: 1, borderColor: "#dbeafe" },
  actionBtn: { backgroundColor: "#1e3a8a", borderRadius: 8, padding: 12, alignItems: "center" },
  pendingBtn: { backgroundColor: "#b45309" },
  registeredBtn: { backgroundColor: "#93c5fd" },
  soldOutBtn: { backgroundColor: "#64748b" },
  actionText: { color: "#fff", fontWeight: "700" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { color: "#b91c1c", fontWeight: "600" }
  ,
  backBtn: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#93c5fd", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#fff" },
  backText: { color: "#1e3a8a", fontWeight: "600" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4 }
});
