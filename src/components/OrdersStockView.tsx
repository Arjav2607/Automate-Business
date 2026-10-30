import React, { useState } from 'react';
import { EnrichedOrder, Product } from '../types';

interface OrdersStockViewProps {
  products: Product[];
  orders: EnrichedOrder[];
  onRestock: (productId: number, qty: number) => void;
  onOpenNewOrder: () => void;
  onExportCsv: () => void;
  onOpenPrintBill: () => void;
}

export const OrdersStockView: React.FC<OrdersStockViewProps> = ({
  products,
  orders,
  onRestock,
  onOpenNewOrder,
  onExportCsv,
  onOpenPrintBill,
}) => {
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [isGlideOpen, setIsGlideOpen] = useState(false);
  const [orderRange, setOrderRange] = useState<string>('week');
  const [restockingId, setRestockingId] = useState<number | null>(null);

  const toggleFlip = (id: number) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQuickRestock = async (id: number) => {
    setRestockingId(id);
    await onRestock(id, 15);
    setTimeout(() => setRestockingId(null), 600);
  };

  // Filter orders according to range
  const filteredOrders = orders; // Show current enriched orders

  return (
    <div className="space-y-6">
      {/* ═══ Stock Levels Card ═══ */}
      <div className="card">
        <div className="bill-bar">
          <div>
            <h3 className="text-base font-bold text-slate-100">Stock Levels</h3>
            <p className="muted text-xs mt-0.5">
              Live inventory synced with Inventory Guardian agent. Items under 5 units trigger automatic alerts.
            </p>
          </div>

          {/* GlideSelect Dropdown for Exporting */}
          <div className="glide-select">
            <button
              className="glide-select__trigger"
              aria-expanded={isGlideOpen}
              onClick={() => setIsGlideOpen((prev) => !prev)}
            >
              <span className="glide-select__label">Bill format…</span>
              <span className="glide-select__chevron">▾</span>
            </button>
            {isGlideOpen && (
              <div className="glide-select__menu" data-state="open">
                <div className="glide-select__list">
                  <div
                    className="glide-select__option"
                    onClick={() => {
                      setIsGlideOpen(false);
                      onOpenPrintBill();
                    }}
                  >
                    <span className="glide-select__name">Print bill</span>
                    <span className="glide-select__tag">Paper</span>
                  </div>
                  <div
                    className="glide-select__option"
                    onClick={() => {
                      setIsGlideOpen(false);
                      onExportCsv();
                    }}
                  >
                    <span className="glide-select__name">CSV spreadsheet</span>
                    <span className="glide-select__tag">Excel</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price (Rs)</th>
              <th>Stock</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-slate-200">
                  <div className="flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.stock < 5 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                        LOW
                      </span>
                    )}
                  </div>
                </td>
                <td className="font-mono text-slate-300">Rs {p.price.toLocaleString()}</td>
                <td className={p.stock < 5 ? 'low' : 'font-mono text-slate-300'}>
                  {p.stock} units
                </td>
                <td className="text-right">
                  <button
                    onClick={() => handleQuickRestock(p.id)}
                    disabled={restockingId === p.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
                  >
                    {restockingId === p.id ? 'Restocking…' : '＋ Restock'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ Recent Orders Card with 3D Flip Cards ═══ */}
      <div className="card">
        <div className="bill-bar">
          <div>
            <h3 className="text-base font-bold text-slate-100">Recent Orders</h3>
            <p className="muted text-xs mt-0.5">
              Click any card to flip and view customer statistics and last conversation transcript.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              className="btn approve text-xs py-1.5 px-3.5"
              onClick={onOpenNewOrder}
            >
              ＋ Add order
            </button>

            {/* RubberSegment Range Selector */}
            <div className="rubber-segment" data-equal>
              {['day', 'week', 'month', 'year'].map((range) => (
                <button
                  key={range}
                  className="rs-item"
                  aria-checked={orderRange === range}
                  onClick={() => setOrderRange(range)}
                >
                  {range === 'day' ? '1 Day' : range === 'week' ? '1 Week' : range === 'month' ? '1 Month' : '1 Year'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <p className="muted py-8 text-center">No orders found in this period.</p>
        ) : (
          <div className="flip-grid mt-4">
            {filteredOrders.map(({ order, total_orders, total_spent, last_msg }) => {
              const isFlipped = !!flippedCards[order.id];

              return (
                <div
                  key={order.id}
                  className={`flip-card ${isFlipped ? 'flipped' : ''}`}
                  tabIndex={0}
                  role="button"
                  onClick={() => toggleFlip(order.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleFlip(order.id);
                    }
                  }}
                  aria-label={`Order ${order.id} by ${order.customer}`}
                >
                  <div className="flip-inner">
                    {/* Front Face */}
                    <div className="flip-face flip-front">
                      <div className="flip-head">
                        <span className="tag">#{order.id}</span>
                        <span className="muted text-xs">{order.created_at}</span>
                      </div>
                      <div className="cust-name">{order.customer}</div>
                      <div className="flip-sub">
                        {order.product} × {order.quantity} · {order.agent_id}
                      </div>
                      <div className="flip-amount">
                        Rs {order.amount.toLocaleString()}
                      </div>
                      <div className="flip-hint">click to flip ↷</div>
                    </div>

                    {/* Back Face */}
                    <div className="flip-face flip-back">
                      <h3>{order.customer}</h3>
                      <div className="stat-row">
                        <span className="muted">Total orders:</span>
                        <strong>{total_orders}</strong>
                      </div>
                      <div className="stat-row">
                        <span className="muted">Total spent:</span>
                        <strong>Rs {total_spent.toLocaleString()}</strong>
                      </div>
                      <div className="last-chat">
                        "{last_msg || 'No prior message log'}"
                      </div>
                      <div className="flip-hint mt-auto">click to flip ↶</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
