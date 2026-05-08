import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import AdminParticipantsList from '../../components/AdminParticipantsList';
import PaymentDetailModal from '../../components/PaymentDetailModal';
import { Card } from '../../components/ui';

export default function AdminWorkshopParticipantsPage({ token, onToast }) {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  useEffect(() => {
    loadWorkshop();
  }, [workshopId, token]);

  const loadWorkshop = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminWorkshopById(token, workshopId);
      setWorkshop(data);
    } catch (err) {
      onToast?.(err?.message || 'Failed to load workshop', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/admin/workshops')}
            className="text-2xl"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">
            {workshop?.title} - Participants
          </h1>
        </div>

        <Card>
          <AdminParticipantsList
            workshopId={workshopId}
            token={token}
            onToast={onToast}
            onViewPayment={(paymentId) => setSelectedPaymentId(paymentId)}
          />
        </Card>

        {selectedPaymentId && (
          <PaymentDetailModal
            paymentId={selectedPaymentId}
            token={token}
            onClose={() => setSelectedPaymentId(null)}
            onToast={onToast}
          />
        )}
      </div>
    </div>
  );
}
