import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { initialWorkshops } from "../../data/workshops";

function mapWorkshop(record) {
  return {
    id: record.id,
    title: record.title,
    speaker: record.speaker,
    room: record.room,
    date: record.date_text,
    seatsLeft: record.seats_left,
    totalSeats: record.total_seats,
    fee: record.fee,
    status: record.status,
    summaryStatus: record.summary_status,
    summary: record.summary
  };
}

export function useWorkshopData({ token, role, setSessionMessage }) {
  const [workshops, setWorkshops] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [workshopPage, setWorkshopPage] = useState(1);
  const [workshopPagination, setWorkshopPagination] = useState(null);
  const [isLoadingBackendData, setIsLoadingBackendData] = useState(false);

  useEffect(() => {
    if (!token) return;
    let mounted = true;

    async function loadWorkshops() {
      if (mounted) setIsLoadingBackendData(true);
      try {
        const workshopResult = await api.getWorkshops(token, { page: workshopPage, pageSize: 10 });
        if (!mounted) return;
        const items = Array.isArray(workshopResult) ? workshopResult : workshopResult.data;
        setWorkshops((items || []).map(mapWorkshop));
        if (!Array.isArray(workshopResult) && workshopResult.pagination) {
          setWorkshopPagination(workshopResult.pagination);
        } else {
          setWorkshopPagination(null);
        }

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
        setWorkshops(initialWorkshops);
        setSessionMessage(error.message || "Could not load workshop data.");
      } finally {
        if (mounted) setIsLoadingBackendData(false);
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
    reloadWorkshops,
    goToWorkshopPage
  };
}
