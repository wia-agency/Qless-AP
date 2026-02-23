'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import type { MenuItem } from '@/lib/types';

const CATEGORIES = ['Main', 'Snack', 'Drink', 'Beverage', 'Dessert'] as const;

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: 'Main' as MenuItem['category'],
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
    } catch {
      // ignore
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await api.delete(`/api/menu/${id}`);
      fetchItems();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-sm text-gray-500">{items.length} items</p>
          </div>
          <button
            onClick={openAdd}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Item
          </button>
        </div>

        {/* Grouped by category */}
        {CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat} className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{cat}</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {catItems.map((item, idx) => (
                  <div
                    key={item._id}
                    className={`flex items-center justify-between px-5 py-4 ${
                      idx !== catItems.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${!item.isAvailable ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {item.name}
                        </span>
                        {!item.isAvailable && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                            Unavailable
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-gray-400">{item.description}</p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-900">₹{item.price.toFixed(2)}</span>
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`text-xs font-medium ${item.isAvailable ? 'text-orange-500 hover:text-orange-700' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {item.isAvailable ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item._id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
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
          <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-400">No menu items yet</p>
              <button onClick={openAdd} className="mt-2 text-sm text-blue-600 hover:underline">
                Add your first item
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              {editId ? 'Edit Item' : 'Add Menu Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as MenuItem['category'] })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <label htmlFor="available" className="text-sm text-gray-700">Available for ordering</label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editId ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
