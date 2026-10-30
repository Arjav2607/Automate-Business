import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  Sparkles,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  PackageCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
} from 'lucide-react';
import { Product } from '../types';

interface MissingAgentsHubProps {
  products: Product[];
  onTriggerApprovalNeeded: (payload: any) => Promise<any>;
  onTriggerOrderPlaced: (payload: any) => Promise<any>;
  onTriggerMessageLogged: (payload: any) => Promise<any>;
  onNavigateToTab: (tab: string) => void;
  pendingApprovalsCount: number;
}

export const MissingAgentsHub: React.FC<MissingAgentsHubProps> = ({
  products,
  onTriggerApprovalNeeded,
  onTriggerOrderPlaced,
  onTriggerMessageLogged,
  onNavigateToTab,
  pendingApprovalsCount,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<'voice' | 'chat' | 'negotiation' | 'support' | 'inventory'>('negotiation');

  // Voice Agent State
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceMessages, setVoiceMessages] = useState<Array<{ sender: 'agent' | 'user'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: 'Namaste! I am Maya from Arjav Jain Electronics. How can I assist you with our audio, displays, or PC peripherals today?',
      time: '10:00 AM',
    },
  ]);
  const [voiceInput, setVoiceInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);

  // Chat Agent State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'agent' | 'user'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: 'Hello! Welcome to our WhatsApp Storefront. Looking for our Wireless Pro Headphones or 4K UltraWide Monitor?',
      time: '10:02 AM',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Negotiation & Human-in-the-Loop Simulation State
  const [negotiationStep, setNegotiationStep] = useState<
    'idle' | 'requesting' | 'paused_waiting_arjav' | 'approved_resumed' | 'rejected_resumed'
  >('idle');
  const [negotiationDiscount, setNegotiationDiscount] = useState<number>(20);
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[1] || products[0]);
  const [customerName, setCustomerName] = useState('Karan Kapoor');
  const [pausedApprovalId, setPausedApprovalId] = useState<number | null>(null);

  // Support Agent State
  const [supportInput, setSupportInput] = useState('');
  const [supportSentiment, setSupportSentiment] = useState<{ sentiment: string; flagged: boolean } | null>(null);
  const [supportMessages, setSupportMessages] = useState<
    Array<{ sender: 'agent' | 'user'; text: string; flagged?: boolean; sentiment?: string }>
  >([
    {
      sender: 'agent',
      text: 'Hi! I am Kavya from Customer Support. Enter your Order ID (e.g. #101 or #102) for real-time tracking or return assistance.',
    },
  ]);

  // Inventory Guardian State
  const [guardianLogs, setGuardianLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'alert' | 'success' }>>([
    {
      time: 'Just now',
      text: 'Inventory Guardian Daemon started: Monitoring 6 catalog SKUs.',
      type: 'info',
    },
    {
      time: '1 min ago',
      text: 'ALERT: Ultra Mechanical Keyboard stock dropped to 4 units (< 5 threshold).',
      type: 'alert',
    },
    {
      time: '2 mins ago',
      text: 'ALERT: USB-C 100W Fast Charger stock is 3 units (< 5 threshold).',
      type: 'alert',
    },
  ]);

  // Speech Synthesis helper
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Browser Speech Recognition for Voice Agent
  const startMicRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. You can type your voice query instead!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningMic(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceInput(transcript);
        handleSendVoice(transcript);
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognition.start();
    } catch (e) {
      setIsListeningMic(false);
    }
  };

  // Handle Voice Agent Message Send
  const handleSendVoice = async (queryText?: string) => {
    const message = (queryText || voiceInput).trim();
    if (!message) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setVoiceMessages((prev) => [...prev, { sender: 'user', text: message, time: timeStr }]);
    setVoiceInput('');

    // Log message to backend webhook
    onTriggerMessageLogged({
      agent_id: 'agent_maya_voice',
      customer: 'Rahul Sharma',
      sender: 'customer',
      text: message,
      audio_url: 'https://actions.google.com/sounds/v1/speech/customer_voice.ogg',
      duration: Math.max(3, Math.round(message.split(' ').length * 0.4)),
    });

    try {
      const res = await fetch('/api/agent/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'voice',
          customerMessage: message,
          customerName: 'Rahul Sharma',
          pastOrdersCount: 2,
        }),
      });
      const data = await res.json();
      const reply = data.reply || "I've noted that! Let me check with Arjav's store inventory.";

      setVoiceMessages((prev) => [...prev, { sender: 'agent', text: reply, time: timeStr }]);
      speakText(reply);

      // Log agent reply to webhook
      onTriggerMessageLogged({
        agent_id: 'agent_maya_voice',
        customer: 'Rahul Sharma',
        sender: 'agent',
        text: reply,
        audio_url: 'https://actions.google.com/sounds/v1/speech/agent_maya.ogg',
        duration: Math.max(4, Math.round(reply.split(' ').length * 0.4)),
      });
    } catch (err) {
      const fallback = "We have that ready in our warehouse! Would you like me to book it for you?";
      setVoiceMessages((prev) => [...prev, { sender: 'agent', text: fallback, time: timeStr }]);
      speakText(fallback);
    }
  };

  // Handle Chat Agent Message Send
  const handleSendChat = async (presetText?: string) => {
    const message = (presetText || chatInput).trim();
    if (!message) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { sender: 'user', text: message, time: timeStr }]);
    setChatInput('');
    setIsAgentTyping(true);

    // Webhook log
    onTriggerMessageLogged({
      agent_id: 'agent_aura_chat',
      customer: 'Priya Patel',
      sender: 'customer',
      text: message,
    });

    try {
      const res = await fetch('/api/agent/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'chat',
          customerMessage: message,
          customerName: 'Priya Patel',
          pastOrdersCount: 3,
        }),
      });
      const data = await res.json();
      setIsAgentTyping(false);

      if (data.action === 'APPROVAL_PAUSED') {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: `⏸️ [PAUSED FOR ARJAV]: ${data.reply}`,
            time: timeStr,
          },
        ]);
        return;
      }

      setChatMessages((prev) => [...prev, { sender: 'agent', text: data.reply, time: timeStr }]);
      onTriggerMessageLogged({
        agent_id: 'agent_aura_chat',
        customer: 'Priya Patel',
        sender: 'agent',
        text: data.reply,
      });
    } catch (err) {
      setIsAgentTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: 'Our catalog items are fully in stock and ready to ship. Can I help you complete your order?',
          time: timeStr,
        },
      ]);
    }
  };

  // Handle Negotiation Simulation Start
  const handleStartNegotiation = async () => {
    setNegotiationStep('requesting');
    const retail = selectedProduct.price;
    const discountAmt = Math.round((retail * negotiationDiscount) / 100);
    const proposed = retail - discountAmt;

    // Trigger approval_needed to backend
    const approvalPayload = {
      event: 'approval_needed',
      agent_id: 'agent_aura_chat',
      type: 'discount_request',
      summary: `${customerName} requested ${negotiationDiscount}% discount on ${selectedProduct.name}`,
      context: {
        customer: customerName,
        product: selectedProduct.name,
        quantity: 1,
        retailPrice: retail,
        discountPct: negotiationDiscount,
        proposedAmount: proposed,
        pastOrders: 2,
        grossMarginRemaining: `${Math.round(((proposed - retail * 0.6) / proposed) * 100)}%`,
        channel: 'WhatsApp Sales Agent',
        note: `Customer negotiated via WhatsApp; requested ${negotiationDiscount}% exceeding standard 10% limit.`,
      },
      resume_url: `http://localhost:3000/api/internal/mock-resume/${Date.now()}`,
    };

    const res = await onTriggerApprovalNeeded(approvalPayload);
    setPausedApprovalId(res?.approvalId || 2);
    setNegotiationStep('paused_waiting_arjav');
  };

  // Handle Support Agent Message Send
  const handleSendSupport = async () => {
    const text = supportInput.trim();
    if (!text) return;

    // Check sentiment on client or server
    const isAngry = /broken|worst|damaged|scam|fraud|manager|urgent|horrible/i.test(text);
    const isTrack = /order|#101|#102|#103|#104|status|track/i.test(text);

    setSupportMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text,
        flagged: isAngry,
        sentiment: isAngry ? 'Urgent / Distressed' : 'Neutral',
      },
    ]);
    setSupportSentiment({ sentiment: isAngry ? 'negative / urgent' : 'neutral', flagged: isAngry });
    setSupportInput('');

    // Log to backend webhook
    onTriggerMessageLogged({
      agent_id: 'agent_kavya_support',
      customer: 'Amitabh Sen',
      sender: 'customer',
      text,
      flagged: isAngry ? 1 : 0,
    });

    let reply = '';
    if (isTrack) {
      reply = 'Found your order #101 (Wireless Pro Headphones)! Status: Dispatched with BlueDart Express (AWB: BD9921094). Expected delivery by 4:00 PM today.';
    } else if (isAngry) {
      reply = 'I deeply apologize for this frustration. I have marked this conversation as URGENT [Flagged in Arjav’s Dashboard]. Our customer priority desk is reviewing your ticket right now.';
    } else {
      reply = 'All orders placed before 3:00 PM ship same day with standard 2-year warranty and 7-day hassle-free replacement. How else can I assist?';
    }

    setTimeout(() => {
      setSupportMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: reply,
        },
      ]);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Agents Studio Header & Navigation Pills */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Live Autonomous Agents
              </span>
              <span className="text-xs text-slate-400">All 5 Missing Agents from Arjav's Architecture</span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">
              Interactive Multi-Agent Workbench & Simulation Studio
            </h2>
            <p className="text-xs text-slate-400">
              Test each agent live in real time. Experience how the Human-in-the-Loop bridge halts the conversation and waits for Arjav’s approval.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigateToTab('approvals')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition flex items-center cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              <span>{pendingApprovalsCount} Approvals in Queue</span>
            </button>
            <button
              onClick={() => onNavigateToTab('blueprint')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              Code Blueprint &rarr;
            </button>
          </div>
        </div>

        {/* Agent Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-4">
          {[
            {
              id: 'negotiation',
              name: 'Agent 3: Discount Bridge',
              desc: 'Human-in-the-Loop',
              icon: ShieldAlert,
              highlight: true,
            },
            {
              id: 'voice',
              name: 'Agent 1: Maya Voice AI',
              desc: 'Phone Call & Audio',
              icon: PhoneCall,
            },
            {
              id: 'chat',
              name: 'Agent 2: Aura WhatsApp',
              desc: 'Sales & Catalog',
              icon: MessageSquare,
            },
            {
              id: 'support',
              name: 'Agent 4: Support & Sentinel',
              desc: 'Sentiment & Flags',
              icon: ShieldCheck,
            },
            {
              id: 'inventory',
              name: 'Agent 5: Inventory Guardian',
              desc: 'Auto-Restock Daemon',
              icon: PackageCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = selectedAgent === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedAgent(item.id as any)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {item.highlight && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Core Ask
                    </span>
                  )}
                </div>
                <div className="font-semibold text-xs mt-2 text-slate-200 truncate">{item.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- AGENT 3: DISCOUNT & HUMAN-IN-THE-LOOP BRIDGE ---------------- */}
      {selectedAgent === 'negotiation' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                Human-in-the-Loop Negotiation Bridge
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                How Arjav Jain Approves Special Discounts in Real Time
              </h3>
              <p className="text-xs text-slate-400">
                In the ChatGPT architecture, the agent can auto-approve standard discounts (up to 5% or 10% for VIPs). When a customer demands higher (e.g. 20%), the agent must halt the conversation, POST an <code className="text-amber-300">approval_needed</code> webhook to the dashboard, and wait for Arjav's 1-click decision before resuming.
              </p>
            </div>
          </div>

          {/* Interactive Flow Visualizer */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Step 1 */}
            <div
              className={`p-4 rounded-xl border ${
                negotiationStep === 'idle'
                  ? 'bg-indigo-950/40 border-indigo-500/50'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="font-bold text-slate-300 flex items-center mb-1">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center mr-2 text-[10px]">
                  1
                </span>
                Customer Negotiates
              </div>
              <p className="text-slate-400 text-[11px]">
                Customer asks for {negotiationDiscount}% discount on {selectedProduct.name}.
              </p>
            </div>

            {/* Step 2 */}
            <div
              className={`p-4 rounded-xl border ${
                negotiationStep === 'requesting'
                  ? 'bg-amber-950/40 border-amber-500/50'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="font-bold text-slate-300 flex items-center mb-1">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mr-2 text-[10px]">
                  2
                </span>
                Policy Check Fails
              </div>
              <p className="text-slate-400 text-[11px]">
                {negotiationDiscount}% &gt; 10% limit. Agent pauses and POSTs to <span className="font-mono text-[10px] text-indigo-300">/api/webhook/n8n</span>.
              </p>
            </div>

            {/* Step 3 */}
            <div
              className={`p-4 rounded-xl border ${
                negotiationStep === 'paused_waiting_arjav'
                  ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-500/30 animate-pulse'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="font-bold text-amber-300 flex items-center mb-1">
                <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center mr-2 text-[10px]">
                  3
                </span>
                Arjav's 1-Click Approval
              </div>
              <p className="text-slate-300 text-[11px]">
                Pending in Dashboard Approvals. Arjav inspects margin and clicks Approve.
              </p>
            </div>

            {/* Step 4 */}
            <div
              className={`p-4 rounded-xl border ${
                negotiationStep === 'approved_resumed'
                  ? 'bg-emerald-950/40 border-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="font-bold text-emerald-400 flex items-center mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-400 flex items-center justify-center mr-2 text-[10px]">
                  4
                </span>
                Agent Resumes & Books
              </div>
              <p className="text-slate-400 text-[11px]">
                Webhook wakes up agent; agent confirms discounted order for customer!
              </p>
            </div>
          </div>

          {/* Configuration form for simulation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Product</label>
              <select
                value={selectedProduct.id}
                onChange={(e) => {
                  const p = products.find((item) => item.id === Number(e.target.value));
                  if (p) setSelectedProduct(p);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Rs {p.price.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Requested Discount: <span className="text-amber-400 font-bold">{negotiationDiscount}%</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="5"
                  value={negotiationDiscount}
                  onChange={(e) => setNegotiationDiscount(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-xs text-slate-300 w-10 text-right">{negotiationDiscount}%</span>
              </div>
            </div>
          </div>

          {/* Action trigger button and live status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Live Calculation:</span> Retail Price:{' '}
              <span className="font-mono">Rs {selectedProduct.price.toLocaleString()}</span> &rarr; Customer gets it for{' '}
              <span className="font-mono font-bold text-emerald-400">
                Rs {Math.round(selectedProduct.price * (1 - negotiationDiscount / 100)).toLocaleString()}
              </span>{' '}
              (Est. Remaining Margin:{' '}
              {Math.round(
                (((selectedProduct.price * (1 - negotiationDiscount / 100) - selectedProduct.price * 0.6) /
                  (selectedProduct.price * (1 - negotiationDiscount / 100))) *
                  100)
              )}
              %)
            </div>

            <div className="flex items-center space-x-3">
              {negotiationStep === 'paused_waiting_arjav' ? (
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 animate-bounce">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Waiting for Arjav's Approval
                  </span>
                  <button
                    onClick={() => onNavigateToTab('approvals')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                  >
                    Go to Approvals Center &rarr;
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartNegotiation}
                  disabled={negotiationStep === 'requesting'}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition cursor-pointer flex items-center"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  <span>Simulate Discount Request Webhook</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- AGENT 1: INBOUND VOICE SALES AI (MAYA) ---------------- */}
      {selectedAgent === 'voice' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <PhoneCall className="w-3.5 h-3.5 mr-1" />
                Agent 1: Inbound & Outbound Voice Sales
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Maya - Voice Commerce Representative</h3>
              <p className="text-xs text-slate-400">
                Speaks directly with customers via Web Speech & Gemini Live. Takes phone orders, checks warehouse stock, and logs audio duration.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-lg border text-xs font-medium cursor-pointer transition ${
                  isMuted ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={isMuted ? 'Unmute Audio Speech' : 'Mute Voice Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Voice Waveform Visualizer & Call HUD */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-indigo-400'}`} />
              <div className="text-xs text-slate-300 font-medium">
                {isSpeaking ? 'Maya is speaking...' : isListeningMic ? 'Listening to your voice...' : 'Call Connected (HD Voice)'}
              </div>
            </div>
            {/* Simulated Audio Bars */}
            <div className="flex items-center space-x-1 h-6">
              {[40, 70, 30, 90, 60, 100, 45, 80, 50, 65].map((h, i) => (
                <div
                  key={i}
                  style={{ height: isSpeaking || isListeningMic ? `${h}%` : '20%' }}
                  className="w-1 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full transition-all duration-150"
                />
              ))}
            </div>
          </div>

          {/* Voice Transcript Feed */}
          <div className="space-y-3 max-h-72 overflow-y-auto p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            {voiceMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-md p-3 rounded-xl text-xs ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="block text-[10px] text-slate-400 mt-1 text-right">{msg.time}</span>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Voice Input Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={startMicRecognition}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                isListeningMic
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Speak into Microphone"
            >
              {isListeningMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendVoice()}
              placeholder="Or type what customer says on the phone (e.g. 'Do you have headphones in stock?')"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
            <button
              onClick={() => handleSendVoice()}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition cursor-pointer flex items-center"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- AGENT 2: WHATSAPP SALES & COMMERCE (AURA) ---------------- */}
      {selectedAgent === 'chat' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Agent 2: WhatsApp Commerce & Catalog Sales
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Aura - WhatsApp Commerce Agent</h3>
              <p className="text-xs text-slate-400">
                Handles WhatsApp customer inquiries, catalog browsing, order placements, and policy checks.
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Meta WhatsApp Cloud API Connected
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => handleSendChat('What is the price of the Wireless Pro Headphones?')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            >
              Check Headphones Price
            </button>
            <button
              onClick={() => handleSendChat('Can I get a 15% discount if I buy 2 Ultra Mechanical Keyboards?')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 cursor-pointer"
            >
              Ask for 15% Discount (Triggers Approval)
            </button>
            <button
              onClick={() => handleSendChat('Please book 1 unit of Wireless Pro Headphones to my Mumbai address')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 cursor-pointer"
            >
              Buy Now (Auto Order)
            </button>
          </div>

          {/* WhatsApp Window */}
          <div className="space-y-3 max-h-72 overflow-y-auto p-4 rounded-xl bg-slate-950/90 border border-slate-800">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md p-3 rounded-xl text-xs ${
                    msg.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-none shadow-md shadow-emerald-700/20'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="block text-[10px] text-slate-400 mt-1 text-right">{msg.time}</span>
                </div>
              </div>
            ))}
            {isAgentTyping && (
              <div className="text-xs text-slate-400 italic flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Aura is typing...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Type a WhatsApp message to Aura (e.g. 'Can I get 20% discount on headphones?')"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <button
              onClick={() => handleSendChat()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- AGENT 4: CUSTOMER SUPPORT & SENTIMENT SENTINEL (KAVYA) ---------------- */}
      {selectedAgent === 'support' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Agent 4: Customer Support & Sentiment Sentinel
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Kavya - Order Tracking & Sentiment Guardian</h3>
              <p className="text-xs text-slate-400">
                Tracks deliveries, handles returns, and automatically detects customer distress/anger to flag messages (<code className="text-amber-300">flagged = 1</code>) for Arjav's urgent review.
              </p>
            </div>
            {supportSentiment && (
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold border ${
                  supportSentiment.flagged
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                Sentiment: {supportSentiment.sentiment}
              </span>
            )}
          </div>

          {/* Support message list */}
          <div className="space-y-3 max-h-72 overflow-y-auto p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            {supportMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md p-3 rounded-xl text-xs ${
                    msg.sender === 'user'
                      ? msg.flagged
                        ? 'bg-rose-950/80 border border-rose-500 text-rose-100 rounded-br-none'
                        : 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  {msg.flagged && (
                    <div className="flex items-center text-[10px] font-bold text-rose-400 mb-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      AUTO-FLAGGED FOR OWNER ARJAV JAIN
                    </div>
                  )}
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => {
                setSupportInput('Where is my order #101? I need the tracking number.');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 cursor-pointer"
            >
              Order #101 Tracking Query
            </button>
            <button
              onClick={() => {
                setSupportInput('This is terrible! My package is broken and nobody answered. Let me speak to your manager Arjav!');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-500/40 cursor-pointer"
            >
              Simulate Angry Customer (Triggers Flag)
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={supportInput}
              onChange={(e) => setSupportInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendSupport()}
              placeholder="Ask Kavya about delivery, returns, or warranty..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleSendSupport}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition cursor-pointer flex items-center"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- AGENT 5: INVENTORY GUARDIAN (VAULT) ---------------- */}
      {selectedAgent === 'inventory' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <PackageCheck className="w-3.5 h-3.5 mr-1" />
                Agent 5: Autonomous Inventory Guardian Daemon
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Vault - Autonomous Stock & Reorder Daemon</h3>
              <p className="text-xs text-slate-400">
                Continuously tracks inventory thresholds (<code className="text-amber-300">stock &lt; 5</code>), computes reorder quantities, and pushes updates via the n8n webhook.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              Daemon Running
            </span>
          </div>

          {/* Current Stock Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {products.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-xl border ${
                  p.stock < 5
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-[11px] font-semibold truncate">{p.name}</div>
                <div className="text-lg font-bold mt-1 text-white">{p.stock} units</div>
                <div className="text-[10px] text-slate-400">{p.stock < 5 ? 'Restock Triggered' : 'Healthy'}</div>
              </div>
            ))}
          </div>

          {/* Guardian Event Activity Log */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 max-h-56 overflow-y-auto font-mono text-xs">
            {guardianLogs.map((log, i) => (
              <div
                key={i}
                className={`flex items-start space-x-2 ${
                  log.type === 'alert'
                    ? 'text-rose-400'
                    : log.type === 'success'
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                <span className="text-slate-600 text-[10px]">{log.time} &bull;</span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
