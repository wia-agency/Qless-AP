'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import QRModal from '@/components/QRModal';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending:   'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  preparing: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  ready:     'bg-green-50 text-green-700 ring-1 ring-green-200',
  completed: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [qrOrder, setQrOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      const { data } = await api.get<Order[]>(`/api/orders/history?${params}`);
      setOrders(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, router]);

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) { router.push('/login'); return; }
    fetchOrders();
  }, [fetchOrders, router]);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const hasFilters = statusFilter || dateFilter;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
            {hasFilters && (
              <button
                onClick={() => { setStatusFilter(''); setDateFilter(''); }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
              <p className="text-sm text-gray-400">Loading orders…</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-white">
            <svg className="h-10 w-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-medium text-gray-400">
              {hasFilters ? 'No orders match your filters' : 'No orders yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Time</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order._id} className="group transition-colors hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-semibold text-gray-600">
                          #{order._id.slice(-6).toUpperCase()}
                        </span>
                        <span className={`w-fit rounded-full px-1.5 py-0.5 text-xs font-medium ${order.userId ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                          {order.userId ? 'User' : 'Guest'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">{order.customerName}</td>
                    <td className="max-w-xs px-5 py-4">
                      <p className="truncate text-gray-500">
                        {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      ₹{order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDateTime(order.createdAt)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setQrOrder(order)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 opacity-0 transition group-hover:opacity-100 hover:border-blue-300 hover:text-blue-600"
                      >
                        QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {qrOrder && (
        <QRModal
          orderId={qrOrder._id}
          userId={qrOrder.userId}
          customerName={qrOrder.customerName}
          onClose={() => setQrOrder(null)}
        />
      )}
    </div>
  );
}
