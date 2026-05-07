import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { initialWorkshops } from "../../data/workshops";

function mapWorkshop(record) {
  const room = record.room || record.room_name || record.roomName || "TBD";
  const dateText = record.date_text || record.date || (record.start_time ? new Date(record.start_time).toLocaleString() : "TBD");
  return {
    id: record.id,
    title: record.title,
    speaker: record.speaker || null,
    room,
    date: dateText,
    seatsLeft: Number(record.seats_left ?? record.seatsLeft ?? Math.max(0, Number(record.capacity || record.total_seats || 0) - Number(record.registered_count || 0))),
    totalSeats: Number(record.total_seats ?? record.capacity ?? record.totalSeats ?? 0),
    fee: Number(record.fee ?? record.price ?? 0),
    status: record.status,
    summaryStatus: record.summary_status || record.document_status || record.summaryStatus || "PENDING",
    summary: record.summary || record.ai_summary || ""
  };
}

function extractWorkshopRows(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  return [];
}

export function useWorkshopData({ token, role, setSessionMessage }) {
  const [workshops, setWorkshops] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [workshopPage, setWorkshopPage] = useState(1);
  const [workshopPagination, setWorkshopPagination] = useState(null);
  const [isLoadingBackendData, setIsLoadingBackendData] = useState(false);
  const [workshopError, setWorkshopError] = useState("");
  const [hasLoadedWorkshops, setHasLoadedWorkshops] = useState(false);

  useEffect(() => {
    if (!token) return;
    let mounted = true;

    async function loadWorkshops() {
      if (mounted) setIsLoadingBackendData(true);
      try {
        const workshopResult = role === "ADMIN"
          ? await api.getAdminWorkshops(token, { page: workshopPage, pageSize: 10 })
          : await api.getWorkshops(token, { page: workshopPage, pageSize: 10 });
        if (!mounted) return;
        setWorkshopError("");
        const items = extractWorkshopRows(workshopResult);
        setWorkshops(items.map(mapWorkshop));
        setWorkshopPagination(workshopResult?.pagination || workshopResult?.data?.pagination || workshopResult?.data?.data?.pagination || null);

        if (role === "STUDENT") {
          const [registrations, notifications] = await Promise.all([
            api.getMyRegistrations(token),
            api.getMyNotifications(token)
          ]);
          if (!mounted) return;
          setMyRegistrations(Array.isArray(registrations) ? registrations : registrations?.data || []);
          setMyNotifications(Array.isArray(notifications) ? notifications : notifications?.data || []);
        } else {
          setMyRegistrations([]);
          setMyNotifications([]);
        }
      } catch (error) {
        if (!mounted) return;
        setWorkshops(initialWorkshops.slice(0, 0));
        setWorkshopError(error.message || "Could not load workshop data.");
        setSessionMessage(error.message || "Could not load workshop data.");
      } finally {
        if (mounted) {
          setIsLoadingBackendData(false);
          setHasLoadedWorkshops(true);
        }
      }
    }

    loadWorkshops();
    return () => {
      mounted = false;
    };
  }, [token, role, reloadFlag, workshopPage, setSessionMessage]);

  function reloadWorkshops() {
    setReloadFlag((v) => v + 1);
  }

  function goToWorkshopPage(page) {
    setWorkshopPage(page);
  }

  return {
    workshops,
    myRegistrations,
    myNotifications,
    workshopPagination,
    isLoadingBackendData,
    workshopError,
    hasLoadedWorkshops,
    reloadWorkshops,
    goToWorkshopPage
  };
}
