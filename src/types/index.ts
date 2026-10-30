export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  sku: string;
  category: string;
}

export interface Order {
  id: number;
  created_at: string;
  agent_id: string;
  customer: string;
  product: string;
  quantity: number;
  amount: number;
  status: 'placed' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  phone?: string;
  email?: string;
  location?: string;
  note?: string;
}

export interface EnrichedOrder {
  order: Order;
  total_orders: number;
  total_spent: number;
  last_msg: string;
}

export interface Conversation {
  id: number;
  created_at: string;
  agent_id: string;
  customer: string;
  sender: 'customer' | 'agent' | 'system';
  message: string;
  audio_url?: string;
  duration?: number;
  flagged?: number;
}

export interface Approval {
  id: number;
  created_at: string;
  agent_id: string;
  type: string;
  summary: string;
  context: {
    customer?: string;
    product?: string;
    quantity?: number;
    retailPrice?: number;
    discountPct?: number;
    proposedAmount?: number;
    pastOrders?: number;
    grossMarginRemaining?: string;
    channel?: string;
    note?: string;
    [key: string]: any;
  };
  resume_url: string;
  status: 'pending' | 'approved' | 'rejected';
  decided_at?: string;
}

export interface CustomerSummary {
  name: string;
  orders: Order[];
  total: number;
  feedback?: {
    customer: string;
    rating: number;
    note: string;
    updated_at: string;
  } | null;
  lastActive: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  event: string;
  source: string;
  status: 'success' | 'warning' | 'error';
  payload: any;
}

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: string;
  pendingApprovals: number;
  pendingCount: number;
  lowStock: number;
  totalCatalogItems: number;
  totalAllTimeOrders: number;
}

export type PlatformRole = 'seller_admin' | 'buyer_whatsapp' | 'dual_split';

