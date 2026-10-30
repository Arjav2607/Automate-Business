import React, { useState } from 'react';
import { EnrichedOrder } from '../types';

interface CustomersViewProps {
  orders: EnrichedOrder[];
}

export const CustomersView: React.FC<CustomersViewProps> = ({ orders }) => {
  // Group orders by customer
  const customerMap = orders.reduce<Record<string, { name: string; total: number; orders: EnrichedOrder[] }>>(
    (acc, item) => {
      const cust = item.order.customer;
      if (!acc[cust]) {
        acc[cust] = { name: cust, total: 0, orders: [] };
      }
      acc[cust].total += item.order.amount;
      acc[cust].orders.push(item);
      return acc;
    },
    {}
  );

  const customerList = Object.values(customerMap);

  // Open folder state per customer name
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    [customerList[0]?.name || '']: true, // Open first folder by default
  });

  // Ratings per customer
  const [ratings, setRatings] = useState<Record<string, number>>({
    'Rohan Sharma': 5,
    'Priya Patel': 4,
  });

  const toggleFolder = (name: string) => {
    setOpenFolders((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleRate = (name: string, star: number) => {
    setRatings((prev) => ({ ...prev, [name]: star }));
  };

  return (
    <div className="card card--folders">
      <div className="bill-bar">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Customer History</h3>
          <p className="muted text-xs mt-0.5">
            Open a 3D folder sleeve to view order items. Tap stars to rate account priority.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {customerList.length} Accounts Tracked
        </div>
      </div>

      {customerList.length === 0 ? (
        <p className="muted py-8 text-center">
          No customer orders recorded yet. As orders arrive via WhatsApp or manual entry, they will populate here.
        </p>
      ) : (
        <div className="folder-grid">
          {customerList.map((c) => {
            const isOpen = !!openFolders[c.name];
            const currentRating = ratings[c.name] || 0;

            return (
              <div
                key={c.name}
                className="folder-float"
                data-open={isOpen ? '' : undefined}
                style={
                  {
                    '--ff-n': c.orders.length,
                  } as React.CSSProperties
                }
              >
                {/* Order pills that burst out of the folder */}
                <div className="folder-float__items">
                  {c.orders.map((item, idx) => (
                    <button
                      key={item.order.id}
                      className="folder-float__item"
                      style={
                        {
                          '--i': idx,
                          '--x': `${(idx - (c.orders.length - 1) / 2) * 44}px`,
                          '--y': `${-48 - idx * 16}px`,
                          '--r': `${(idx - (c.orders.length - 1) / 2) * 5}deg`,
                        } as React.CSSProperties
                      }
                      title={`Order #${item.order.id} · ${item.order.product} × ${item.order.quantity}`}
                    >
                      <span className="folder-float__drift">
                        #{item.order.id} · {item.order.product} ×{item.order.quantity} · Rs{' '}
                        {item.order.amount.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>

                {/* The 3D Folder Sleeve */}
                <div className="folder-float__folder">
                  <span className="folder-float__back" aria-hidden="true"></span>
                  <span className="folder-float__paper" aria-hidden="true"></span>
                  <div className="folder-float__front">
                    <span className="folder-float__label">{c.name}</span>
                    <span className="folder-float__sub">
                      {c.orders.length} order{c.orders.length !== 1 ? 's' : ''} · Rs{' '}
                      {c.total.toLocaleString()}
                    </span>

                    {/* Interactive Peek Rating */}
                    <div className="peek-rating">
                      <div className="pk-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            className="pk-star"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRate(c.name, star);
                            }}
                            title={`Rate ${star} star`}
                          >
                            <span
                              className="pk-glyph"
                              data-lit={star <= currentRating ? 'true' : undefined}
                            >
                              ★
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Trigger button overlay */}
                  <button
                    className="folder-float__trigger"
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleFolder(c.name)}
                    aria-label={`Toggle folder for ${c.name}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
