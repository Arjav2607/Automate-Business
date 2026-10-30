import React, { useState } from 'react';

interface OwnerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerSettingsModal: React.FC<OwnerSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [notifyApprovals, setNotifyApprovals] = useState(true);
  const [soundFx, setSoundFx] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [ownerId, setOwnerId] = useState('Arjav Jain');
  const [recoveryCode, setRecoveryCode] = useState('RECOVER42');
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: 'owner123',
          owner_id: ownerId,
          new_password: newPassword || undefined,
          recovery_code: recoveryCode,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatusMsg({ text: 'Settings saved successfully!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ text: data.error || 'Failed to save', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Network error', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="card w-full max-w-xl mx-auto my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Settings &amp; Preferences</h3>
            <p className="muted text-xs">Notification controls &amp; owner authentication</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* ═══ Switches Section ═══ */}
        <div className="space-y-1 mt-4">
          <div className="setting-row">
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Approval notifications</h4>
              <p className="muted text-xs">Beep + toast when an AI agent requests your decision</p>
            </div>
            <button
              className="squish-switch"
              data-on={notifyApprovals ? '' : undefined}
              role="switch"
              aria-checked={notifyApprovals}
              onClick={() => setNotifyApprovals((p) => !p)}
            >
              <span className="ss-track"><span className="ss-thumb"></span></span>
            </button>
          </div>

          <div className="setting-row">
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Sound effects</h4>
              <p className="muted text-xs">Audio chime alert when human intervention is needed</p>
            </div>
            <button
              className="squish-switch"
              data-on={soundFx ? '' : undefined}
              role="switch"
              aria-checked={soundFx}
              onClick={() => setSoundFx((p) => !p)}
            >
              <span className="ss-track"><span className="ss-thumb"></span></span>
            </button>
          </div>

          <div className="setting-row">
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Auto-refresh dashboard</h4>
              <p className="muted text-xs">Poll real-time agent metrics and conversation feed</p>
            </div>
            <button
              className="squish-switch"
              data-on={autoRefresh ? '' : undefined}
              role="switch"
              aria-checked={autoRefresh}
              onClick={() => setAutoRefresh((p) => !p)}
            >
              <span className="ss-track"><span className="ss-thumb"></span></span>
            </button>
          </div>
        </div>

        {/* ═══ Meta WhatsApp Cloud API credentials ═══ */}
        <div className="mt-5 p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
              Meta WhatsApp Cloud API Status
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Configured &amp; Active
            </span>
          </div>
          <div className="text-xs space-y-1 text-slate-300 font-mono">
            <div><strong>Number:</strong> +1 (555) 214-5018</div>
            <div><strong>Phone Number ID:</strong> 1400940463102580</div>
            <div><strong>WABA ID:</strong> 1840482170413388</div>
            <div><strong>Webhook:</strong> /api/webhook/whatsapp</div>
          </div>
        </div>

        {/* ═══ Owner Security Credentials ═══ */}
        <form onSubmit={handleSave} className="mt-5 space-y-3">
          <div className="setting-row">
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Owner Sign-in ID</h4>
              <p className="muted text-xs">Your administrative display name</p>
            </div>
            <input
              type="text"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="search mb-0 max-w-[200px]"
            />
          </div>

          <div className="setting-row">
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Recovery code</h4>
              <p className="muted text-xs">Emergency unlock key for account lockouts</p>
            </div>
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              className="search mb-0 max-w-[200px]"
            />
          </div>

          <div className="setting-row">
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Update Password</h4>
              <p className="muted text-xs">Leave blank to retain current password</p>
            </div>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="search mb-0 max-w-[200px]"
            />
          </div>

          {statusMsg && (
            <div
              className={`p-2.5 rounded-lg text-xs font-semibold ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="btn ghost2 text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn approve text-xs py-2 px-5"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
