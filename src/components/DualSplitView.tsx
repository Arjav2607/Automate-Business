import React from 'react';
import { CustomerWhatsAppPortal } from './CustomerWhatsAppPortal';
import { ApprovalsManager } from './ApprovalsManager';
import { Product, Approval } from '../types';
import { Split, User, Shield, CheckCircle2, ArrowRight } from 'lucide-react';

interface DualSplitViewProps {
  products: Product[];
  pendingApprovals: Approval[];
  decidedApprovals: Approval[];
  onTriggerWebhook: (payload: any) => Promise<any>;
  onDecideApproval: (id: number, decision: 'approved' | 'rejected') => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

export const DualSplitView: React.FC<DualSplitViewProps> = ({
  products,
  pendingApprovals,
  decidedApprovals,
  onTriggerWebhook,
  onDecideApproval,
  onNavigateToTab,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Banner explaining Dual Platform Utility */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-slate-700 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-indigo-500 text-white shadow-sm flex items-center">
                <Split className="w-3.5 h-3.5 mr-1.5" />
                Live Dual-Screen Bridge
              </span>
              <span className="text-xs text-slate-300">
                Buyer View (WhatsApp) &amp; Seller Admin View (Arjav Jain) Synchronized
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              End-to-End Real-Time Demonstration: How Users &amp; Owner Both Use This Platform
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              Watch what happens when a customer asks for a discount on WhatsApp (Left). An approval is instantly sent to Arjav's Admin Queue (Right). When Arjav clicks Approve, WhatsApp immediately updates and completes checkout!
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Customer WhatsApp Portal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center">
              <User className="w-4 h-4 mr-1.5" />
              1. Customer / Buyer Portal (WhatsApp Interface)
            </span>
            <span className="text-[11px] text-slate-400">Live Client View</span>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-2 border border-slate-800">
            <CustomerWhatsAppPortal
              products={products}
              pendingApprovals={pendingApprovals}
              decidedApprovals={decidedApprovals}
              onTriggerWebhook={onTriggerWebhook}
              onSwitchToAdmin={() => onNavigateToTab('approvals')}
              compactMode={true}
            />
          </div>
        </div>

        {/* Right Column: Owner / Admin Approvals & Decision Console */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
              <Shield className="w-4 h-4 mr-1.5" />
              2. Store Owner / Admin Console (Arjav Jain)
            </span>
            <span className="text-[11px] text-slate-400">
              {pendingApprovals.length} Pending Approval(s)
            </span>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 h-[640px] overflow-y-auto">
            <ApprovalsManager
              pendingApprovals={pendingApprovals}
              decidedApprovals={decidedApprovals}
              onDecide={onDecideApproval}
              onNavigateToTab={onNavigateToTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
