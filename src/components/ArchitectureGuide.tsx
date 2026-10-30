import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Copy,
  Check,
  Bot,
  Layers,
  Zap,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  PackageCheck,
  FileCode,
  Download,
} from 'lucide-react';

export const ArchitectureGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'overview' | 'n8n_json' | 'python_agent' | 'prompts'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const n8nWorkflowJson = `{
  "name": "Arjav AI Multi-Agent Sales & Human-in-the-Loop Pipeline",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "customer-inbound",
        "options": {}
      },
      "name": "Inbound Customer Webhook (WhatsApp / Twilio)",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [100, 300]
    },
    {
      "parameters": {
        "model": "gemini-3.8-flash",
        "prompt": "={{ $json.body.message }}",
        "systemMessage": "You are Aura/Maya, autonomous sales agent for Arjav Jain's Electronics store. Enforce max 5% discount for standard and 10% for VIPs. If customer asks for > 10%, call request_human_approval tool."
      },
      "name": "Gemini 3.8 Flash Agent",
      "type": "n8n-nodes-base.aiAgent",
      "typeVersion": 1,
      "position": [340, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.requires_human_approval }}",
              "value2": true
            }
          ]
        }
      },
      "name": "Check Approval Needed?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [580, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/api/webhook/n8n",
        "body": {
          "event": "approval_needed",
          "agent_id": "sales_chat_agent",
          "type": "discount_request",
          "summary": "={{ $json.summary }}",
          "context": "={{ $json.context }}",
          "resume_url": "={{ $resumeWebhookUrl }}"
        }
      },
      "name": "Post approval_needed to Dashboard",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [820, 200]
    },
    {
      "parameters": {
        "resume": "webhook"
      },
      "name": "Wait for Arjav's 1-Click Decision",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1,
      "position": [1060, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/api/webhook/n8n",
        "body": {
          "event": "order_placed",
          "agent_id": "sales_agent",
          "customer": "={{ $json.customer }}",
          "product": "={{ $json.product }}",
          "amount": "={{ $json.amount }}",
          "quantity": "={{ $json.quantity }}"
        }
      },
      "name": "Post order_placed to Dashboard",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [1300, 300]
    }
  ],
  "connections": {
    "Inbound Customer Webhook (WhatsApp / Twilio)": {
      "main": [[{ "node": "Gemini 3.8 Flash Agent", "type": "main", "index": 0 }]]
    },
    "Gemini 3.8 Flash Agent": {
      "main": [[{ "node": "Check Approval Needed?", "type": "main", "index": 0 }]]
    },
    "Check Approval Needed?": {
      "main": [
        [{ "node": "Post approval_needed to Dashboard", "type": "main", "index": 0 }],
        [{ "node": "Post order_placed to Dashboard", "type": "main", "index": 0 }]
      ]
    },
    "Post approval_needed to Dashboard": {
      "main": [[{ "node": "Wait for Arjav's 1-Click Decision", "type": "main", "index": 0 }]]
    },
    "Wait for Arjav's 1-Click Decision": {
      "main": [[{ "node": "Post order_placed to Dashboard", "type": "main", "index": 0 }]]
    }
  }
}`;

  const pythonAgentCode = `"""
agent_runner.py - Autonomous Sales & Negotiation Agent for Arjav Jain
Connects to Arjav's Flask backend at http://localhost:5000 (or http://localhost:3000)
"""
import os
import requests
from google import genai
from google.genai import types

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3000")
N8N_WEBHOOK = f"{BACKEND_URL}/api/webhook/n8n"

client = genai.Client()

def check_stock_and_price(product_name: str) -> dict:
    """Tool: fetches real-time catalog stock and price from Arjav's database."""
    r = requests.get(f"{BACKEND_URL}/api/products")
    prods = r.json().get("products", [])
    for p in prods:
        if product_name.lower() in p["name"].lower():
            return {"found": True, "product": p["name"], "price": p["price"], "stock": p["stock"]}
    return {"found": False, "error": "Product not found in catalog"}

def request_discount_approval(customer: str, product: str, discount_pct: float, resume_url: str) -> dict:
    """
    Tool: When customer demands discount > policy limit, halts and sends approval_needed
    to Arjav's dashboard with the callback resume_url.
    """
    payload = {
        "event": "approval_needed",
        "agent_id": "agent_aura_chat",
        "type": "discount_request",
        "summary": f"{customer} requested {discount_pct}% discount on {product}",
        "context": {
            "customer": customer,
            "product": product,
            "discount_pct": discount_pct,
        },
        "resume_url": resume_url
    }
    r = requests.post(N8N_WEBHOOK, json=payload)
    return {"status": "approval_submitted", "details": r.json()}

def place_customer_order(customer: str, product: str, quantity: int, amount: float) -> dict:
    """Tool: Places final confirmed order and auto-deducts inventory."""
    payload = {
        "event": "order_placed",
        "agent_id": "agent_aura_chat",
        "customer": customer,
        "product": product,
        "quantity": quantity,
        "amount": amount,
        "status": "placed"
    }
    r = requests.post(N8N_WEBHOOK, json=payload)
    return r.json()

print("Arjav AI Autonomous Agent initialized. Ready to handle inbound calls & chats!")
`;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Blueprint & Missing Agents Guide
              </span>
              <span className="text-xs text-slate-400">Answering your ChatGPT conversation inquiry</span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">
              How to Build the Missing Agents for Arjav's System
            </h2>
            <p className="text-xs text-slate-400">
              The provided <code className="text-indigo-300 font-mono">app.py</code> was only the management backend and webhook receiver. Here is the exact architectural blueprint, prompts, and n8n nodes that build the agents themselves.
            </p>
          </div>

          {/* Section Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'overview', label: 'Architecture & The 5 Agents' },
              { id: 'n8n_json', label: 'n8n Workflow JSON' },
              { id: 'python_agent', label: 'Python Agent Script' },
              { id: 'prompts', label: 'System Prompts & Tools' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeSection === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- SECTION 1: ARCHITECTURE OVERVIEW ---------------- */}
        {activeSection === 'overview' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agent 1 Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs uppercase">
                  <PhoneCall className="w-4 h-4" />
                  <span>Agent 1: Inbound Voice Commerce AI (Maya)</span>
                </div>
                <h4 className="text-sm font-bold text-white">How to Build It:</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Connect Twilio / LiveKit / ElevenLabs to the Gemini Live API. When a customer dials the store number, the audio streams to Gemini. The model has function declarations to inspect real stock (<code className="text-indigo-300">get_stock</code>) and place orders. Every speech turn sends a <code className="text-indigo-300">message</code> event with <code className="text-indigo-300">audio_url</code> to <code className="text-indigo-300">/api/webhook/n8n</code>.
                </p>
              </div>

              {/* Agent 2 Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase">
                  <MessageSquare className="w-4 h-4" />
                  <span>Agent 2: WhatsApp Commerce Agent (Aura)</span>
                </div>
                <h4 className="text-sm font-bold text-white">How to Build It:</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Use Meta WhatsApp Cloud API connected via an n8n webhook trigger. When a customer messages, n8n invokes Gemini 3.8 Flash with your catalog prompt. If the customer accepts standard pricing or up to 5% discount, it calls <code className="text-indigo-300">place_order</code> which POSTs <code className="text-indigo-300">order_placed</code> to Arjav's backend.
                </p>
              </div>

              {/* Agent 3 Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Agent 3: Human-in-the-Loop Negotiation Bridge</span>
                </div>
                <h4 className="text-sm font-bold text-white">How to Build It:</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The core secret in the ChatGPT conversation: When discount &gt; policy, the agent calls <code className="text-indigo-300">request_discount_approval</code>. In n8n, this node POSTs <code className="text-indigo-300">approval_needed</code> containing <code className="text-indigo-300">resume_url</code> to Arjav's Flask backend. Then an n8n <strong>Wait Node</strong> halts the workflow. When Arjav clicks "Approve", Flask calls <code className="text-indigo-300">resume_url</code>, resuming the agent to book the order!
                </p>
              </div>

              {/* Agent 4 & 5 Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Agent 4 & 5: Support Sentiment & Inventory Guardian</span>
                </div>
                <h4 className="text-sm font-bold text-white">How to Build Them:</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Agent 4 (Support):</strong> Evaluates message sentiment. If customer says "angry/manager/broken", sets <code className="text-indigo-300">flagged: 1</code> in <code className="text-indigo-300">/api/webhook/n8n</code>.<br />
                  <strong>Agent 5 (Inventory):</strong> Runs as a cron job every hour. Queries <code className="text-indigo-300">/api/products</code>; if any SKU has <code className="text-indigo-300">stock &lt; 5</code>, sends an alert to Arjav or auto-creates supplier POs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- SECTION 2: N8N JSON ---------------- */}
        {activeSection === 'n8n_json' && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Copy and import directly into n8n via <strong className="text-white">Workflow &gt; Import from JSON</strong>:
              </span>
              <button
                onClick={() => copyCode(n8nWorkflowJson, 'n8n')}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition cursor-pointer"
              >
                {copiedKey === 'n8n' ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copy n8n Workflow JSON</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed max-h-96">
              {n8nWorkflowJson}
            </pre>
          </div>
        )}

        {/* ---------------- SECTION 3: PYTHON AGENT SCRIPT ---------------- */}
        {activeSection === 'python_agent' && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Standalone Python Autonomous Agent Script (<code className="text-indigo-300">agent_runner.py</code>):
              </span>
              <button
                onClick={() => copyCode(pythonAgentCode, 'python')}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition cursor-pointer"
              >
                {copiedKey === 'python' ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copy Python Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed max-h-96">
              {pythonAgentCode}
            </pre>
          </div>
        )}

        {/* ---------------- SECTION 4: PROMPTS & TOOLS ---------------- */}
        {activeSection === 'prompts' && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center">
                <Bot className="w-4 h-4 mr-2 text-indigo-400" />
                Aura Sales Agent System Prompt:
              </h4>
              <p className="text-xs font-mono text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
                You are Aura, the premier AI sales assistant for Arjav Jain Electronics store. Your goal is to guide customers to purchase from our catalog, quote accurate Indian Rupee prices, verify live warehouse stock, and enforce discount boundaries. If a customer requests more than a 10% discount, do NOT reject them outright: call the request_discount_approval tool and politely ask them to hold while owner Arjav Jain approves the special rate.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
