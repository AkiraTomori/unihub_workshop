import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CircleDollarSign, MapPinned, MicVocal, Timer, Users } from "lucide-react";
import { Badge, Card, Spinner } from "../components/ui";
import { api } from "../services/api";

export default function WorkshopDetailPage({ token, myRegistrations, onWorkshopsChanged, onToast }) {
  const { workshopId } = useParams();
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const registrationByWorkshopId = useMemo(
    () => new Map((myRegistrations || []).map((item) => [item.workshop_id, item])),
    [myRegistrations]
  );
  const registration = registrationByWorkshopId.get(workshopId);

  useEffect(() => {
    let mounted = true;
    let intervalId;

    async function loadDetail() {
      try {
        const result = await api.getWorkshopDetail(token, workshopId);
        if (!mounted) return;
        setWorkshop(result);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Could not load workshop details");
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

  async function handleRegister() {
    if (!workshop) return;
    try {
      setSubmitting(true);
      const result = await api.registerWorkshop(token, workshop.id);
      onWorkshopsChanged();
      if (result.requires_payment) {
        onToast?.("Đăng ký tạm giữ chỗ thành công. Vui lòng thanh toán để xác nhận.", "info");
      } else {
        onToast?.("Đăng ký workshop thành công.", "success");
      }
    } catch (e) {
      onToast?.(e.message || "Đăng ký thất bại.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <Spinner className="border-blue-300 border-t-blue-700" />
          Đang tải chi tiết workshop...
        </div>
      </Card>
    );
  }

  if (error || !workshop) {
    return (
      <Card className="mx-auto max-w-3xl">
        <p className="text-sm font-medium text-rose-700">{error || "Workshop không tồn tại"}</p>
        <Link to="/student/workshops" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
          Quay lại danh sách workshop
        </Link>
      </Card>
    );
  }

  const soldOut = workshop.seats_left <= 0;
  const summaryStatus = workshop.summary_status === "COMPLETED" || workshop.summary ? "COMPLETED" : workshop.summary_status || "PENDING";
  const summaryTone = summaryStatus === "COMPLETED" ? "green" : summaryStatus === "FAILED" ? "red" : summaryStatus === "PROCESSING" ? "yellow" : "blue";

  return (
    <Card className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-950">{workshop.title}</h2>
          <p className="mt-1 text-sm text-blue-800">Thông tin chi tiết workshop và đăng ký.</p>
        </div>
        <Link to="/student/workshops" className="text-sm font-semibold text-blue-700 hover:underline">
          <span className="inline-flex items-center gap-1"><ArrowLeft size={14} /> Quay lại</span>
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3 md:grid-cols-2">
        <p className="inline-flex items-center gap-2 text-sm text-blue-900"><MicVocal size={14} /><span><span className="font-semibold">Diễn giả:</span> {workshop.speaker || "TBD"}</span></p>
        <p className="inline-flex items-center gap-2 text-sm text-blue-900"><MapPinned size={14} /><span><span className="font-semibold">Phòng tổ chức:</span> {workshop.room}</span></p>
        <p className="inline-flex items-center gap-2 text-sm text-blue-900"><Timer size={14} /><span><span className="font-semibold">Thời gian:</span> {new Date(workshop.start_time).toLocaleString()}</span></p>
        <p className="inline-flex items-center gap-2 text-sm text-blue-900"><Users size={14} /><span><span className="font-semibold">Số chỗ còn lại (realtime):</span> {workshop.seats_left}/{workshop.total_seats}</span></p>
        <p className="inline-flex items-center gap-2 text-sm text-blue-900"><CircleDollarSign size={14} /><span><span className="font-semibold">Chi phí:</span> {workshop.fee === 0 ? "Miễn phí" : `${Number(workshop.fee).toLocaleString()} VND`}</span></p>
      </div>

      {workshop.room_map_image_url ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-blue-900">Sơ đồ phòng</p>
          <img
            src={workshop.room_map_image_url}
            alt={`Sơ đồ phòng ${workshop.room}`}
            className="h-56 w-full rounded-lg border border-blue-200 object-cover"
          />
        </div>
      ) : null}

      <p className="text-sm text-blue-900">{workshop.description || "Chưa có mô tả chi tiết."}</p>

      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-blue-950">AI Summary</h3>
          <Badge tone={summaryTone}>{summaryStatus}</Badge>
        </div>
        {summaryStatus === "COMPLETED" && workshop.summary ? (
          <p className="whitespace-pre-line text-sm leading-6 text-blue-900">{workshop.summary}</p>
        ) : (
          <p className="text-sm text-blue-800">
            {summaryStatus === "PROCESSING"
              ? "AI summary is still being generated."
              : summaryStatus === "FAILED"
              ? "AI summary generation failed. Please check the document later."
              : "AI summary is not available yet."}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleRegister}
        disabled={Boolean(registration) || soldOut || submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {submitting ? (
          <>
            <Spinner />
            Đang đăng ký...
          </>
        ) : soldOut ? (
          "Hết chỗ"
        ) : registration ? (
          registration.status === "PENDING_PAYMENT" ? "Chờ thanh toán" : "Đã đăng ký"
        ) : (
          "Đăng ký workshop"
        )}
      </button>
    </Card>
  );
}
