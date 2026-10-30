/**
 * Pure business and agent evaluation logic
 * Decoupled from UI and framework code for deterministic testing.
 */

export interface DiscountPolicyInput {
  orderTotal: number;
  requestedDiscountPct: number;
  customerOrderCount: number;
}

export interface DiscountPolicyResult {
  requiresApproval: boolean;
  autoApproved: boolean;
  maxAgentDiscountPct: number;
  reason: string;
}

export interface OrderCalculationResult {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  finalAmount: number;
  marginPct: number;
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  shouldFlag: boolean;
  flagReason?: string;
}

export interface StockStatusResult {
  status: 'critical' | 'low' | 'healthy';
  needsRestock: boolean;
  recommendedOrderQty: number;
}

/**
 * Evaluates whether an agent can approve a discount or if human approval is required.
 * - Standard policy: agents can approve up to 5% unconditionally.
 * - Loyal customers (>= 3 past orders): agents can approve up to 10%.
 * - Above threshold: triggers Human-in-the-Loop approval needed.
 */
export function evaluateDiscountPolicy(input: DiscountPolicyInput): DiscountPolicyResult {
  const { requestedDiscountPct, customerOrderCount } = input;

  if (requestedDiscountPct <= 0) {
    return {
      requiresApproval: false,
      autoApproved: true,
      maxAgentDiscountPct: 0,
      reason: 'No discount requested',
    };
  }

  const isVip = customerOrderCount >= 3;
  const maxAgentDiscount = isVip ? 10 : 5;

  if (requestedDiscountPct <= maxAgentDiscount) {
    return {
      requiresApproval: false,
      autoApproved: true,
      maxAgentDiscountPct: maxAgentDiscount,
      reason: isVip
        ? `Auto-approved up to ${maxAgentDiscount}% for loyal VIP customer (${customerOrderCount} past orders)`
        : `Auto-approved standard agent courtesy discount (${requestedDiscountPct}%)`,
    };
  }

  return {
    requiresApproval: true,
    autoApproved: false,
    maxAgentDiscountPct: maxAgentDiscount,
    reason: `Requested ${requestedDiscountPct}% exceeds agent authority limit of ${maxAgentDiscount}%. Store owner approval required.`,
  };
}

/**
 * Calculates order financial summary with discount and margin estimation.
 * Assumes a baseline 40% gross product margin at full retail.
 */
export function calculateOrderSummary(
  unitPrice: number,
  quantity: number,
  discountPct: number = 0
): OrderCalculationResult {
  const safeQty = Math.max(1, Math.floor(quantity));
  const safePrice = Math.max(0, unitPrice);
  const safeDiscount = Math.min(100, Math.max(0, discountPct));

  const subtotal = safePrice * safeQty;
  const discountAmount = Math.round((subtotal * safeDiscount) / 100);
  const finalAmount = Math.max(0, subtotal - discountAmount);

  // Baseline cost of goods sold is 60% of original unit price
  const cogs = subtotal * 0.6;
  const grossProfit = finalAmount - cogs;
  const marginPct = finalAmount > 0 ? Math.round((grossProfit / finalAmount) * 100) : 0;

  return {
    unitPrice: safePrice,
    quantity: safeQty,
    subtotal,
    discountPct: safeDiscount,
    discountAmount,
    finalAmount,
    marginPct,
  };
}

/**
 * Analyzes inbound customer messages to detect sentiment and auto-flag escalations.
 */
export function detectCustomerSentiment(message: string): SentimentAnalysisResult {
  const clean = message.toLowerCase().trim();

  const urgentKeywords = ['urgent', 'emergency', 'asap', 'broken', 'damaged', 'fraud', 'scam', 'lawyer', 'police'];
  const negativeKeywords = ['angry', 'terrible', 'worst', 'horrible', 'cancel', 'refund', 'scammed', 'cheated', 'manager', 'owner', 'supervisor'];
  const positiveKeywords = ['thank', 'great', 'awesome', 'excellent', 'love', 'perfect', 'appreciate', 'good'];

  if (urgentKeywords.some((w) => clean.includes(w))) {
    return {
      sentiment: 'urgent',
      shouldFlag: true,
      flagReason: 'Urgent escalation keywords detected',
    };
  }

  if (negativeKeywords.some((w) => clean.includes(w))) {
    return {
      sentiment: 'negative',
      shouldFlag: true,
      flagReason: 'Customer distress or supervisor request detected',
    };
  }

  if (positiveKeywords.some((w) => clean.includes(w))) {
    return {
      sentiment: 'positive',
      shouldFlag: false,
    };
  }

  return {
    sentiment: 'neutral',
    shouldFlag: false,
  };
}

/**
 * Checks stock status according to business threshold (< 5 units is low stock).
 */
export function checkStockStatus(stock: number): StockStatusResult {
  if (stock <= 1) {
    return {
      status: 'critical',
      needsRestock: true,
      recommendedOrderQty: 25,
    };
  }

  if (stock < 5) {
    return {
      status: 'low',
      needsRestock: true,
      recommendedOrderQty: 15,
    };
  }

  return {
    status: 'healthy',
    needsRestock: false,
    recommendedOrderQty: 0,
  };
}
