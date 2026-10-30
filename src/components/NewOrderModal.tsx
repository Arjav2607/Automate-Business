import React, { useState } from 'react';
import { Product } from '../types';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSubmit: (orderData: {
    customer: string;
    product: string;
    quantity: number;
    phone?: string;
    email?: string;
    location?: string;
    note?: string;
  }) => Promise<void>;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  products,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [customer, setCustomer] = useState('');
  const [product, setProduct] = useState(products[0]?.name || '');
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProd = products.find((p) => p.name === product) || products[0];
  const totalAmount = selectedProd ? selectedProd.price * quantity : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim()) {
      setError('Please provide customer name');
      return;
    }
    if (!product) {
      setError('Please select a product');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        customer: customer.trim(),
        product,
        quantity,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="card w-full max-w-lg mx-auto my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-slate-100">Manual Order Entry</h3>
            <p className="muted text-xs">Record an order processed outside autonomous agents</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              className="search mb-0"
              placeholder="e.g. Vikram Singhania"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Product *
              </label>
              <select
                className="search mb-0 appearance-auto cursor-pointer"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.name} className="bg-slate-900 text-white">
                    {p.name} — Rs {p.price.toLocaleString()} ({p.stock} in stock)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min={1}
                max={selectedProd ? selectedProd.stock : 99}
                className="search mb-0"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                className="search mb-0"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                className="search mb-0"
                placeholder="customer@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Delivery Location
            </label>
            <input
              type="text"
              className="search mb-0"
              placeholder="City, State (e.g. Mumbai, MH)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Order Note / Agent Reference
            </label>
            <input
              type="text"
              className="search mb-0"
              placeholder="Phone inquiry negotiated over voice call"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Price Calculation Pill */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Order Value:</span>
            <span className="text-lg font-bold text-slate-100">
              Rs {totalAmount.toLocaleString()}
            </span>
          </div>

          {error && <div className="text-xs text-rose-400 font-medium">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn ghost2 text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn approve text-xs py-2 px-5"
            >
              {submitting ? 'Placing Order…' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
