import React, { useState, useEffect, useRef } from 'react';
import { PlatformRole } from '../types';

interface CommandCenterSidebarProps {
  currentRole: PlatformRole;
  setCurrentRole: (role: PlatformRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount: number;
  lowStockCount: number;
  onOpenNewOrder: () => void;
  onOpenSettings: () => void;
}

export const CommandCenterSidebar: React.FC<CommandCenterSidebarProps> = ({
  currentRole,
  setCurrentRole,
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  lowStockCount,
  onOpenNewOrder,
  onOpenSettings,
}) => {
  // Font size state (12px to 24px)
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('bm-font-size');
    return saved ? parseInt(saved, 10) : 14;
  });

  // Dark/Light theme state
  const [isLight, setIsLight] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'light';
  });

  // Fold states for branched sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    business: true,
    control: true,
    aiHub: true,
  });

  const sidebarRef = useRef<HTMLElement | null>(null);
  const markerRef = useRef<HTMLSpanElement | null>(null);

  // Apply font size to document root
  useEffect(() => {
    document.documentElement.style.setProperty('--bm-font', `${fontSize}px`);
    localStorage.setItem('bm-font-size', fontSize.toString());
  }, [fontSize]);

  // Apply theme to body
  useEffect(() => {
    if (isLight) {
      document.body.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  // Reposition sliding marker
  useEffect(() => {
    const updateMarker = () => {
      if (!sidebarRef.current || !markerRef.current) return;
      const activeEl = sidebarRef.current.querySelector<HTMLElement>('.branched-menu__item[data-active], .branched-menu__head[data-active]');
      if (activeEl) {
        const navRect = sidebarRef.current.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const top = activeRect.top - navRect.top + sidebarRef.current.scrollTop + (activeRect.height - 16) / 2;
        markerRef.current.style.top = `${top}px`;
        markerRef.current.setAttribute('data-on', '');
      } else {
        markerRef.current.removeAttribute('data-on');
      }
    };

    const timer = setTimeout(updateMarker, 50);
    window.addEventListener('resize', updateMarker);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateMarker);
    };
  }, [activeTab, currentRole, openSections]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectTab = (tab: string, role: PlatformRole = 'seller_admin') => {
    setCurrentRole(role);
    setActiveTab(tab);
  };

  const decreaseFont = () => setFontSize((s) => Math.max(12, s - 1));
  const increaseFont = () => setFontSize((s) => Math.min(22, s + 1));

  return (
    <nav className="branched-menu side-nav" id="sideNav" ref={sidebarRef}>
      {/* Font controller (- 14px +) */}
      <div className="font-ctrl">
        <button
          className="font-btn"
          onClick={decreaseFont}
          aria-label="Decrease font size"
          title="Decrease font size"
        >
          −
        </button>
        <span className="font-val">{fontSize}px</span>
        <button
          className="font-btn"
          onClick={increaseFont}
          aria-label="Increase font size"
          title="Increase font size"
        >
          ＋
        </button>
      </div>

      {/* Brand Header */}
      <div className="px-4 pb-3 pt-1 border-b border-white/5">
        <a href="#dashboard" onClick={(e) => { e.preventDefault(); handleSelectTab('dashboard', 'seller_admin'); }} className="brand p-0">
          ⚡ COMMAND CENTER
        </a>
        <div className="text-[11px] text-slate-400 font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Arjav Jain (Owner &amp; Admin)</span>
        </div>
      </div>

      {/* Sliding Marker */}
      <span className="branched-menu__marker" ref={markerRef} aria-hidden="true"></span>

      {/* Section: Dashboard (Leaf) */}
      <div className="branched-menu__section mt-2">
        <button
          className="branched-menu__head"
          data-active={currentRole === 'seller_admin' && activeTab === 'dashboard' ? '' : undefined}
          onClick={() => handleSelectTab('dashboard', 'seller_admin')}
        >
          <span className="flex items-center gap-2">
            <span>📊</span>
            <span>Dashboard</span>
          </span>
        </button>
      </div>

      {/* Section: Business (Foldable) */}
      <div
        className="branched-menu__section"
        data-open={openSections.business ? '' : undefined}
      >
        <button
          className="branched-menu__head"
          data-fold
          aria-expanded={openSections.business}
          onClick={() => toggleSection('business')}
        >
          <span>💼 Business</span>
        </button>
        <div className="branched-menu__body">
          <div className="branched-menu__fold">
            <div className="branched-menu__tree" style={{ height: '120px' }}>
              <svg className="branched-menu__lines" viewBox="0 0 40 120" aria-hidden="true">
                <path
                  className="branched-menu__base"
                  d="M 14 0 V 92 M 14 14 A 10 10 0 0 0 24 24 H 32 M 14 50 A 10 10 0 0 0 24 60 H 32 M 14 86 A 10 10 0 0 0 24 96 H 32"
                />
              </svg>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'seller_admin' && activeTab === 'orders' ? '' : undefined}
                onClick={() => handleSelectTab('orders', 'seller_admin')}
              >
                <span className="branched-menu__label">Orders &amp; Stock</span>
                {lowStockCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 ml-auto border border-rose-500/30">
                    {lowStockCount} low
                  </span>
                )}
              </button>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'seller_admin' && activeTab === 'customers' ? '' : undefined}
                onClick={() => handleSelectTab('customers', 'seller_admin')}
              >
                <span className="branched-menu__label">Customers</span>
              </button>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'seller_admin' && activeTab === 'conversations' ? '' : undefined}
                onClick={() => handleSelectTab('conversations', 'seller_admin')}
              >
                <span className="branched-menu__label">Conversations</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Control (Foldable) */}
      <div
        className="branched-menu__section"
        data-open={openSections.control ? '' : undefined}
      >
        <button
          className="branched-menu__head"
          data-fold
          aria-expanded={openSections.control}
          onClick={() => toggleSection('control')}
        >
          <span className="flex items-center gap-1.5">
            <span>🔒 Control</span>
            {pendingApprovalsCount > 0 && (
              <span className="badge">{pendingApprovalsCount}</span>
            )}
          </span>
        </button>
        <div className="branched-menu__body">
          <div className="branched-menu__fold">
            <div className="branched-menu__tree" style={{ height: '84px' }}>
              <svg className="branched-menu__lines" viewBox="0 0 40 84" aria-hidden="true">
                <path
                  className="branched-menu__base"
                  d="M 14 0 V 56 M 14 14 A 10 10 0 0 0 24 24 H 32 M 14 50 A 10 10 0 0 0 24 60 H 32"
                />
              </svg>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'seller_admin' && activeTab === 'approvals' ? '' : undefined}
                onClick={() => handleSelectTab('approvals', 'seller_admin')}
              >
                <span className="branched-menu__label">Approvals</span>
                {pendingApprovalsCount > 0 && (
                  <span className="badge">{pendingApprovalsCount}</span>
                )}
              </button>
              <button
                className="branched-menu__item"
                onClick={onOpenSettings}
              >
                <span className="branched-menu__label">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section: AI Agents & WhatsApp Hub (Both Buyer & Seller Platform) */}
      <div
        className="branched-menu__section"
        data-open={openSections.aiHub ? '' : undefined}
      >
        <button
          className="branched-menu__head"
          data-fold
          aria-expanded={openSections.aiHub}
          onClick={() => toggleSection('aiHub')}
        >
          <span className="flex items-center gap-1.5">
            <span>💬 WhatsApp &amp; AI</span>
          </span>
        </button>
        <div className="branched-menu__body">
          <div className="branched-menu__fold">
            <div className="branched-menu__tree" style={{ height: '192px' }}>
              <svg className="branched-menu__lines" viewBox="0 0 40 192" aria-hidden="true">
                <path
                  className="branched-menu__base"
                  d="M 14 0 V 164 M 14 14 A 10 10 0 0 0 24 24 H 32 M 14 50 A 10 10 0 0 0 24 60 H 32 M 14 86 A 10 10 0 0 0 24 96 H 32 M 14 122 A 10 10 0 0 0 24 132 H 32 M 14 158 A 10 10 0 0 0 24 168 H 32"
                />
              </svg>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'buyer_whatsapp' ? '' : undefined}
                onClick={() => handleSelectTab('buyer_chat', 'buyer_whatsapp')}
              >
                <span className="branched-menu__label font-semibold text-emerald-400">
                  📱 Customer WhatsApp
                </span>
              </button>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'dual_split' ? '' : undefined}
                onClick={() => handleSelectTab('dual_split', 'dual_split')}
              >
                <span className="branched-menu__label">⚡ Dual Live Bridge</span>
              </button>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'seller_admin' && activeTab === 'agents' ? '' : undefined}
                onClick={() => handleSelectTab('agents', 'seller_admin')}
              >
                <span className="branched-menu__label">🤖 Agent Studio</span>
              </button>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'seller_admin' && activeTab === 'n8n' ? '' : undefined}
                onClick={() => handleSelectTab('n8n', 'seller_admin')}
              >
                <span className="branched-menu__label">🔌 n8n Engine</span>
              </button>
              <button
                className="branched-menu__item"
                data-active={currentRole === 'seller_admin' && activeTab === 'blueprint' ? '' : undefined}
                onClick={() => handleSelectTab('blueprint', 'seller_admin')}
              >
                <span className="branched-menu__label">📐 Blueprint</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Flying Action & Footer */}
      <div className="px-4 pt-3 mt-2 space-y-2">
        <button
          className="btn approve w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 hover:scale-[1.02] transition-all"
          onClick={onOpenNewOrder}
        >
          <span>＋</span>
          <span>Add New Order</span>
        </button>

        <a
          href="/api/download/project-zip"
          download="arjav-ai-command-center.zip"
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 hover:border-slate-500 shadow-sm transition-all"
          title="Download complete project codebase as ZIP"
        >
          <span>📦</span>
          <span>Download Project ZIP</span>
        </a>
      </div>

      {/* Footer: Theme toggle & live meta */}
      <div className="nav-footer">
        <button
          id="themeToggle"
          className="theme-btn"
          onClick={() => setIsLight((prev) => !prev)}
          title="Toggle light / dark mode"
        >
          {isLight ? '☀️' : '🌙'}
        </button>
        <span className="text-[11px] text-slate-400 truncate font-mono">
          Meta WABA Live
        </span>
      </div>
    </nav>
  );
};
