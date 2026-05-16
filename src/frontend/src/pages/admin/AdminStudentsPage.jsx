import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Card, Spinner } from '../../components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminStudentsPage({ token, onToast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  });

  useEffect(() => {
    loadStudents();
  }, [page]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const result = await api.getAdminStudents(token, {
        page,
        pageSize,
      });

      setStudents(result.data || []);
      setPagination(result.pagination || {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false,
      });
    } catch (error) {
      const msg = error?.message || 'Failed to load students';
      onToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Students Management</h3>
            <div className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">{pagination.total}</span>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <Spinner className="h-6 w-6 border-blue-300 border-t-blue-700" />
            </div>
          )}

          {/* Empty State */}
          {!loading && students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No students found.
            </div>
          )}

          {/* Students Table */}
          {!loading && students.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Full Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Joined Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{student.fullName}</td>
                      <td className="px-4 py-3 text-gray-600">{student.email}</td>
                      <td className="px-4 py-3 text-gray-600">{student.studentCode}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(student.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            student.isActive
                              ? 'bg-green-100 text-green-900'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
