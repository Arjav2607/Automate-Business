import React, { useState } from 'react';
import {
  Network,
  Send,
  Copy,
  Check,
  Terminal,
  Activity,
  ArrowRight,
  Database,
  Cpu,
  Clock,
  CheckCircle,
  AlertCircle,
  Code2,
} from 'lucide-react';
import { WebhookLog } from '../types';

interface N8nWorkflowVisualizerProps {
  logs: WebhookLog[];
  onSendWebhook: (payload: any) => Promise<any>;
}

export const N8nWorkflowVisualizer: React.FC<N8nWorkflowVisualizerProps> = ({
  logs,
  onSendWebhook,
}) => {
  const [selectedEventType, setSelectedEventType] = useState<'order_placed' | 'message' | 'approval_needed' | 'stock_update'>('order_placed');
  const [customPayload, setCustomPayload] = useState<string>(
    JSON.stringify(
      {
        event: 'order_placed',
        agent_id: 'agent_maya_voice',
        customer: 'Siddharth Varma',
        product: 'Wireless Pro Headphones',
        quantity: 1,
        amount: 2499,
        status: 'placed',
      },
      null,
      2
    )
  );
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<string | null>(null);

  const presets = {
    order_placed: {
      event: 'order_placed',
      agent_id: 'agent_maya_voice',
      customer: 'Siddharth Varma',
      product: 'Wireless Pro Headphones',
      quantity: 1,
      amount: 2499,
      status: 'placed',
    },
    message: {
      event: 'message',
      agent_id: 'agent_aura_chat',
      customer: 'Neha Kapoor',
      sender: 'customer',
      text: 'Do you offer warranty on the Ultra Mechanical Keyboard?',
      duration: 0,
    },
    approval_needed: {
      event: 'approval_needed',
      agent_id: 'agent_aura_chat',
      type: 'discount_request',
      summary: 'Neha Kapoor requested 25% discount for 5 keyboards',
      context: {
        customer: 'Neha Kapoor',
        product: 'Ultra Mechanical Keyboard',
        quantity: 5,
        retailPrice: 24995,
        discountPct: 25,
        proposedAmount: 18746,
        pastOrders: 4,
        grossMarginRemaining: '20%',
      },
      resume_url: 'http://localhost:3000/api/internal/mock-resume/99',
    },
    stock_update: {
      event: 'stock_update',
      agent_id: 'agent_inventory_guardian',
      product: 'Ultra Mechanical Keyboard',
      stock: 20,
    },
  };

  const handleSelectPreset = (type: keyof typeof presets) => {
    setSelectedEventType(type);
    setCustomPayload(JSON.stringify(presets[type], null, 2));
  };

  const handleDispatch = async () => {
    try {
      const parsed = JSON.parse(customPayload);
      setSendingStatus('Sending...');
      const res = await onSendWebhook(parsed);
      setSendingStatus('Success! Event ingested into database.');
      setTimeout(() => setSendingStatus(null), 3000);
    } catch (err: any) {
      setSendingStatus(`Error: ${err.message || 'Invalid JSON'}`);
    }
  };

  const curlCommand = `curl -X POST http://localhost:3000/api/webhook/n8n \\
  -H "Content-Type: application/json" \\
  -d '${customPayload.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Visual Workflow Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Workflow Orchestration
              </span>
              <span className="text-xs text-slate-400">n8n Node Pipeline Architecture</span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">
              n8n Visual Agent Graph & Webhook Bridge
            </h2>
            <p className="text-xs text-slate-400">
              How autonomous agents communicate with Arjav’s backend via <code className="text-indigo-300 font-mono">/api/webhook/n8n</code> and pause with Wait Nodes.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Activity className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
            Endpoint Ready
          </span>
        </div>

        {/* Visual Pipeline Graph */}
        <div className="mt-6 p-5 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[780px] gap-2">
            {/* Node 1 */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-center w-36 shrink-0 shadow">
              <div className="text-[10px] uppercase font-bold text-indigo-400">Step 1: Ingest</div>
              <div className="text-xs font-bold text-white mt-1">WhatsApp / Call</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Twilio / Meta API</div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            {/* Node 2 */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-purple-500/40 text-center w-40 shrink-0 shadow">
              <div className="text-[10px] uppercase font-bold text-purple-400">Step 2: AI Agent</div>
              <div className="text-xs font-bold text-white mt-1">Gemini 3.8 Flash</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Prompt & Tool Calling</div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            {/* Node 3 */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/40 text-center w-36 shrink-0 shadow">
              <div className="text-[10px] uppercase font-bold text-amber-400">Step 3: Policy</div>
              <div className="text-xs font-bold text-white mt-1">Discount &gt; 10%?</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Authority Check</div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            {/* Node 4: Wait Node */}
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-400 text-center w-44 shrink-0 shadow animate-pulse">
              <div className="text-[10px] uppercase font-bold text-amber-300">Step 4: n8n Wait Node</div>
              <div className="text-xs font-bold text-white mt-1">approval_needed</div>
              <div className="text-[10px] text-slate-300 mt-0.5">Pauses & Waits for UI</div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            {/* Node 5: Resume */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center w-40 shrink-0 shadow">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Step 5: Resume</div>
              <div className="text-xs font-bold text-white mt-1">order_placed</div>
              <div className="text-[10px] text-slate-300 mt-0.5">Stock Deducted in DB</div>
            </div>
          </div>
        </div>

        {/* Live Webhook Tester & Curl Generator */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dispatcher Form */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center">
                <Send className="w-4 h-4 mr-2 text-indigo-400" />
                Live Webhook Dispatcher
              </h3>
              <div className="flex items-center space-x-1">
                {(Object.keys(presets) as Array<keyof typeof presets>).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSelectPreset(type)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition cursor-pointer ${
                      selectedEventType === type
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={9}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              {sendingStatus ? (
                <span className="text-xs font-semibold text-emerald-400">{sendingStatus}</span>
              ) : (
                <span className="text-[11px] text-slate-500">Target: POST /api/webhook/n8n</span>
              )}
              <button
                onClick={handleDispatch}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer flex items-center"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span>Send Webhook Now</span>
              </button>
            </div>
          </div>

          {/* Copyable Curl & Terminal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center">
                <Terminal className="w-4 h-4 mr-2 text-amber-400" />
                Copyable cURL Snippet
              </h3>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              >
                {copiedCurl ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    <span>Copy cURL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed h-[208px]">
              {curlCommand}
            </pre>

            <p className="text-[11px] text-slate-400">
              Run this in terminal to simulate an external agent or n8n workflow posting into Arjav’s backend.
            </p>
          </div>
        </div>

        {/* Live Inbound & Outbound Webhook Stream */}
        <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2 text-indigo-400" />
              Live Inbound / Outbound Event Stream
            </h3>
            <span className="text-xs text-slate-400">{logs.length} Total Events Logged</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.direction === 'inbound'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {log.direction}
                  </span>
                  <span className="font-mono font-bold text-white">{log.event}</span>
                  <span className="text-slate-400 text-[11px]">from [{log.source}]</span>
                </div>

                <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                  <span className="font-mono text-slate-500 truncate max-w-xs">
                    {JSON.stringify(log.payload)}
                  </span>
                  <span className="whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
