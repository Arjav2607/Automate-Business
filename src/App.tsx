import React, { useState, useEffect, useCallback } from 'react';
import { SilkWaves } from './components/SilkWaves';
import { CommandCenterSidebar } from './components/CommandCenterSidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { OrdersStockView } from './components/OrdersStockView';
import { CustomersView } from './components/CustomersView';
import { ApprovalsManager } from './components/ApprovalsManager';
import { ConversationsFeed } from './components/ConversationsFeed';
import { MissingAgentsHub } from './components/MissingAgentsHub';
import { N8nWorkflowVisualizer } from './components/N8nWorkflowVisualizer';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { CustomerWhatsAppPortal } from './components/CustomerWhatsAppPortal';
import { DualSplitView } from './components/DualSplitView';
import { NewOrderModal } from './components/NewOrderModal';
import { OwnerSettingsModal } from './components/OwnerSettingsModal';
import { PrintBillModal } from './components/PrintBillModal';
import {
  Product,
  Order,
  EnrichedOrder,
  Conversation,
  Approval,
  WebhookLog,
  DashboardStats,
  PlatformRole,
} from './types';

export default function App() {
  const [currentRole, setCurrentRole] = useState<PlatformRole>('seller_admin');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Stats state
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 2,
    todayRevenue: 'Rs 9,497',
    pendingApprovals: 1,
    pendingCount: 1,
    lowStock: 3,
    totalCatalogItems: 6,
    totalAllTimeOrders: 4,
  });

  // Chart data state
  const [chartRange, setChartRange] = useState<string>('week');
  const [chartData, setChartData] = useState<{ labels: string[]; values: number[] }>({
    labels: ['23 Oct', '24 Oct', '25 Oct', '26 Oct', '27 Oct', '28 Oct', '29 Oct'],
    values: [4998, 2499, 12495, 3499, 7497, 8998, 9497],
  });

  // Lists state
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [decidedApprovals, setDecidedApprovals] = useState<Approval[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);

  // Modals state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintBillOpen, setIsPrintBillOpen] = useState(false);

  // Audio chime alert for new approvals (matching original app.js behavior)
  const playApprovalAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // AudioContext may require user gesture on some browsers
    }
  };

  // Fetch all dashboard data
  const fetchData = useCallback(async () => {
    try {
      // 1. Stats
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats((prev) => {
          if (statsData.pendingCount > prev.pendingCount) {
            playApprovalAlert();
          }
          return statsData;
        });
      }

      // 2. Chart
      const chartRes = await fetch(`/api/chart?range=${chartRange}`);
      if (chartRes.ok) {
        const chartJson = await chartRes.json();
        setChartData(chartJson);
      }

      // 3. Orders
      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json();
        setOrders(ordersJson.orders || []);
        setRawOrders(ordersJson.rawOrders || []);
      }

      // 4. Products
      const prodsRes = await fetch('/api/products');
      if (prodsRes.ok) {
        const prodsJson = await prodsRes.json();
        setProducts(prodsJson.products || []);
      }

      // 5. Approvals
      const appRes = await fetch('/api/approvals');
      if (appRes.ok) {
        const appJson = await appRes.json();
        setPendingApprovals(appJson.pending || []);
        setDecidedApprovals(appJson.decided || []);
      }

      // 6. Conversations
      const convRes = await fetch('/api/conversations');
      if (convRes.ok) {
        const convJson = await convRes.json();
        setConversations(convJson.messages || []);
      }

      // 7. Webhook logs
      const logsRes = await fetch('/api/webhook/logs');
      if (logsRes.ok) {
        const logsJson = await logsRes.json();
        setWebhookLogs(logsJson.logs || []);
      }
    } catch (err) {
      console.warn('Network fetch error in App:', err);
    }
  }, [chartRange]);

  // Initial fetch and 4s polling
  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Restock action
  const handleRestock = async (productId: number, quantity: number) => {
    try {
      await fetch('/api/products/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Create manual order
  const handleCreateOrder = async (orderData: any) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create order');
    }
    fetchData();
  };

  // Decide approval
  const handleDecideApproval = async (id: number, decision: 'approved' | 'rejected') => {
    try {
      await fetch(`/api/approvals/${id}/${decision}`, {
        method: 'POST',
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete message
  const handleDeleteMessage = async (id: number) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle flag
  const handleToggleFlag = async (id: number) => {
    try {
      await fetch(`/api/conversations/${id}/flag`, {
        method: 'POST',
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger webhook
  const handleSendWebhook = async (payload: any) => {
    const res = await fetch('/api/webhook/n8n', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    fetchData();
    return data;
  };

  // Download CSV
  const handleExportCsv = () => {
    window.location.href = '/api/bill/csv';
  };

  return (
    <>
      {/* Background Silk Waves */}
      <SilkWaves />

      {/* Main Command Center Layout */}
      <div className="layout">
        {/* Sticky Branched Sidebar */}
        <CommandCenterSidebar
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingApprovalsCount={stats.pendingApprovals}
          lowStockCount={stats.lowStock}
          onOpenNewOrder={() => setIsNewOrderOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Content Area */}
        <main className="content py-4 pr-4">
          {/* VIEW: BUYER WHATSAPP PORTAL */}
          {currentRole === 'buyer_whatsapp' && (
            <div className="px-2">
              <CustomerWhatsAppPortal
                products={products}
                pendingApprovals={pendingApprovals}
                decidedApprovals={decidedApprovals}
                onTriggerWebhook={handleSendWebhook}
                onSwitchToAdmin={() => {
                  setCurrentRole('seller_admin');
                  setActiveTab('approvals');
                }}
              />
            </div>
          )}

          {/* VIEW: DUAL LIVE BRIDGE */}
          {currentRole === 'dual_split' && (
            <div className="px-2">
              <DualSplitView
                products={products}
                pendingApprovals={pendingApprovals}
                decidedApprovals={decidedApprovals}
                onTriggerWebhook={handleSendWebhook}
                onDecideApproval={handleDecideApproval}
                onNavigateToTab={(tab) => {
                  setCurrentRole('seller_admin');
                  setActiveTab(tab);
                }}
              />
            </div>
          )}

          {/* VIEW: SELLER & ADMIN PLATFORM (ARJAV JAIN) */}
          {currentRole === 'seller_admin' && (
            <div className="px-2">
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  stats={stats}
                  chartData={chartData}
                  chartRange={chartRange}
                  setChartRange={setChartRange}
                  orders={orders}
                  products={products}
                  onRestock={handleRestock}
                  onNavigateToTab={setActiveTab}
                  onExportCsv={handleExportCsv}
                  onOpenPrintBill={() => setIsPrintBillOpen(true)}
                />
              )}

              {activeTab === 'orders' && (
                <OrdersStockView
                  products={products}
                  orders={orders}
                  onRestock={handleRestock}
                  onOpenNewOrder={() => setIsNewOrderOpen(true)}
                  onExportCsv={handleExportCsv}
                  onOpenPrintBill={() => setIsPrintBillOpen(true)}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersView orders={orders} />
              )}

              {activeTab === 'conversations' && (
                <ConversationsFeed
                  messages={conversations}
                  onDeleteMessage={handleDeleteMessage}
                  onToggleFlag={handleToggleFlag}
                />
              )}

              {activeTab === 'approvals' && (
                <ApprovalsManager
                  pendingApprovals={pendingApprovals}
                  decidedApprovals={decidedApprovals}
                  onDecide={handleDecideApproval}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'agents' && (
                <MissingAgentsHub
                  products={products}
                  onTriggerApprovalNeeded={handleSendWebhook}
                  onTriggerOrderPlaced={handleSendWebhook}
                  onTriggerMessageLogged={handleSendWebhook}
                  onNavigateToTab={setActiveTab}
                  pendingApprovalsCount={stats.pendingApprovals}
                />
              )}

              {activeTab === 'n8n' && (
                <N8nWorkflowVisualizer
                  logs={webhookLogs}
                  onSendWebhook={handleSendWebhook}
                />
              )}

              {activeTab === 'blueprint' && <ArchitectureGuide />}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        products={products}
        onSubmit={handleCreateOrder}
      />

      <OwnerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <PrintBillModal
        isOpen={isPrintBillOpen}
        onClose={() => setIsPrintBillOpen(false)}
        orders={rawOrders}
        onDownloadCsv={handleExportCsv}
      />
    </>
  );
}
