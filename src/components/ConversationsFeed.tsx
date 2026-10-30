import React, { useState } from 'react';
import { Conversation } from '../types';

interface ConversationsFeedProps {
  messages: Conversation[];
  onDeleteMessage: (id: number) => Promise<void>;
  onToggleFlag: (id: number) => Promise<void>;
}

export const ConversationsFeed: React.FC<ConversationsFeedProps> = ({
  messages,
  onDeleteMessage,
  onToggleFlag,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

  const filtered = messages.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.customer.toLowerCase().includes(q) ||
      (m.message || '').toLowerCase().includes(q) ||
      m.agent_id.toLowerCase().includes(q)
    );
  });

  const togglePlayAudio = (id: number, text: string) => {
    if (playingAudioId === id) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.onend = () => setPlayingAudioId(null);
        utterance.onerror = () => setPlayingAudioId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setPlayingAudioId(null), 3500);
      }
    }
  };

  return (
    <div className="card">
      <div className="bill-bar">
        <div>
          <h3 className="text-base font-bold text-slate-100">Agent ↔ Customer Chats</h3>
          <p className="muted text-xs mt-0.5">
            Real-time feed of multi-agent interactions across WhatsApp, Voice AI Maya, and negotiation flows.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {filtered.length} Messages
        </span>
      </div>

      {/* Live Search Input matching style.css */}
      <input
        type="text"
        id="searchBox"
        className="search"
        placeholder="Search messages by customer name, keyword, or agent..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div id="chatList" className="space-y-3 mt-4">
        {filtered.length === 0 ? (
          <p className="muted py-8 text-center">
            {searchTerm ? 'No messages match your search filter.' : 'No messages yet — your n8n agent or WhatsApp portal will POST them here.'}
          </p>
        ) : (
          filtered.map((m) => {
            const isPlaying = playingAudioId === m.id;
            const isVoice = m.audio_url || m.agent_id.includes('voice');

            return (
              <div key={m.id} className="relative group">
                <div className={`msg ${m.sender === 'agent' ? 'ml-auto' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className={`tag ${m.sender === 'customer' ? 'customer' : 'agent'}`}>
                        {m.sender}
                      </span>
                      <span className="muted text-xs ml-2">
                        {m.customer} · {m.created_at} · <span className="font-mono text-slate-300">{m.agent_id}</span>
                      </span>
                    </div>

                    {/* Quick Action buttons */}
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onToggleFlag(m.id)}
                        className={`text-xs p-1 rounded hover:bg-white/10 transition ${m.flagged ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
                        title="Flag for review"
                      >
                        🚩
                      </button>
                      <button
                        onClick={() => onDeleteMessage(m.id)}
                        className="text-xs p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/10 transition"
                        title="Delete log"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {isVoice ? (
                    <div className={`voice-msg ${isPlaying ? 'playing' : ''}`}>
                      <button
                        type="button"
                        className="voice-msg__btn"
                        onClick={() => togglePlayAudio(m.id, m.message || 'Customer audio note')}
                        aria-label="Play voice message"
                      >
                        <span className="voice-msg__play">▶</span>
                        <span className="voice-msg__stop">❚❚</span>
                      </button>
                      <span className="voice-msg__bars">
                        <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                      </span>
                      <span className="voice-msg__dur">{m.duration || 4}s</span>
                      <span className="voice-msg__track">
                        <span
                          className="voice-msg__progress"
                          style={{ width: isPlaying ? '100%' : '0%', transition: isPlaying ? 'width 3.5s linear' : 'none' }}
                        ></span>
                      </span>
                    </div>
                  ) : (
                    <p className="text-slate-100">{m.message}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
