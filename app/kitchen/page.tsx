'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Order } from '@/lib/types';
import Navbar from '@/components/Navbar';
import QRModal from '@/components/QRModal';

const STATUS_META: Record<string, { label: string; card: string; badge: string }> = {
  pending:   { label: 'Pending',   card: 'border-l-4 border-l-yellow-400', badge: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  preparing: { label: 'Preparing', card: 'border-l-4 border-l-blue-400',   badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  ready:     { label: 'Ready',     card: 'border-l-4 border-l-green-400',  badge: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
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

const NEXT_STYLE: Record<string, string> = {
  pending:   'bg-neutral-900 hover:bg-black text-white',
  preparing: 'bg-green-600 hover:bg-green-700 text-white',
  ready:     'bg-neutral-700 hover:bg-neutral-800 text-white',
};

function useElapsed(iso: string) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (secs < 60) setElapsed(`${secs}s`);
      else if (secs < 3600) setElapsed(`${Math.floor(secs / 60)}m ${secs % 60}s`);
      else setElapsed(`${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return elapsed;
}

function OrderCard({
  order,
  index,
  onUpdate,
  isUpdating,
  onQR,
}: {
  order: Order;
  index: number;
  onUpdate: (id: string, status: string) => void;
  isUpdating: boolean;
  onQR: (order: Order) => void;
}) {
  const elapsed = useElapsed(order.createdAt);
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;

  return (
    <div className={`flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md ${meta.card}`}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-black text-white">
            {index + 1}
          </span>
          <div>
            <p className="font-semibold leading-tight text-gray-900">{order.customerName}</p>
            <p className="mt-0.5 font-mono text-xs text-gray-400">
              #{order._id.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      {/* Timer */}
      <div className="mt-1 px-5">
        <span className={`text-xs font-medium ${order.status === 'pending' ? 'text-yellow-600' : 'text-gray-400'}`}>
          ⏱ {elapsed} ago
        </span>
      </div>

      {/* Items */}
      <ul className="mx-5 my-3 divide-y divide-gray-50 rounded-xl bg-gray-50 px-3 py-2">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-gray-700">
              <span className="mr-1.5 rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs font-bold text-gray-600">
                ×{item.quantity}
              </span>
              {item.name}
            </span>
            <span className="text-gray-400">₹{(item.price * item.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">₹{order.totalAmount.toFixed(2)}</span>
          <button
            onClick={() => onQR(order)}
            title="Generate QR for this order"
            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900"
          >
            QR
          </button>
        </div>

        {NEXT_STATUS[order.status] && (
          <button
            onClick={() => onUpdate(order._id, order.status)}
            disabled={isUpdating}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${NEXT_STYLE[order.status]}`}
          >
            {isUpdating ? '…' : NEXT_LABEL[order.status]}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);

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
    if (!token) { router.push('/login'); return; }

    fetchOrders();

    const socket = getSocket();
    socket.connect();
    socket.on('connect', () => { setConnected(true); socket.emit('join:kitchen'); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('queue:update', fetchOrders);

    return () => {
      socket.off('queue:update', fetchOrders);
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
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const pending   = orders.filter((o) => o.status === 'pending');
  const preparing = orders.filter((o) => o.status === 'preparing');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
          <p className="text-sm text-gray-400">Loading orders…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Kitchen Board</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {orders.length} active order{orders.length !== 1 ? 's' : ''}
              {orders.length > 0 && (
                <span className="ml-2 text-neutral-400">
                  · {pending.length} pending · {preparing.length} preparing
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-sm">
            <span className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-green-500' : 'bg-red-400'}`} />
            <span className={`font-medium ${connected ? 'text-green-600' : 'text-red-500'}`}>
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <svg className="h-7 w-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-400">No active orders</p>
              <p className="text-sm text-gray-400">New orders will appear here automatically</p>
            </div>
          </div>
        ) : (
          /* Kanban: Pending | Preparing */
          <div className="grid gap-6 lg:grid-cols-2">
            {([
              { title: 'Pending',   color: 'text-yellow-600', dot: 'bg-yellow-400', items: pending },
              { title: 'Preparing', color: 'text-blue-600',   dot: 'bg-blue-400',   items: preparing },
            ] as const).map((col) => (
              <div key={col.title}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <h2 className={`text-sm font-bold uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </h2>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                    {col.items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {col.items.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-2xl border-2 border-dashed border-gray-100 text-sm text-gray-300">
                      Empty
                    </div>
                  ) : (
                    col.items.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        index={orders.indexOf(order)}
                        onUpdate={updateStatus}
                        isUpdating={updatingId === order._id}
                        onQR={setQrOrder}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
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
