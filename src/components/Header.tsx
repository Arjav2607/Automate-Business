import React from 'react';
import {
  LayoutDashboard,
  Bot,
  CheckCircle2,
  MessageSquare,
  Network,
  BookOpen,
  PlusCircle,
  Shield,
  Activity,
  Zap,
  User,
  Split,
} from 'lucide-react';
import { PlatformRole } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount: number;
  lowStockCount: number;
  currentRole: PlatformRole;
  setCurrentRole: (role: PlatformRole) => void;
  onOpenNewOrder: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  lowStockCount,
  currentRole,
  setCurrentRole,
  onOpenNewOrder,
  onOpenSettings,
}) => {
  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'agents',
      label: 'Agents Studio',
      icon: Bot,
      badge: '5 Agents',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: CheckCircle2,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Pending` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse',
    },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'n8n', label: 'n8n Webhook Engine', icon: Network },
    {
      id: 'blueprint',
      label: 'Architecture Guide',
      icon: BookOpen,
      badge: 'Guide',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                  Arjav AI <span className="text-indigo-400">Commerce Hub</span>
                </span>
                <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-3 h-3 mr-1 animate-pulse" />
                  Live Webhook: /api/webhook/n8n
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Dual-Sided Platform for Buyers (WhatsApp) &amp; Owner/Admin (Arjav Jain)
              </p>
            </div>
          </div>

          {/* Persona / Role Switcher - THE CORE NEW ADDITION */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setCurrentRole('seller_admin')}
              className={`flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentRole === 'seller_admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 mr-1 text-amber-300" />
              <span>Owner / Admin</span>
            </button>

            <button
              onClick={() => setCurrentRole('buyer_whatsapp')}
              className={`flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentRole === 'buyer_whatsapp'
                  ? 'bg-[#00a884] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1 text-emerald-300" />
              <span>Customer WhatsApp</span>
            </button>

            <button
              onClick={() => setCurrentRole('dual_split')}
              className={`hidden md:flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentRole === 'dual_split'
                  ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Split className="w-3.5 h-3.5 mr-1 text-teal-300" />
              <span>Dual Live Bridge</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onOpenNewOrder}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              <span>New Order</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Owner Settings & Security Lockout"
            >
              <Shield className="w-4 h-4 text-amber-400 sm:mr-1.5 inline" />
              <span className="hidden lg:inline">Arjav Jain</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation row when in Admin Console mode */}
        {currentRole === 'seller_admin' && (
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 pt-1 border-t border-slate-800/60 no-scrollbar">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-1.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};
