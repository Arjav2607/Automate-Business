import React from 'react';
import { X, Printer, Download, ShoppingBag } from 'lucide-react';
import { Order } from '../types';

interface PrintBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onDownloadCsv: () => void;
}

export const PrintBillModal: React.FC<PrintBillModalProps> = ({
  isOpen,
  onClose,
  orders,
  onDownloadCsv,
}) => {
  if (!isOpen) return null;

  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header (hidden in print) */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Consolidated Orders & Billing Summary</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onDownloadCsv}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition cursor-pointer flex items-center"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-100 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          <div className="flex justify-between items-start border-b pb-4 border-slate-700">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">ARJAV JAIN ELECTRONICS</h1>
              <p className="text-xs text-slate-400 mt-1">
                Multi-Agent Autonomous Commerce Hub & Store Operations
              </p>
              <p className="text-xs text-slate-400">Owner ID: Arjav Jain &bull; GSTIN: 27AABCA1234F1Z5</p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-slate-400">Statement Date</span>
              <div className="text-sm font-semibold">{new Date().toLocaleDateString()}</div>
              <div className="text-xs text-slate-400">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 uppercase">
                <th className="py-2">Order #</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Product</th>
                <th className="py-2">Channel Agent</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2.5 font-mono text-indigo-400">#{o.id}</td>
                  <td className="py-2.5 font-medium">{o.customer}</td>
                  <td className="py-2.5">{o.product}</td>
                  <td className="py-2.5 font-mono text-[11px] text-slate-400">{o.agent_id}</td>
                  <td className="py-2.5 text-right font-mono">{o.quantity}</td>
                  <td className="py-2.5 text-right font-semibold font-mono">
                    Rs {o.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 font-bold">
                <td colSpan={4} className="py-3 text-right uppercase text-xs text-slate-400">
                  Total Consolidated Revenue ({orders.length} orders):
                </td>
                <td colSpan={2} className="py-3 text-right text-base text-emerald-400 font-mono">
                  Rs {totalRevenue.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Generated from Arjav AI Management Console</span>
            <span>All sales recorded with cryptographic audit hash</span>
          </div>
        </div>
      </div>
    </div>
  );
};
