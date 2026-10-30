import React, { useState } from 'react';
import { DashboardStats, EnrichedOrder, Product } from '../types';

interface DashboardOverviewProps {
  stats: DashboardStats;
  chartData: { labels: string[]; values: number[] };
  chartRange: string;
  setChartRange: (range: string) => void;
  orders: EnrichedOrder[];
  products: Product[];
  onRestock: (productId: number, qty: number) => void;
  onNavigateToTab: (tab: string) => void;
  onExportCsv: () => void;
  onOpenPrintBill: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  chartData,
  chartRange,
  setChartRange,
  orders,
  products,
  onNavigateToTab,
}) => {
  const [syncStatus, setSyncStatus] = useState<'running' | 'done'>('done');

  const maxChartValue = Math.max(...(chartData.values.length ? chartData.values : [1000]), 1);

  return (
    <div className="space-y-4">
      {/* ═══ 4 KPI Cards ═══ */}
      <div className="grid">
        {/* Card 1: Orders Today */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h3>Orders Today</h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {stats.totalAllTimeOrders} total
            </span>
          </div>
          <div className="big" id="todayOrders">
            {stats.todayOrders}
          </div>
          <div className="muted mt-1 text-xs">Autonomous &amp; manual sales</div>
        </div>

        {/* Card 2: Revenue Today */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h3>Revenue Today</h3>
            <span className="text-[11px] text-emerald-400 font-medium font-mono">Live</span>
          </div>
          <div className="big" id="todayRevenue">
            {stats.todayRevenue}
          </div>
          <div className="muted mt-1 text-xs">Net gross across channels</div>
        </div>

        {/* Card 3: Pending Approvals (Alert Card) */}
        <div
          className={`card ${stats.pendingApprovals > 0 ? 'alert-card cursor-pointer' : ''}`}
          onClick={() => {
            if (stats.pendingApprovals > 0) onNavigateToTab('approvals');
          }}
        >
          <div className="flex items-center justify-between">
            <h3>Pending Approvals</h3>
            {stats.pendingApprovals > 0 && <span className="badge">Action</span>}
          </div>
          <div className="big" id="pendingApprovals">
            {stats.pendingApprovals}
          </div>
          <div className="muted mt-1 text-xs">
            {stats.pendingApprovals > 0
              ? 'Agent paused awaiting discount sign-off'
              : 'All agent decisions approved'}
          </div>
        </div>

        {/* Card 4: Low Stock Items (Alert Card) */}
        <div
          className={`card ${stats.lowStock > 0 ? 'alert-card cursor-pointer' : ''}`}
          onClick={() => onNavigateToTab('orders')}
        >
          <div className="flex items-center justify-between">
            <h3>Low Stock Items</h3>
            {stats.lowStock > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Alert
              </span>
            )}
          </div>
          <div className="big" id="lowStock">
            {stats.lowStock}
          </div>
          <div className="muted mt-1 text-xs">
            {stats.lowStock > 0
              ? 'Catalog items with stock < 5 units'
              : 'All inventory healthy'}
          </div>
        </div>
      </div>

      {/* ═══ Revenue Timeline Chart Card ═══ */}
      <div className="card">
        <div className="bill-bar">
          <div>
            <h3 className="text-base font-bold text-slate-100">Revenue Timeline</h3>
            <p className="muted text-xs mt-0.5">
              Multi-channel income stream across WhatsApp Sales Agent and direct customer orders.
            </p>
          </div>

          {/* RubberSegment Range Selector */}
          <div className="rubber-segment" id="rangeSeg" data-equal>
            {['day', 'week', 'month', 'year'].map((range) => {
              const label =
                range === 'day'
                  ? 'Day'
                  : range === 'week'
                  ? 'Week'
                  : range === 'month'
                  ? 'Month'
                  : 'Year';
              const isSelected = chartRange === range;

              return (
                <button
                  key={range}
                  type="button"
                  className="rs-item"
                  data-value={range}
                  aria-checked={isSelected}
                  onClick={() => {
                    setSyncStatus('running');
                    setChartRange(range);
                    setTimeout(() => setSyncStatus('done'), 300);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom CSS Bar Chart matching Chart.js aesthetic in style.css */}
        <div className="pt-6 pb-2">
          <div className="h-48 flex items-end gap-3 sm:gap-6 border-b border-white/10 px-2">
            {chartData.labels.map((label, idx) => {
              const val = chartData.values[idx] || 0;
              const heightPct = Math.max(12, Math.round((val / maxChartValue) * 100));

              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[11px] font-mono font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Rs {val.toLocaleString()}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 chart-bar-fill"
                    style={{
                      height: `${heightPct}%`,
                      background: 'linear-gradient(180deg, #e8edf7 0%, #cbd5e1 100%)',
                      boxShadow: '0 4px 12px rgba(203, 213, 225, 0.15)',
                    }}
                  />
                  <span className="text-[11px] text-slate-400 font-medium truncate max-w-full">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Sync Status Line ═══ */}
      <div className="card sync-line flex items-center justify-between">
        <span
          className="status-mark"
          id="syncMark"
          data-status={syncStatus}
          data-indeterminate={syncStatus === 'running' ? '' : undefined}
        >
          <svg className="status-mark__glyph" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle className="status-mark__track" cx="12" cy="12" r="9" transform="rotate(-90 12 12)" />
            <circle className="status-mark__ring" cx="12" cy="12" r="9" transform="rotate(-90 12 12)" />
            <path className="status-mark__check" d="M7.5 12.25 10.5 15.25 16.75 8.75" pathLength="1" />
            <path className="status-mark__cross" d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5" pathLength="1" />
          </svg>
          <span className="status-mark__label">
            {syncStatus === 'running' ? 'Syncing with agent…' : 'Live — synced with agent & Meta WhatsApp Cloud API'}
            <span className="status-mark__strike"></span>
          </span>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('agents')}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
          >
            Launch Agent Studio
          </button>
        </div>
      </div>
    </div>
  );
};
