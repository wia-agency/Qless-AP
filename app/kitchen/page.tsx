'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Order } from '@/lib/types';
import Navbar from '@/components/Navbar';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
};

const NEXT_STATUS: Record<string, string> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

const NEXT_LABEL: Record<string, string> = {
  pending: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Collected',
};

export default function KitchenPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get<Order[]>('/api/orders');
      setOrders(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchOrders();

    const socket = getSocket();
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:kitchen');
    });

    socket.on('disconnect', () => setConnected(false));

    // Kitchen gets real-time queue updates
    socket.on('queue:update', () => {
      fetchOrders();
    });

    return () => {
      socket.off('queue:update');
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [fetchOrders, router]);

  const updateStatus = async (orderId: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;

    setUpdatingId(orderId);
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: next });
      // Socket will trigger fetchOrders automatically
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="kitchen" />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kitchen Board</h1>
            <p className="text-sm text-gray-500">{orders.length} active order{orders.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-gray-500">{connected ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-400">No active orders</p>
              <p className="text-sm text-gray-400">New orders will appear here automatically</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order, index) => (
              <div
                key={order._id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                {/* Card Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-gray-900">{order.customerName}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">#{order._id.slice(-6).toUpperCase()} · {formatTime(order.createdAt)}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>

                {/* Items */}
                <ul className="mb-4 space-y-1.5 border-t border-gray-100 pt-4">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        <span className="font-medium">{item.quantity}×</span> {item.name}
                      </span>
                      <span className="text-gray-500">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-900">
                    Total: ₹{order.totalAmount.toFixed(2)}
                  </span>

                  {NEXT_STATUS[order.status] && (
                    <button
                      onClick={() => updateStatus(order._id, order.status)}
                      disabled={updatingId === order._id}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60 ${
                        order.status === 'pending'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : order.status === 'preparing'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {updatingId === order._id ? 'Updating...' : NEXT_LABEL[order.status]}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
