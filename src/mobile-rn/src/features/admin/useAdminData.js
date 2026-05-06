import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { api } from "../../api/client";

export function useAdminData(token) {
  const [workshops, setWorkshops] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [csvLog, setCsvLog] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const load = async (targetPage = page) => {
    const [workshopResult, analyticsResult, csvResult] = await Promise.all([
      api.getWorkshops(token, targetPage, 10),
      api.getAdminAnalytics(token),
      api.getCsvLatest(token)
    ]);
    setWorkshops(workshopResult.data || []);
    setPagination(workshopResult.pagination || null);
    setAnalytics(analyticsResult);
    setCsvLog(csvResult);
  };

  useEffect(() => {
    load(page).catch((e) => Alert.alert("Error", e.message));
  }, [page]);

  const createWorkshop = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.createWorkshop(token, { title: newTitle, speaker: "TBD", room: "TBD", date: "TBD", totalSeats: 60, fee: 0 });
      setNewTitle("");
      await load(page);
    } catch (e) {
      Alert.alert("Create failed", e.message);
    }
  };

  const cancelWorkshop = async (id) => {
    try {
      await api.cancelWorkshop(token, id);
      await load(page);
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

  return {
    workshops,
    analytics,
    csvLog,
    newTitle,
    setNewTitle,
    page,
    setPage,
    pagination,
    createWorkshop,
    cancelWorkshop,
    uploadDoc
  };
}
