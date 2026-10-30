import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  evaluateDiscountPolicy,
  calculateOrderSummary,
  detectCustomerSentiment,
} from './src/utils/agent-logic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-Memory Database replicating the SQLite tables from app.py
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  sku: string;
  category: string;
}

interface Order {
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

interface Conversation {
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

interface Approval {
  id: number;
  created_at: string;
  agent_id: string;
  type: string;
  summary: string;
  context: any;
  resume_url: string;
  status: 'pending' | 'approved' | 'rejected';
  decided_at?: string;
}

interface Feedback {
  customer: string;
  rating: number;
  note: string;
  updated_at: string;
}

// Initial Data
let products: Product[] = [
  { id: 1, name: 'Wireless Pro Headphones', price: 2499, stock: 14, sku: 'WPH-01', category: 'Audio' },
  { id: 2, name: 'Ultra Mechanical Keyboard', price: 4999, stock: 4, sku: 'UMK-RGB', category: 'Peripherals' }, // LOW STOCK
  { id: 3, name: 'Ergonomic Gaming Mouse', price: 1899, stock: 22, sku: 'EGM-X', category: 'Peripherals' },
  { id: 4, name: 'USB-C 100W Fast Charger', price: 1299, stock: 3, sku: 'USBC-100', category: 'Accessories' }, // LOW STOCK
  { id: 5, name: 'Smart Noise-Canceling Earbuds', price: 3499, stock: 8, sku: 'ANC-EB2', category: 'Audio' },
  { id: 6, name: '4K UltraWide Monitor 34"', price: 38999, stock: 2, sku: 'UWM-4K', category: 'Displays' }, // LOW STOCK
];

let nextOrderId = 105;
let orders: Order[] = [
  {
    id: 101,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    agent_id: 'agent_maya_voice',
    customer: 'Rahul Sharma',
    product: 'Wireless Pro Headphones',
    quantity: 2,
    amount: 4998,
    status: 'placed',
    phone: '+91 98201 12345',
    email: 'rahul.sharma@example.com',
    location: 'Mumbai, Maharashtra',
    note: 'Customer ordered via Phone Call with Voice Agent Maya',
  },
  {
    id: 102,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    agent_id: 'agent_aura_chat',
    customer: 'Priya Patel',
    product: 'Ultra Mechanical Keyboard',
    quantity: 1,
    amount: 4499, // 10% VIP discount approved by owner
    status: 'confirmed',
    phone: '+91 98765 43210',
    email: 'priya.p@example.com',
    location: 'Ahmedabad, Gujarat',
    note: 'Special 10% discount approved by Arjav via Human-in-the-Loop',
  },
  {
    id: 103,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    agent_id: 'agent_kavya_support',
    customer: 'Vikram Mehta',
    product: 'Ergonomic Gaming Mouse',
    quantity: 1,
    amount: 1899,
    status: 'dispatched',
    phone: '+91 91234 56789',
    email: 'vikram.m@example.com',
    location: 'Bangalore, Karnataka',
    note: 'Replacement upsell handled by Support Agent',
  },
  {
    id: 104,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    agent_id: 'manual',
    customer: 'Ananya Roy',
    product: 'Smart Noise-Canceling Earbuds',
    quantity: 1,
    amount: 3499,
    status: 'delivered',
    phone: '+91 99887 76655',
    email: 'ananya.roy@example.com',
    location: 'Kolkata, West Bengal',
    note: 'Walk-in customer booked manually by Arjav',
  },
];

let nextConvId = 15;
let conversations: Conversation[] = [
  {
    id: 1,
    created_at: new Date(Date.now() - 3600000 * 2.2).toISOString(),
    agent_id: 'agent_maya_voice',
    customer: 'Rahul Sharma',
    sender: 'customer',
    message: 'Hello! I saw your ad for Wireless Pro Headphones. Do you have them in black and what is the best price?',
    audio_url: 'https://actions.google.com/sounds/v1/speech/greeting_male.ogg',
    duration: 6,
    flagged: 0,
  },
  {
    id: 2,
    created_at: new Date(Date.now() - 3600000 * 2.1).toISOString(),
    agent_id: 'agent_maya_voice',
    customer: 'Rahul Sharma',
    sender: 'agent',
    message: 'Hi Rahul! Yes, we have 14 units of the Wireless Pro Headphones in stock at Rs 2,499 with free express shipping across India. Would you like me to book a pair for you?',
    audio_url: 'https://actions.google.com/sounds/v1/speech/agent_response.ogg',
    duration: 8,
    flagged: 0,
  },
  {
    id: 3,
    created_at: new Date(Date.now() - 3600000 * 2.0).toISOString(),
    agent_id: 'agent_maya_voice',
    customer: 'Rahul Sharma',
    sender: 'customer',
    message: 'Yes please, book 2 units for my home address in Mumbai.',
    audio_url: 'https://actions.google.com/sounds/v1/speech/customer_confirm.ogg',
    duration: 4,
    flagged: 0,
  },
  {
    id: 4,
    created_at: new Date(Date.now() - 3600000 * 5.5).toISOString(),
    agent_id: 'agent_aura_chat',
    customer: 'Priya Patel',
    sender: 'customer',
    message: 'Can I get a 10% discount on the Ultra Mechanical Keyboard? I have bought 3 times from your store earlier.',
    flagged: 0,
  },
  {
    id: 5,
    created_at: new Date(Date.now() - 3600000 * 5.4).toISOString(),
    agent_id: 'agent_aura_chat',
    customer: 'Priya Patel',
    sender: 'agent',
    message: "I see your past order history with us, Priya! Since 10% exceeds my automated checkout allowance, I have forwarded your request directly to Arjav for one-click approval. One moment please...",
    flagged: 0,
  },
  {
    id: 6,
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    agent_id: 'agent_kavya_support',
    customer: 'Amitabh Sen',
    sender: 'customer',
    message: 'Where is my order? This is terrible, nobody is answering and I need this for my office presentation tomorrow morning!!',
    flagged: 1, // Automatically flagged due to distress
  },
];

let nextApprovalId = 3;
let approvals: Approval[] = [
  {
    id: 1,
    created_at: new Date(Date.now() - 3600000 * 5.3).toISOString(),
    agent_id: 'agent_aura_chat',
    type: 'discount_request',
    summary: 'Priya Patel requested 10% VIP discount on Ultra Mechanical Keyboard',
    context: {
      customer: 'Priya Patel',
      product: 'Ultra Mechanical Keyboard',
      retailPrice: 4999,
      discountPct: 10,
      proposedAmount: 4499,
      pastOrders: 3,
      grossMarginRemaining: '33%',
      channel: 'WhatsApp Sales Agent',
    },
    resume_url: 'http://localhost:3000/api/internal/mock-resume/1',
    status: 'approved',
    decided_at: new Date(Date.now() - 3600000 * 5.2).toISOString(),
  },
  {
    id: 2,
    created_at: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    agent_id: 'agent_aura_chat',
    type: 'discount_request',
    summary: 'Karan Kapoor requested 20% bulk discount for 3 units of Ultra Mechanical Keyboard',
    context: {
      customer: 'Karan Kapoor',
      product: 'Ultra Mechanical Keyboard',
      quantity: 3,
      retailPrice: 14997,
      discountPct: 20,
      proposedAmount: 11998,
      pastOrders: 1,
      grossMarginRemaining: '25%',
      channel: 'WhatsApp Sales Agent',
      note: 'Customer wants bulk deal for startup office',
    },
    resume_url: 'http://localhost:3000/api/internal/mock-resume/2',
    status: 'pending',
  },
];

let feedbacks: Record<string, Feedback> = {
  'Rahul Sharma': {
    customer: 'Rahul Sharma',
    rating: 5,
    note: 'Very polite voice customer. Paid via UPI immediately.',
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  'Priya Patel': {
    customer: 'Priya Patel',
    rating: 5,
    note: 'Repeat buyer, always fast checkout when discount is granted.',
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  'Amitabh Sen': {
    customer: 'Amitabh Sen',
    rating: 2,
    note: 'Stressed about delivery delay, gave priority courier tracking.',
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
};

// Credentials & Lockout
let credentials = {
  owner_id: 'Arjav Jain',
  password: process.env.OWNER_PASSWORD || 'owner123',
  recovery_code: 'RECOVER42',
};

let attempts = {
  fails: 0,
  locked_until: 0,
  recovery_fails: 0,
  recovery_year: new Date().getFullYear(),
};

// Live webhook activity stream log
interface WebhookLog {
  id: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  event: string;
  source: string;
  status: 'success' | 'warning' | 'error';
  payload: any;
}

let webhookLogs: WebhookLog[] = [
  {
    id: 'evt-001',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    direction: 'inbound',
    event: 'order_placed',
    source: 'agent_maya_voice',
    status: 'success',
    payload: {
      agent_id: 'agent_maya_voice',
      customer: 'Rahul Sharma',
      product: 'Wireless Pro Headphones',
      quantity: 2,
      amount: 4998,
    },
  },
  {
    id: 'evt-002',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    direction: 'inbound',
    event: 'approval_needed',
    source: 'agent_aura_chat',
    status: 'success',
    payload: {
      agent_id: 'agent_aura_chat',
      type: 'discount_request',
      summary: 'Karan Kapoor requested 20% bulk discount for 3 units',
      resume_url: 'http://localhost:3000/api/internal/mock-resume/2',
    },
  },
];

// Active mock agent pause-callbacks waiting for owner decision
const waitingAgentCallbacks = new Map<number, (decision: 'approved' | 'rejected') => void>();

// Helper to push webhook event log
function logWebhook(direction: 'inbound' | 'outbound', event: string, source: string, payload: any, status: 'success' | 'warning' | 'error' = 'success') {
  const logItem: WebhookLog = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    direction,
    event,
    source,
    status,
    payload,
  };
  webhookLogs.unshift(logItem);
  if (webhookLogs.length > 50) webhookLogs.pop();
  return logItem;
}

// Meta WhatsApp Cloud API credentials configured for Arjav Jain
const WHATSAPP_TOKEN =
  process.env.WHATSAPP_TOKEN ||
  'EAAUs9abQaMUBSzRuIVpueWcqdgF1l7UXxuZAZCfCcopf2bqiKD0tdnQkj8WCvUdqlUs92QT355mcWvQ0ZAFGgnk9vuikYEl8GhaYAzRs91ueGvj2iMo7Li8HtzxNdxaTbdZBwlPyvwkIMliDf4KkY9OmAZC5ImIg2gDh88fxKTsZAAZAnHl91Rit27eeDBZBw3ThvyUG5VVTLkAG8XQoK6j4y4gPdwFZBbMflpRlUpJss9ZBcJd0ZBOMI1QlaT14OMmihqxNGGcMwDQqyJ9TgVo2ZAXBgets';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1400940463102580';
const WHATSAPP_ACCOUNT_ID = process.env.WHATSAPP_ACCOUNT_ID || '1840482170413388';
const WHATSAPP_PHONE_NUMBER = process.env.WHATSAPP_PHONE_NUMBER || '+1 (555) 214-5018';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'arjav_agent_verify_token_2026';

// Outbound message dispatcher to Meta WhatsApp Cloud API
async function sendWhatsAppMessage(toPhone: string, text: string) {
  const cleanPhone = toPhone.replace(/\D/g, '');
  if (!cleanPhone) return { error: 'Invalid phone number' };

  try {
    const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    });
    const data = await response.json();
    logWebhook(
      'outbound',
      'whatsapp_message_sent',
      'meta_cloud_api',
      { to: cleanPhone, text, metaResponse: data },
      response.ok ? 'success' : 'warning'
    );
    return data;
  } catch (err: any) {
    console.error('Meta WhatsApp Cloud API error:', err);
    logWebhook('outbound', 'whatsapp_send_failed', 'meta_cloud_api', { error: err.message }, 'error');
    return { error: err.message };
  }
}

// ----------------- API Endpoints matching app.py -----------------

// 1. Stats endpoint
app.get('/api/stats', (req: Request, res: Response) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.created_at.slice(0, 10) === todayStr);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.amount, 0);
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const lowStock = products.filter((p) => p.stock < 5).length;

  res.json({
    todayOrders: todayOrders.length,
    todayRevenue: `Rs ${todayRevenue.toLocaleString()}`,
    pendingApprovals,
    pendingCount: pendingApprovals,
    lowStock,
    totalCatalogItems: products.length,
    totalAllTimeOrders: orders.length,
  });
});

// 2. Chart endpoint
app.get('/api/chart', (req: Request, res: Response) => {
  const rng = (req.query.range as string) || 'week';
  const now = new Date();
  const labels: string[] = [];
  const values: number[] = [];

  if (rng === 'day') {
    for (let h = 9; h <= 21; h += 2) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      labels.push(label);
      // Aggregate dummy / real day distribution
      const orderMatch = orders.filter((o) => {
        const d = new Date(o.created_at);
        return d.getDate() === now.getDate() && Math.abs(d.getHours() - h) <= 1;
      });
      const total = orderMatch.reduce((sum, o) => sum + o.amount, 0);
      values.push(total > 0 ? total : Math.floor(Math.random() * 2000));
    }
  } else if (rng === 'month') {
    for (let i = 25; i >= 0; i -= 5) {
      const d = new Date(Date.now() - i * 86400000);
      const label = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
      labels.push(label);
      values.push(Math.floor(4000 + Math.random() * 15000));
    }
  } else if (rng === 'year') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    months.forEach((m) => {
      labels.push(m);
      values.push(Math.floor(25000 + Math.random() * 55000));
    });
  } else {
    // week default (past 7 days)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
      labels.push(label);
      const dayStr = d.toISOString().slice(0, 10);
      const matching = orders.filter((o) => o.created_at.slice(0, 10) === dayStr);
      const sum = matching.reduce((acc, o) => acc + o.amount, 0);
      values.push(sum > 0 ? sum : Math.floor(1800 + (6 - i) * 1200));
    }
  }

  res.json({ labels, values });
});

// 3. Orders endpoints
app.get('/api/orders', (req: Request, res: Response) => {
  const rng = (req.query.range as string) || 'all';
  let filtered = [...orders];

  if (rng === 'day') {
    const today = new Date().toISOString().slice(0, 10);
    filtered = filtered.filter((o) => o.created_at.slice(0, 10) === today);
  } else if (rng === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    filtered = filtered.filter((o) => o.created_at >= weekAgo);
  } else if (rng === 'month') {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    filtered = filtered.filter((o) => o.created_at >= monthAgo);
  }

  // Enrich with customer stats & last message like in app.py
  const enriched = filtered.map((o) => {
    const customerOrders = orders.filter((x) => x.customer === o.customer);
    const totalSpent = customerOrders.reduce((sum, x) => sum + x.amount, 0);
    const customerChats = conversations
      .filter((c) => c.customer === o.customer)
      .sort((a, b) => b.id - a.id);
    const lastMsg = customerChats.length > 0 ? customerChats[0].message : 'No chats yet';

    return {
      order: o,
      total_orders: customerOrders.length,
      total_spent: totalSpent,
      last_msg: lastMsg,
    };
  });

  res.json({ orders: enriched, rawOrders: orders });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { customer, product, quantity, phone, email, location, note } = req.body;
  const qty = parseInt(quantity, 10) || 1;

  if (!customer || !product || qty < 1) {
    return res.status(400).json({ ok: false, error: 'Need a customer, a product and quantity >= 1' });
  }

  const p = products.find((item) => item.name === product);
  if (!p) {
    return res.status(404).json({ ok: false, error: 'Unknown product' });
  }

  const amount = p.price * qty;
  const newOrder: Order = {
    id: nextOrderId++,
    created_at: new Date().toISOString(),
    agent_id: 'manual',
    customer: customer.trim(),
    product: product.trim(),
    quantity: qty,
    amount,
    status: 'placed',
    phone: phone ? phone.trim().slice(0, 50) : undefined,
    email: email ? email.trim().slice(0, 80) : undefined,
    location: location ? location.trim().slice(0, 100) : undefined,
    note: note ? note.trim().slice(0, 200) : undefined,
  };

  orders.unshift(newOrder);
  p.stock = Math.max(0, p.stock - qty);

  res.json({ ok: true, amount, order: newOrder });
});

// 4. Products endpoints
app.get('/api/products', (req: Request, res: Response) => {
  const lowCount = products.filter((p) => p.stock < 5).length;
  res.json({ products, lowCount });
});

app.post('/api/products/restock', (req: Request, res: Response) => {
  const { productId, quantity } = req.body;
  const p = products.find((x) => x.id === Number(productId));
  if (!p) return res.status(404).json({ ok: false, error: 'Product not found' });

  const addQty = parseInt(quantity, 10) || 10;
  p.stock += addQty;

  logWebhook('inbound', 'stock_update', 'agent_inventory_guardian', {
    product: p.name,
    stock: p.stock,
    added: addQty,
  });

  res.json({ ok: true, product: p });
});

// 5. Customers endpoint
app.get('/api/customers', (req: Request, res: Response) => {
  const byCustomer: Record<string, Order[]> = {};
  orders.forEach((o) => {
    if (!byCustomer[o.customer]) byCustomer[o.customer] = [];
    byCustomer[o.customer].push(o);
  });

  const customerList = Object.keys(byCustomer).map((name) => {
    const custOrders = byCustomer[name];
    const total = custOrders.reduce((sum, x) => sum + x.amount, 0);
    return {
      name,
      orders: custOrders,
      total,
      feedback: feedbacks[name] || null,
      lastActive: custOrders[0]?.created_at || new Date().toISOString(),
    };
  });

  res.json({ customers: customerList });
});

// 6. Feedback endpoint
app.post('/api/feedback', (req: Request, res: Response) => {
  const { customer, rating, note } = req.body;
  if (!customer) return res.status(400).json({ ok: false, error: 'Customer name is required' });

  feedbacks[customer] = {
    customer,
    rating: Number(rating) || 5,
    note: note || '',
    updated_at: new Date().toISOString(),
  };

  res.json({ ok: true });
});

// 7. Conversations endpoint
app.get('/api/conversations', (req: Request, res: Response) => {
  res.json({ messages: [...conversations].reverse() });
});

app.delete('/api/conversations/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  conversations = conversations.filter((c) => c.id !== id);
  res.json({ ok: true });
});

app.post('/api/conversations/:id/flag', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const msg = conversations.find((c) => c.id === id);
  if (!msg) return res.status(404).json({ ok: false, error: 'Message not found' });

  msg.flagged = msg.flagged ? 0 : 1;
  res.json({ ok: true, flagged: msg.flagged });
});

// 8. Approvals endpoints
app.get('/api/approvals', (req: Request, res: Response) => {
  const pending = approvals.filter((a) => a.status === 'pending');
  const decided = approvals.filter((a) => a.status !== 'pending');
  res.json({ pending, decided });
});

app.post('/api/approvals/:id/:decision', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const decision = req.params.decision as 'approved' | 'rejected';

  if (decision !== 'approved' && decision !== 'rejected') {
    return res.status(400).json({ ok: false, error: 'Decision must be approved or rejected' });
  }

  const appItem = approvals.find((a) => a.id === id);
  if (!appItem) return res.status(404).json({ ok: false, error: 'Approval not found' });
  if (appItem.status !== 'pending') {
    return res.status(400).json({ ok: false, error: 'Already decided' });
  }

  appItem.status = decision;
  appItem.decided_at = new Date().toISOString();

  // Resume notification for n8n or simulated agent
  logWebhook('outbound', 'approval_resumed', 'owner_dashboard', {
    approval_id: id,
    decision,
    agent_id: appItem.agent_id,
    resume_url: appItem.resume_url,
  });

  // If this approval was waiting in memory for a live simulated agent:
  const waitingCb = waitingAgentCallbacks.get(id);
  if (waitingCb) {
    waitingCb(decision);
    waitingAgentCallbacks.delete(id);
  }

  // If approved and was a discount_request, create order if context specifies
  if (decision === 'approved' && appItem.type === 'discount_request' && appItem.context) {
    const ctx = appItem.context;
    if (ctx.customer && ctx.product) {
      const p = products.find((item) => item.name === ctx.product);
      if (p) {
        const qty = ctx.quantity || 1;
        const newOrder: Order = {
          id: nextOrderId++,
          created_at: new Date().toISOString(),
          agent_id: appItem.agent_id,
          customer: ctx.customer,
          product: ctx.product,
          quantity: qty,
          amount: ctx.proposedAmount || p.price * qty,
          status: 'confirmed',
          note: `Auto-created upon Arjav's approval of ${ctx.discountPct || 10}% discount`,
        };
        orders.unshift(newOrder);
        p.stock = Math.max(0, p.stock - qty);
      }
    }

    // Auto-notify customer on WhatsApp if phone is present in context
    if (ctx.phone) {
      const decisionMsg =
        decision === 'approved'
          ? `🎉 Namaste ${ctx.customer}! Store owner Arjav Jain has personally APPROVED your ${ctx.discountPct || 10}% discount for ${ctx.product}! Your total is now Rs ${(ctx.proposedAmount || 0).toLocaleString()}. Your order is confirmed and scheduled for dispatch.`
          : `Namaste ${ctx.customer}, store owner Arjav Jain reviewed your requested ${ctx.discountPct}% discount for ${ctx.product}. Unfortunately, we cannot offer ${ctx.discountPct}% due to supplier margins, but our standard 5% discount remains active for you!`;
      sendWhatsAppMessage(ctx.phone, decisionMsg).catch(() => {});
    }
  }

  res.json({ ok: true, status: decision });
});

// 9. THE n8n Webhook Ingestion Route (/api/webhook/n8n)
app.post('/api/webhook/n8n', (req: Request, res: Response) => {
  const token = process.env.N8N_TOKEN;
  if (token && req.headers['x-webhook-token'] !== token) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const data = req.body || {};
  const event = data.event;

  logWebhook('inbound', event || 'unknown', data.agent_id || 'n8n_workflow', data);

  if (event === 'order_placed') {
    const product = data.product;
    const quantity = parseInt(data.quantity, 10) || 1;
    const p = products.find((item) => item.name === product);

    const newOrder: Order = {
      id: nextOrderId++,
      created_at: new Date().toISOString(),
      agent_id: data.agent_id || 'n8n_agent',
      customer: data.customer || 'Guest Customer',
      product: product,
      quantity,
      amount: Number(data.amount) || (p ? p.price * quantity : 0),
      status: (data.status as any) || 'placed',
      phone: data.phone,
      email: data.email,
      location: data.location,
      note: data.note || 'Placed via n8n automation webhook',
    };
    orders.unshift(newOrder);

    if (p) {
      p.stock = Math.max(0, p.stock - quantity);
    }
    return res.json({ ok: true, orderId: newOrder.id });
  }

  if (event === 'message') {
    const sentiment = detectCustomerSentiment(data.text || data.message || '');
    const newMsg: Conversation = {
      id: nextConvId++,
      created_at: new Date().toISOString(),
      agent_id: data.agent_id || 'n8n_chat_agent',
      customer: data.customer || 'Anonymous',
      sender: data.sender || 'customer',
      message: data.text || data.message || '',
      audio_url: data.audio_url,
      duration: Number(data.duration) || 0,
      flagged: data.flagged !== undefined ? data.flagged : sentiment.shouldFlag ? 1 : 0,
    };
    conversations.push(newMsg);
    return res.json({ ok: true, messageId: newMsg.id, sentiment: sentiment.sentiment });
  }

  if (event === 'approval_needed') {
    const newApproval: Approval = {
      id: nextApprovalId++,
      created_at: new Date().toISOString(),
      agent_id: data.agent_id || 'sales_agent',
      type: data.type || 'discount_request',
      summary: data.summary || 'Human approval requested',
      context: data.context || {},
      resume_url: data.resume_url || `http://localhost:3000/api/internal/mock-resume/${nextApprovalId}`,
      status: 'pending',
    };
    approvals.unshift(newApproval);
    return res.json({ ok: true, approvalId: newApproval.id });
  }

  if (event === 'stock_update') {
    const p = products.find((item) => item.name === data.product);
    if (!p) return res.status(404).json({ ok: false, error: 'Product not found' });
    p.stock = Number(data.stock);
    return res.json({ ok: true, product: p });
  }

  return res.status(400).json({ ok: false, error: `unknown event: ${event}` });
});

// 10. Webhook logs stream endpoint
app.get('/api/webhook/logs', (req: Request, res: Response) => {
  res.json({ logs: webhookLogs });
});

// 11. Security & Settings endpoints
app.post('/api/recover', (req: Request, res: Response) => {
  const { recovery_code, new_password } = req.body;
  const currentYear = new Date().getFullYear();

  if (attempts.recovery_year !== currentYear) {
    attempts.recovery_year = currentYear;
    attempts.recovery_fails = 0;
  }

  if (attempts.recovery_fails >= 3) {
    return res.status(423).json({
      ok: false,
      error: 'Recovery is locked',
      retry_text: `until ${currentYear + 1} — too many wrong recovery codes this year`,
    });
  }

  if ((recovery_code || '').trim() !== credentials.recovery_code) {
    attempts.recovery_fails += 1;
    const left = Math.max(0, 3 - attempts.recovery_fails);
    return res.status(401).json({
      ok: false,
      error: 'Wrong recovery code',
      attempts_left: left,
      locked: left === 0,
    });
  }

  if (new_password) {
    if (new_password.trim().length < 6) {
      return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters' });
    }
    credentials.password = new_password.trim();
  }

  attempts.fails = 0;
  attempts.locked_until = 0;
  attempts.recovery_fails = 0;

  res.json({ ok: true });
});

app.post('/api/credentials', (req: Request, res: Response) => {
  const { current, owner_id, new_password, recovery_code } = req.body;
  if (current !== credentials.password) {
    return res.status(400).json({ ok: false, error: 'Current password is wrong' });
  }

  if (owner_id) credentials.owner_id = owner_id.trim();
  if (recovery_code) credentials.recovery_code = recovery_code.trim();
  if (new_password) {
    if (new_password.trim().length < 6) {
      return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters' });
    }
    credentials.password = new_password.trim();
  }

  res.json({ ok: true, owner_id: credentials.owner_id });
});

// 12. Bill export endpoint (CSV & printable summary)
app.get('/api/bill/csv', (req: Request, res: Response) => {
  const headers = ['id', 'time', 'agent', 'customer', 'product', 'qty', 'amount', 'status'];
  const rows = orders.map((o) =>
    [o.id, o.created_at, o.agent_id, `"${o.customer}"`, `"${o.product}"`, o.quantity, o.amount, o.status].join(',')
  );
  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders_bill.csv"');
  res.send(csvContent);
});

// 12b. Full Project ZIP Export endpoint
app.get('/api/download/project-zip', (req: Request, res: Response) => {
  const zipPath = path.join(__dirname, 'public', 'arjav-ai-command-center.zip');
  res.download(zipPath, 'arjav-ai-command-center.zip', (err) => {
    if (err) {
      console.error('Error downloading zip:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to download zip' });
    }
  });
});

// 13. Meta WhatsApp Cloud API Webhook Verification (GET)
// Meta sends a GET request with hub.challenge when you configure the Webhook URL in Meta Developer Console
app.get('/api/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('Meta WhatsApp Webhook subscription verified successfully!');
    logWebhook('inbound', 'whatsapp_webhook_verified', 'meta_developer_console', { mode, verify_token: token });
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 14. Meta WhatsApp Incoming Messages Webhook (POST)
// Ingests live inbound WhatsApp customer messages, runs agent reasoning, and replies via Meta Cloud API
app.post('/api/webhook/whatsapp', async (req: Request, res: Response) => {
  // Acknowledge receipt to Meta immediately (prevents duplicate retries)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (message && message.type === 'text') {
      const fromPhone = message.from;
      const incomingText = message.text.body;
      const customerName = contact?.profile?.name || `Customer (+${fromPhone})`;

      logWebhook('inbound', 'whatsapp_message_received', 'meta_cloud_api', {
        from: fromPhone,
        customer: customerName,
        text: incomingText,
      });

      // Log conversation to database
      const sentiment = detectCustomerSentiment(incomingText);
      conversations.push({
        id: nextConvId++,
        created_at: new Date().toISOString(),
        agent_id: 'agent_aura_chat',
        customer: customerName,
        sender: 'customer',
        message: incomingText,
        flagged: sentiment.shouldFlag ? 1 : 0,
      });

      // Check discount negotiation intent
      const discountMatch = incomingText.match(/(\d+)%\s*(off|discount)/i) || incomingText.match(/discount.*?(\d+)%/i);
      const requestedDiscount = discountMatch ? parseInt(discountMatch[1], 10) : 0;

      if (requestedDiscount > 0) {
        const policy = evaluateDiscountPolicy({
          orderTotal: 5000,
          requestedDiscountPct: requestedDiscount,
          customerOrderCount: 1,
        });

        if (policy.requiresApproval) {
          const matchedProduct = products.find((p) =>
            incomingText.toLowerCase().includes(p.name.toLowerCase().split(' ')[0].toLowerCase())
          ) || products[0];

          const orderCalc = calculateOrderSummary(matchedProduct.price, 1, requestedDiscount);
          const approvalId = nextApprovalId++;
          approvals.unshift({
            id: approvalId,
            created_at: new Date().toISOString(),
            agent_id: 'agent_aura_chat',
            type: 'discount_request',
            summary: `${customerName} requested ${requestedDiscount}% discount on ${matchedProduct.name} via WhatsApp`,
            context: {
              customer: customerName,
              phone: fromPhone,
              product: matchedProduct.name,
              retailPrice: matchedProduct.price,
              discountPct: requestedDiscount,
              proposedAmount: orderCalc.finalAmount,
              pastOrders: 1,
              grossMarginRemaining: `${orderCalc.marginPct}%`,
              channel: 'Real WhatsApp Cloud API',
            },
            resume_url: `http://localhost:3000/api/internal/mock-resume/${approvalId}`,
            status: 'pending',
          });

          await sendWhatsAppMessage(
            fromPhone,
            `Namaste ${customerName}! I see you're requesting a ${requestedDiscount}% discount on the ${matchedProduct.name}. Because this is above standard checkout allowance, I have forwarded your request directly to our store owner, Arjav Jain, for 1-click approval. Please hold on a moment while Arjav reviews it!`
          );
          return;
        }
      }

      // Generate AI response via Gemini or intelligent catalog rules
      const cleanMsg = incomingText.toLowerCase();
      let replyText = '';

      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: { 'User-Agent': 'aistudio-build' },
            },
          });

          const catalogSummary = products
            .map((p) => `- ${p.name}: Rs ${p.price.toLocaleString()} (Stock: ${p.stock})`)
            .join('\n');

          const systemPrompt = `You are Aura, the official WhatsApp AI concierge for Arjav Jain's premium electronics store.
Store Catalog:
${catalogSummary}

Customer Name/Phone: ${customerName} (${fromPhone})

Rules:
1. Keep replies concise and formatted for WhatsApp (under 45 words, emojis allowed, bold with asterisks like *Product*).
2. Quote prices in Indian Rupees (Rs).
3. If they want to purchase or book an item, confirm product name and tell them to reply 'CONFIRM' with delivery location.
4. Stock quantities must strictly match the store catalog above.
5. If an item has low stock (< 5 units), mention limited inventory.`;

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: incomingText,
            config: {
              systemInstruction: systemPrompt,
            },
          });

          if (aiResponse.text) {
            replyText = aiResponse.text.trim();
          }
        } catch (genErr) {
          console.warn('Gemini error for WhatsApp webhook, using autonomous fallback:', genErr);
        }
      }

      if (!replyText) {
        if (cleanMsg.includes('price') || cleanMsg.includes('catalog') || cleanMsg.includes('product') || cleanMsg.includes('stock')) {
          const matched = products.find((p) => cleanMsg.includes(p.name.toLowerCase().split(' ')[0])) || products[0];
          replyText = `The *${matched.name}* is Rs ${matched.price.toLocaleString()} with ${matched.stock} units in stock. Reply 'BUY' to book your order, or let me know if you need specs!`;
        } else if (cleanMsg.includes('buy') || cleanMsg.includes('order') || cleanMsg.includes('confirm')) {
          const p = products[0];
          const newOrder: Order = {
            id: nextOrderId++,
            created_at: new Date().toISOString(),
            agent_id: 'agent_aura_chat',
            customer: customerName,
            product: p.name,
            quantity: 1,
            amount: p.price,
            status: 'placed',
            phone: fromPhone,
            note: 'Placed via Live Meta WhatsApp Cloud API',
          };
          orders.unshift(newOrder);
          p.stock = Math.max(0, p.stock - 1);
          replyText = `🎉 *Order Confirmed!* Order #${newOrder.id} for 1x ${p.name} (Rs ${p.price.toLocaleString()}) has been booked. Delivery will arrive via BlueDart Express to your registered address!`;
        } else {
          replyText = `Namaste ${customerName}! Welcome to Arjav Jain Electronics Store. I am Aura, your WhatsApp AI concierge. I can check stock, quote prices, arrange custom discount approvals, or book orders. How may I assist you today?`;
        }
      }

      await sendWhatsAppMessage(fromPhone, replyText);

      // Log agent reply
      conversations.push({
        id: nextConvId++,
        created_at: new Date().toISOString(),
        agent_id: 'agent_aura_chat',
        customer: customerName,
        sender: 'agent',
        message: replyText,
      });
    }
  } catch (err: any) {
    console.error('Error handling WhatsApp webhook:', err);
  }
});

// 15. Send Outbound WhatsApp Message Endpoint
app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
  const { to, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ ok: false, error: 'Recipient phone number and text are required' });
  }

  const result = await sendWhatsAppMessage(to, text);
  res.json({ ok: true, result });
});

// 16. WhatsApp Cloud API configuration details for Meta Developer Console
app.get('/api/whatsapp/config', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const callbackUrl = `${protocol}://${host}/api/webhook/whatsapp`;

  res.json({
    connected: true,
    phoneNumber: WHATSAPP_PHONE_NUMBER,
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
    wabaAccountId: WHATSAPP_ACCOUNT_ID,
    verifyToken: WHATSAPP_VERIFY_TOKEN,
    webhookCallbackUrl: callbackUrl,
    tokenMasked: `${WHATSAPP_TOKEN.slice(0, 15)}...${WHATSAPP_TOKEN.slice(-10)}`,
  });
});

// 17. AI Agent Server-Side Engine using @google/genai
app.post('/api/agent/interact', async (req: Request, res: Response) => {
  const { agentType, customerMessage, customerName, pastOrdersCount } = req.body;
  const custName = customerName || 'Valued Customer';
  const orderCount = Number(pastOrdersCount) || 1;

  // Check discount policy or intent in message
  const discountMatch = customerMessage.match(/(\d+)%\s*(off|discount)/i) || customerMessage.match(/discount.*?(\d+)%/i);
  const requestedDiscount = discountMatch ? parseInt(discountMatch[1], 10) : 0;

  // Check if customer asked for discount > policy
  if (requestedDiscount > 0) {
    const policy = evaluateDiscountPolicy({
      orderTotal: 5000,
      requestedDiscountPct: requestedDiscount,
      customerOrderCount: orderCount,
    });

    if (policy.requiresApproval) {
      // Trigger approval needed webhook
      const matchedProduct = products.find((p) =>
        customerMessage.toLowerCase().includes(p.name.toLowerCase().split(' ')[0].toLowerCase())
      ) || products[0];

      const orderCalc = calculateOrderSummary(matchedProduct.price, 1, requestedDiscount);

      const approvalId = nextApprovalId++;
      const newApproval: Approval = {
        id: approvalId,
        created_at: new Date().toISOString(),
        agent_id: agentType === 'voice' ? 'agent_maya_voice' : 'agent_aura_chat',
        type: 'discount_request',
        summary: `${custName} requested ${requestedDiscount}% discount on ${matchedProduct.name}`,
        context: {
          customer: custName,
          product: matchedProduct.name,
          retailPrice: matchedProduct.price,
          discountPct: requestedDiscount,
          proposedAmount: orderCalc.finalAmount,
          pastOrders: orderCount,
          grossMarginRemaining: `${orderCalc.marginPct}%`,
          channel: agentType === 'voice' ? 'Inbound Voice Call' : 'WhatsApp Chat',
        },
        resume_url: `http://localhost:3000/api/internal/mock-resume/${approvalId}`,
        status: 'pending',
      };
      approvals.unshift(newApproval);

      logWebhook('inbound', 'approval_needed', agentType === 'voice' ? 'agent_maya_voice' : 'agent_aura_chat', {
        approval_id: approvalId,
        customer: custName,
        requestedDiscount,
        product: matchedProduct.name,
        proposedAmount: orderCalc.finalAmount,
      });

      return res.json({
        ok: true,
        action: 'APPROVAL_PAUSED',
        approvalId,
        reply: `I see you are requesting a ${requestedDiscount}% discount on the ${matchedProduct.name}. Since this exceeds standard checkout discretion, I have sent a priority 1-click approval request to our store manager Arjav. Please wait right here while Arjav reviews it on his dashboard!`,
        approvalDetails: newApproval,
      });
    }
  }

  // If GEMINI_API_KEY is available, invoke gemini-3.8-flash server-side
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const catalogSummary = products
        .map((p) => `- ${p.name}: Rs ${p.price.toLocaleString()} (Stock: ${p.stock})`)
        .join('\n');

      const systemPrompt = `You are ${
        agentType === 'voice' ? 'Maya, an ultra-crisp voice sales representative' : 'Aura, an AI WhatsApp sales & commerce assistant'
      } for Arjav Jain's premium electronics store.
Store Catalog:
${catalogSummary}

Customer Name: ${custName} (has placed ${orderCount} past orders with us).

Guidelines:
1. Speak warmly, professionally, and concisely (under 40 words per reply, ideal for voice & messaging).
2. Quotes prices in Indian Rupees (Rs).
3. If customer wants to place an order, confirm their product, quantity, and address.
4. If customer asks for stock, accurately report the stock from the catalog above.
5. If low stock (< 5), encourage prompt booking.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: customerMessage,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const text = response.text || '';
      return res.json({
        ok: true,
        action: 'REPLY',
        reply: text,
      });
    } catch (err) {
      console.warn('Gemini API call returned error, falling back to autonomous agent engine:', err);
    }
  }

  // High-fidelity autonomous simulation fallback
  let reply = '';
  const cleanMsg = customerMessage.toLowerCase();

  if (cleanMsg.includes('price') || cleanMsg.includes('cost') || cleanMsg.includes('catalog') || cleanMsg.includes('product')) {
    const item = products.find((p) => cleanMsg.includes(p.name.toLowerCase().split(' ')[0])) || products[0];
    reply = `The ${item.name} is priced at Rs ${item.price.toLocaleString()}. We currently have ${item.stock} units ready for same-day dispatch. Would you like to confirm an order?`;
  } else if (cleanMsg.includes('buy') || cleanMsg.includes('order') || cleanMsg.includes('yes') || cleanMsg.includes('confirm')) {
    const p = products[0];
    const newOrder: Order = {
      id: nextOrderId++,
      created_at: new Date().toISOString(),
      agent_id: agentType === 'voice' ? 'agent_maya_voice' : 'agent_aura_chat',
      customer: custName,
      product: p.name,
      quantity: 1,
      amount: p.price,
      status: 'placed',
      note: 'Placed via Live Agent Simulation',
    };
    orders.unshift(newOrder);
    p.stock = Math.max(0, p.stock - 1);

    logWebhook('inbound', 'order_placed', agentType === 'voice' ? 'agent_maya_voice' : 'agent_aura_chat', {
      order_id: newOrder.id,
      customer: custName,
      product: p.name,
      amount: p.price,
    });

    reply = `Congratulations ${custName}! Your order #${newOrder.id} for 1x ${p.name} (Rs ${p.price.toLocaleString()}) has been placed and booked in the warehouse! Tracking will be SMSed to you.`;
  } else if (cleanMsg.includes('stock') || cleanMsg.includes('available')) {
    const lowStockItems = products.filter((p) => p.stock < 5).map((p) => p.name).join(', ');
    reply = `We have active stock across all lines! Note that ${lowStockItems} are selling fast with under 5 units left. Which item are you looking for?`;
  } else {
    reply = `Hi ${custName}! I'm ${agentType === 'voice' ? 'Maya' : 'Aura'}, your AI sales specialist. I can help you check inventory, place orders, or arrange custom bulk quotes. How can I help today?`;
  }

  res.json({
    ok: true,
    action: 'REPLY',
    reply,
  });
});

// ----------------- Vite Integration & Server Startup -----------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Arjav AI Multi-Agent Sales Server running on port ${PORT}`);
  });
}

startServer();
