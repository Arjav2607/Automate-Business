import React, { useState } from 'react';
import { Approval } from '../types';

interface ApprovalsManagerProps {
  pendingApprovals: Approval[];
  decidedApprovals: Approval[];
  onDecide: (id: number, decision: 'approved' | 'rejected') => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

export const ApprovalsManager: React.FC<ApprovalsManagerProps> = ({
  pendingApprovals,
  decidedApprovals,
  onDecide,
  onNavigateToTab,
}) => {
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const handleDecision = async (id: number, decision: 'approved' | 'rejected') => {
    setDecidingId(id);
    await onDecide(id, decision);
    setDecidingId(null);
  };

  return (
    <div className="space-y-6">
      {/* ═══ Pending Approvals Card ═══ */}
      <div className="card">
        <div className="bill-bar">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>⏳ Waiting for Your Decision</span>
              {pendingApprovals.length > 0 && (
                <span className="badge">{pendingApprovals.length}</span>
              )}
            </h3>
            <p className="muted text-xs mt-0.5">
              When an AI agent (WhatsApp Aura or Maya) receives a customer negotiation exceeding policy, it pauses and waits here for your sign-off.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('agents')}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
          >
            Agent Studio &rarr;
          </button>
        </div>

        {pendingApprovals.length === 0 ? (
          <p className="muted py-6">
            Nothing pending. When your AI agent gets stuck or customer requests custom discounts, it will prompt you here.
          </p>
        ) : (
          <div className="space-y-3 mt-4">
            {pendingApprovals.map((a) => {
              const ctx = a.context || {};
              const isProcessing = decidingId === a.id;

              return (
                <div key={a.id} className="approval-card" id={`approval-${a.id}`}>
                  <div className="approval-head">
                    <span className="tag">{a.type}</span>
                    <strong className="text-slate-100 text-sm font-semibold">{a.summary}</strong>
                    <span className="muted text-xs">
                      {a.agent_id} · {a.created_at}
                    </span>
                  </div>

                  {/* Context block */}
                  <div className="context">
                    {ctx.customer && (
                      <p className="text-xs text-slate-300 mb-1">
                        <strong>Customer:</strong> {ctx.customer}{' '}
                        {ctx.phone && <span className="text-slate-400">({ctx.phone})</span>}
                      </p>
                    )}
                    {ctx.requestedDiscount && (
                      <p className="text-xs text-amber-300 mb-1">
                        <strong>Negotiation:</strong> Requested {ctx.requestedDiscount}% discount
                        (Policy ceiling is {ctx.maxAllowedDiscount || 10}%)
                      </p>
                    )}
                    {ctx.transcriptSnippet && (
                      <p className="text-xs italic text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5">
                        "{ctx.transcriptSnippet}"
                      </p>
                    )}
                  </div>

                  {/* Approve / Reject buttons */}
                  <div className="approval-actions">
                    <button
                      className="btn approve"
                      disabled={isProcessing}
                      onClick={() => handleDecision(a.id, 'approved')}
                    >
                      {isProcessing ? 'Saving…' : '✔ Approve'}
                    </button>
                    <button
                      className="btn reject"
                      disabled={isProcessing}
                      onClick={() => handleDecision(a.id, 'rejected')}
                    >
                      {isProcessing ? 'Saving…' : '✘ Reject'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Recently Decided Card ═══ */}
      <div className="card">
        <h3 className="text-base font-bold text-slate-100">Recently Decided</h3>
        <p className="muted text-xs mt-0.5 mb-3">
          Audit trail of owner interventions that resumed customer automated agent pipelines.
        </p>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>Type</th>
              <th>Summary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {decidedApprovals.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted text-center py-6">
                  No decisions recorded yet.
                </td>
              </tr>
            ) : (
              decidedApprovals.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-slate-400">#{d.id}</td>
                  <td className="text-slate-300">{d.agent_id}</td>
                  <td>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono">
                      {d.type}
                    </span>
                  </td>
                  <td className="text-slate-200">{d.summary}</td>
                  <td>
                    <span className={`tag ${d.status}`}>
                      {d.status === 'approved' ? '✔ Approved' : '✘ Rejected'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
