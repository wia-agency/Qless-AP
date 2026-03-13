'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import type { MenuItem } from '@/lib/types';

const CATEGORIES = ['Main', 'Snack', 'Drink', 'Beverage', 'Dessert'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Main:     'bg-orange-50 text-orange-600',
  Snack:    'bg-yellow-50 text-yellow-600',
  Drink:    'bg-blue-50 text-blue-600',
  Beverage: 'bg-cyan-50 text-cyan-600',
  Dessert:  'bg-pink-50 text-pink-600',
};

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: 'Main' as MenuItem['category'],
  timeTaken: '',
  isAvailable: true,
  imageUrl: '',
};

export default function MenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await api.get<MenuItem[]>('/api/menu/all');
      setItems(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) { router.push('/login'); return; }
    fetchItems();
  }, [fetchItems, router]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setError('');
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditId(item._id);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      timeTaken: item.timeTaken ? String(item.timeTaken) : '',
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price),
      category: form.category,
      timeTaken: form.timeTaken ? parseInt(form.timeTaken, 10) : undefined,
      isAvailable: form.isAvailable,
      imageUrl: form.imageUrl.trim() || undefined,
    };

    try {
      if (editId) {
        await api.put(`/api/menu/${editId}`, payload);
      } else {
        await api.post('/api/menu', payload);
      }
      setShowForm(false);
      fetchItems();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save item.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await api.put(`/api/menu/${item._id}`, { isAvailable: !item.isAvailable });
      fetchItems();
    } catch { /* ignore */ }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await api.delete(`/api/menu/${id}`);
      fetchItems();
    } catch { /* ignore */ }
  };

  const available = items.filter((i) => i.isAvailable).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
          <p className="text-sm text-gray-400">Loading menu…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {items.length} item{items.length !== 1 ? 's' : ''}
              {items.length > 0 && (
                <span className="ml-1 text-gray-400">
                  · {available} available · {items.length - available} hidden
                </span>
              )}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        {/* Grouped by category */}
        {CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat} className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[cat]}`}>
                  {cat}
                </span>
                <span className="text-xs text-gray-400">{catItems.length} item{catItems.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {catItems.map((item, idx) => (
                  <div
                    key={item._id}
                    className={`group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 ${
                      idx !== catItems.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    {/* Availability dot */}
                    <span className={`h-2 w-2 shrink-0 rounded-full ${item.isAvailable ? 'bg-green-400' : 'bg-gray-300'}`} />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-medium ${!item.isAvailable ? 'text-gray-400' : 'text-gray-900'}`}>
                          {item.name}
                        </span>
                        {!item.isAvailable && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400">
                            Hidden
                          </span>
                        )}
                        {item.timeTaken && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                            ⏱ {item.timeTaken}m
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 truncate text-sm text-gray-400">{item.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <span className="shrink-0 text-sm font-bold text-gray-900">₹{item.price.toFixed(2)}</span>

                    {/* Actions (visible on hover) */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          item.isAvailable
                            ? 'text-orange-500 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {item.isAvailable ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item._id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-white">
            <svg className="h-10 w-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-400">No menu items yet</p>
              <button onClick={openAdd} className="mt-1 text-sm text-blue-600 hover:underline">
                Add your first item
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editId ? 'Edit Item' : 'Add Menu Item'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder="e.g. Chicken Biryani"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Short description (optional)"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as MenuItem['category'] })}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Prep Time <span className="font-normal text-gray-400">(minutes, optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.timeTaken}
                  onChange={(e) => setForm({ ...form, timeTaken: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder="e.g. 10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Image URL <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder="https://…"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Available for ordering</p>
                  <p className="text-xs text-gray-400">Uncheck to hide this item from customers</p>
                </div>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving…
                    </span>
                  ) : editId ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
