import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { api } from "../../api/client";

export function useStudentData(token) {
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
    const workshopResult = await api.getWorkshops(token, targetPage, 10);
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
      sortOrder === "asc"
        ? String(a.date_text).localeCompare(String(b.date_text))
        : String(b.date_text).localeCompare(String(a.date_text))
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

  return {
    search,
    setSearch,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    pagination,
    registrations,
    notifications,
    confirmWorkshop,
    setConfirmWorkshop,
    paymentFlow,
    setPaymentFlow,
    registeredByWorkshop,
    filtered,
    confirmRegistration,
    runPayment
  };
}
