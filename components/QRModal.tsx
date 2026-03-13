'use client';

import { useRef } from 'react';
import QRCode from 'react-qr-code';

interface Props {
  orderId: string;
  userId: string | null | undefined;
  customerName: string;
  onClose: () => void;
}

export default function QRModal({ orderId, userId, customerName, onClose }: Props) {
  const qrRef = useRef<HTMLDivElement>(null);

  const qrValue = `${orderId}-${userId ?? 'guest'}`;

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${orderId.slice(-6).toUpperCase()}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Order QR Code</h2>
            <p className="text-sm text-gray-400">{customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!userId ? (
          <div className="mb-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            This is a guest order — no user account is linked.
            The QR will encode <span className="font-mono font-semibold">{orderId}-guest</span>.
          </div>
        ) : null}

        {/* QR Code */}
        <div ref={qrRef} className="flex items-center justify-center rounded-xl bg-white p-4">
          <QRCode
            value={qrValue}
            size={200}
            level="M"
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          />
        </div>

        {/* Encoded value */}
        <p className="mt-3 break-all text-center font-mono text-xs text-gray-400">
          {qrValue}
        </p>

        {/* Order ID pill */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-xs font-semibold text-gray-600">
            #{orderId.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Download SVG
          </button>
        </div>
      </div>
    </div>
  );
}
