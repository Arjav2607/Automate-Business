import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Sparkles,
  ShoppingBag,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Package,
  ArrowRight,
  Info,
  User,
  Percent,
  Play,
  Pause,
  MessageSquare,
} from 'lucide-react';
import { Product, Approval, Order } from '../types';

interface CustomerWhatsAppPortalProps {
  products: Product[];
  pendingApprovals: Approval[];
  decidedApprovals: Approval[];
  onTriggerWebhook: (payload: any) => Promise<any>;
  onSwitchToAdmin: () => void;
  compactMode?: boolean;
}

export const CustomerWhatsAppPortal: React.FC<CustomerWhatsAppPortalProps> = ({
  products,
  pendingApprovals,
  decidedApprovals,
  onTriggerWebhook,
  onSwitchToAdmin,
  compactMode = false,
}) => {
  // Selected Customer Persona
  const [customerProfile, setCustomerProfile] = useState<{
    name: string;
    phone: string;
    pastOrders: number;
    vip: boolean;
  }>({
    name: 'Priya Patel',
    phone: '+91 98765 43210',
    pastOrders: 3,
    vip: true,
  });

  // Chat message state
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      sender: 'customer' | 'agent' | 'system';
      text: string;
      time: string;
      isAudio?: boolean;
      audioDuration?: number;
      orderData?: any;
    }>
  >([
    {
      id: 'm1',
      sender: 'agent',
      text: 'Namaste Priya! 🙏 Welcome back to Arjav Jain Electronics on WhatsApp. I am Aura, your VIP AI Concierge. How can I assist you with our catalog today?',
      time: '10:14 AM',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingDiscountRequest, setPendingDiscountRequest] = useState<{
    product: Product;
    discountPct: number;
    proposedPrice: number;
    approvalId?: number;
    status: 'waiting' | 'approved' | 'rejected';
  } | null>(null);

  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Check if Arjav approved or rejected the pending discount request
  useEffect(() => {
    if (!pendingDiscountRequest || pendingDiscountRequest.status !== 'waiting') return;

    // Check in decidedApprovals
    const foundDecided = decidedApprovals.find(
      (a) =>
        a.context?.customer === customerProfile.name &&
        a.context?.product === pendingDiscountRequest.product.name
    );

    if (foundDecided) {
      if (foundDecided.status === 'approved') {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setPendingDiscountRequest((prev) => (prev ? { ...prev, status: 'approved' } : null));

        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'agent',
            text: `🎉 EXCELLENT NEWS ${customerProfile.name}! Store Owner Arjav Jain has personally APPROVED your ${pendingDiscountRequest.discountPct}% discount! Your final price for the ${pendingDiscountRequest.product.name} is now Rs ${pendingDiscountRequest.proposedPrice.toLocaleString()} (Saved Rs ${(pendingDiscountRequest.product.price - pendingDiscountRequest.proposedPrice).toLocaleString()}).`,
            time: timeStr,
            orderData: {
              readyToConfirm: true,
              product: pendingDiscountRequest.product.name,
              amount: pendingDiscountRequest.proposedPrice,
              discount: pendingDiscountRequest.discountPct,
            },
          },
        ]);
      } else if (foundDecided.status === 'rejected') {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setPendingDiscountRequest((prev) => (prev ? { ...prev, status: 'rejected' } : null));

        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'agent',
            text: `Hi ${customerProfile.name}, store owner Arjav was unable to approve ${pendingDiscountRequest.discountPct}% due to tight wholesale import margins. However, as our valued customer, I can still offer you our standard 5% discount (Rs ${Math.round(pendingDiscountRequest.product.price * 0.95).toLocaleString()}). Would that work for you?`,
            time: timeStr,
          },
        ]);
      }
    }
  }, [decidedApprovals, pendingDiscountRequest, customerProfile]);

  // Send Customer message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `usr-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'customer',
        text,
        time: timeStr,
      },
    ]);
    setInputText('');
    setIsTyping(true);

    // Log message to backend via webhook
    onTriggerWebhook({
      event: 'message',
      agent_id: 'agent_aura_chat',
      customer: customerProfile.name,
      sender: 'customer',
      text,
      phone: customerProfile.phone,
    });

    try {
      const res = await fetch('/api/agent/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'chat',
          customerMessage: text,
          customerName: customerProfile.name,
          pastOrdersCount: customerProfile.pastOrders,
        }),
      });
      const data = await res.json();
      setIsTyping(false);

      if (data.action === 'APPROVAL_PAUSED') {
        const matchProd = products.find((p) =>
          text.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
        ) || products[1];

        const discountMatch = text.match(/(\d+)%/);
        const discountVal = discountMatch ? parseInt(discountMatch[1], 10) : 15;
        const proposed = Math.round(matchProd.price * (1 - discountVal / 100));

        setPendingDiscountRequest({
          product: matchProd,
          discountPct: discountVal,
          proposedPrice: proposed,
          status: 'waiting',
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `agt-${Date.now()}`,
            sender: 'agent',
            text: `I've checked our system! You're requesting a ${discountVal}% discount on ${matchProd.name}. Because this is above my standard checkout threshold, I have submitted a priority 1-click approval request directly to our store owner, Arjav Jain. ⏳ Please wait here a moment while Arjav reviews it on his Admin Console!`,
            time: timeStr,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `agt-${Date.now()}`,
          sender: 'agent',
          text: data.reply || 'Thank you for reaching out! We are ready to ship your order.',
          time: timeStr,
        },
      ]);
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `agt-${Date.now()}`,
          sender: 'agent',
          text: 'Our catalog products are in stock with free express shipping across India. Which model would you like to order?',
          time: timeStr,
        },
      ]);
    }
  };

  // Confirm and place order directly from WhatsApp
  const handleConfirmOrder = async (productName: string, amount: number) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setIsTyping(true);

    const payload = {
      event: 'order_placed',
      agent_id: 'agent_aura_chat',
      customer: customerProfile.name,
      product: productName,
      quantity: 1,
      amount,
      phone: customerProfile.phone,
      location: 'Delivery via WhatsApp Booking',
      status: 'placed',
    };

    const res = await onTriggerWebhook(payload);
    setIsTyping(false);
    setPendingDiscountRequest(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `conf-${Date.now()}`,
        sender: 'agent',
        text: `✅ ORDER CONFIRMED! Order #${res?.orderId || '105'} for 1x ${productName} (Rs ${amount.toLocaleString()}) has been booked! Warehouse dispatch is scheduled for today via BlueDart Express. Tracking updates will arrive on this WhatsApp thread. Thank you for shopping with Arjav Jain Electronics! 📦🚀`,
        time: timeStr,
      },
    ]);
  };

  const playVoiceNote = (id: string, text: string) => {
    if (activeAudioPlaying === id) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setActiveAudioPlaying(null);
    } else {
      setActiveAudioPlaying(id);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.05;
        u.onend = () => setActiveAudioPlaying(null);
        u.onerror = () => setActiveAudioPlaying(null);
        window.speechSynthesis.speak(u);
      } else {
        setTimeout(() => setActiveAudioPlaying(null), 3000);
      }
    }
  };

  const [showMetaGateway, setShowMetaGateway] = useState(false);
  const [testRecipientPhone, setTestRecipientPhone] = useState('+1 (555) 214-5018');
  const [testMessageText, setTestMessageText] = useState('Hello from Arjav AI Store! Your order tracking is ready.');
  const [testSendResult, setTestSendResult] = useState<string | null>(null);
  const [isSendingReal, setIsSendingReal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendRealWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipientPhone || !testMessageText) return;
    try {
      setIsSendingReal(true);
      setTestSendResult(null);
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testRecipientPhone, text: testMessageText }),
      });
      const data = await res.json();
      setIsSendingReal(false);
      if (data.ok && data.result?.messages?.[0]?.id) {
        setTestSendResult(`Success! Message ID: ${data.result.messages[0].id}`);
      } else if (data.result?.error?.message) {
        setTestSendResult(`Meta Response: ${data.result.error.message}`);
      } else {
        setTestSendResult(`Dispatched! ${JSON.stringify(data.result)}`);
      }
    } catch (err: any) {
      setIsSendingReal(false);
      setTestSendResult(`Error: ${err.message}`);
    }
  };

  return (
    <div className={`space-y-4 ${compactMode ? '' : 'max-w-4xl mx-auto'}`}>
      {/* Explanation Banner: Telling the user how this platform serves BOTH Users & Owner */}
      {!compactMode && (
        <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Buyer &amp; Customer WhatsApp Portal Active
                </span>
                <span className="text-xs text-slate-400">Yes! The platform serves BOTH Users and Owner</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                How Both Customers (Buyers) and Arjav (Owner/Admin) Use This System:
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                <strong>Customers (Users):</strong> Interact right here on WhatsApp—they browse products, negotiate special discounts, place orders, and track shipments.<br />
                <strong>Owner / Seller (Arjav Jain):</strong> Uses the Admin Console to view real-time orders, approve/reject customer discount negotiations, monitor stock, and review customer sentiment.
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setShowMetaGateway(!showMetaGateway)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-800/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-500/40 transition cursor-pointer flex items-center"
              >
                <span>{showMetaGateway ? 'Hide Meta Config' : 'Meta Cloud API Live Gateway'}</span>
              </button>
              <button
                onClick={onSwitchToAdmin}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer flex items-center"
              >
                <span>Owner Console</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>

          {/* Meta WhatsApp Gateway Collapsible Card */}
          {showMetaGateway && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse mr-2" />
                  Meta WhatsApp Cloud API Live Configuration
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Graph API v21.0 Connected</span>
              </div>

              {/* Credentials & Webhook Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Registered WhatsApp Number</span>
                  <div className="font-mono font-bold text-white text-sm">+1 (555) 214-5018</div>
                  <div className="text-[10px] text-slate-400">
                    Phone Number ID: <strong className="text-slate-300 font-mono">1400940463102580</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    WABA Account ID: <strong className="text-slate-300 font-mono">1840482170413388</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Meta Webhook Callback URL</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/whatsapp`,
                          'webhook'
                        )
                      }
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      {copiedField === 'webhook' ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>
                  <div className="font-mono text-emerald-300 truncate text-[11px]">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/whatsapp
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      Verify Token:{' '}
                      <strong className="text-white font-mono">arjav_agent_verify_token_2026</strong>
                    </span>
                    <button
                      onClick={() => copyToClipboard('arjav_agent_verify_token_2026', 'token')}
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      {copiedField === 'token' ? 'Copied!' : 'Copy Token'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Outbound WhatsApp Form */}
              <form onSubmit={handleSendRealWhatsApp} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">Send Real WhatsApp Message via Meta API</span>
                  {testSendResult && (
                    <span className="text-[10px] font-mono text-emerald-400 truncate max-w-xs">{testSendResult}</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={testRecipientPhone}
                    onChange={(e) => setTestRecipientPhone(e.target.value)}
                    placeholder="Recipient phone (e.g. +1... or +91...)"
                    className="sm:w-56 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono outline-none"
                  />
                  <input
                    type="text"
                    value={testMessageText}
                    onChange={(e) => setTestMessageText(e.target.value)}
                    placeholder="Message to send"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReal}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    {isSendingReal ? 'Sending...' : 'Send WhatsApp'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Customer Persona Switcher Bar */}
      <div className="customer-persona-bar flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs gap-2">
        <div className="flex items-center space-x-2 text-slate-300">
          <User className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">Simulating Customer Profile:</span>
        </div>
        <div className="flex items-center space-x-2">
          {[
            { name: 'Priya Patel', phone: '+91 98765 43210', pastOrders: 3, vip: true },
            { name: 'Rahul Sharma', phone: '+91 98201 12345', pastOrders: 1, vip: false },
            { name: 'Karan Kapoor', phone: '+91 99112 33445', pastOrders: 0, vip: false },
          ].map((profile) => (
            <button
              key={profile.name}
              onClick={() => {
                setCustomerProfile(profile);
                setMessages([
                  {
                    id: `m-init-${Date.now()}`,
                    sender: 'agent',
                    text: `Hello ${profile.name}! Welcome to Arjav Electronics on WhatsApp. How can I help you today?`,
                    time: 'Just now',
                  },
                ]);
              }}
              className={`persona-pill px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                customerProfile.name === profile.name
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {profile.name} {profile.vip && '⭐'}
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp Window Container */}
      <div className="whatsapp-window rounded-2xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-950 flex flex-col h-[580px]">
        {/* WhatsApp App Header */}
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-700 border-2 border-emerald-400/50 flex items-center justify-center font-bold text-white shadow">
                AE
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#075E54]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-white">Arjav Electronics Store</span>
                <span className="p-0.5 rounded-full bg-emerald-400 text-slate-900" title="Verified Business Account">
                  <ShieldCheck className="w-3 h-3" />
                </span>
              </div>
              <div className="text-[11px] text-emerald-200 flex items-center">
                <span>Aura (AI Concierge) • Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-emerald-100">
            <button className="p-1.5 rounded-full hover:bg-emerald-800/40 transition cursor-pointer" title="Voice Call">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-full hover:bg-emerald-800/40 transition cursor-pointer" title="Video">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-full hover:bg-emerald-800/40 transition cursor-pointer">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Chat Body */}
        <div className="whatsapp-chat-body flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] bg-opacity-95 text-xs">
          {/* Encryption Notice */}
          <div className="p-2 text-center">
            <span className="whatsapp-encryption-note inline-block px-3 py-1 rounded-lg bg-[#182229] text-[#8696a0] text-[10px] shadow-sm">
              🔒 Messages are end-to-end connected to Arjav AI Commerce Agent via WhatsApp Cloud API
            </span>
          </div>

          {/* Messages Feed */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'customer';
            const isPlaying = activeAudioPlaying === msg.id;

            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] sm:max-w-md p-3 rounded-2xl relative shadow whatsapp-msg-bubble ${
                    isUser
                      ? 'bg-[#005c4b] text-white rounded-tr-none whatsapp-user-bubble'
                      : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-800/60 whatsapp-agent-bubble'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Ready to confirm order card */}
                  {msg.orderData?.readyToConfirm && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{msg.orderData.product}</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          Rs {msg.orderData.amount.toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleConfirmOrder(msg.orderData.product, msg.orderData.amount)}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer flex items-center justify-center"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                        <span>Confirm & Place Order Now</span>
                      </button>
                    </div>
                  )}

                  {/* Audio note play trigger */}
                  {!isUser && (
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/50">
                      <button
                        onClick={() => playVoiceNote(msg.id, msg.text)}
                        className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{isPlaying ? 'Pause Voice Note' : 'Listen Voice Note'}</span>
                      </button>
                      <span className="text-right text-[#8696a0] flex items-center space-x-1">
                        <span>{msg.time}</span>
                        {isUser && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] ml-1" />}
                      </span>
                    </div>
                  )}

                  {isUser && (
                    <div className="text-[10px] text-right text-emerald-200/70 mt-1 flex items-center justify-end space-x-1">
                      <span>{msg.time}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs italic p-2 bg-[#202c33] rounded-xl w-36">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Aura is typing...</span>
            </div>
          )}

          {/* Live Pending Approval Status Banner */}
          {pendingDiscountRequest?.status === 'waiting' && (
            <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs space-y-2 animate-pulse">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-amber-400" />
                  Approval Request Sent to Arjav Jain
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                  PENDING
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Customer requested <strong className="text-white">{pendingDiscountRequest.discountPct}% OFF</strong> on{' '}
                <strong className="text-white">{pendingDiscountRequest.product.name}</strong>. The agent is waiting for Arjav to click Approve in the Admin Console.
              </p>
              <button
                onClick={onSwitchToAdmin}
                className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                Switch to Admin Console to Approve this request now &rarr;
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Catalog Quick Suggestion Chips */}
        <div className="whatsapp-quick-chips px-3 py-2 bg-[#111b21] border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Quick Tap:</span>
          <button
            onClick={() => handleSendMessage('What is the current stock & price for Wireless Pro Headphones?')}
            className="whatsapp-chip px-2.5 py-1 rounded-full bg-[#202c33] text-slate-300 hover:text-white hover:bg-[#2a3942] text-[11px] whitespace-nowrap transition cursor-pointer"
          >
            Check Headphones Stock
          </button>
          <button
            onClick={() =>
              handleSendMessage(
                `Can I get a 15% discount on the Ultra Mechanical Keyboard? I've ordered ${customerProfile.pastOrders} times before.`
              )
            }
            className="whatsapp-chip px-2.5 py-1 rounded-full bg-[#202c33] text-amber-300 hover:bg-[#2a3942] border border-amber-500/30 text-[11px] whitespace-nowrap transition cursor-pointer"
          >
            Ask for 15% VIP Discount
          </button>
          <button
            onClick={() =>
              handleSendMessage('Where is my order #101? Please share tracking details.')
            }
            className="whatsapp-chip px-2.5 py-1 rounded-full bg-[#202c33] text-indigo-300 hover:bg-[#2a3942] text-[11px] whitespace-nowrap transition cursor-pointer"
          >
            Track Order #101
          </button>
        </div>

        {/* WhatsApp Message Input Bar */}
        <div className="whatsapp-input-bar bg-[#202c33] p-3 flex items-center space-x-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message on WhatsApp..."
            className="flex-1 px-4 py-2 rounded-xl bg-[#2a3942] text-white text-xs placeholder:text-[#8696a0] focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#029071] text-white transition cursor-pointer shadow"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
