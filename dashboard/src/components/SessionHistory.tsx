"use client";

import React from 'react';
import { Bot, PlusCircle, RefreshCw, Trash2, AlertTriangle, Clock } from 'lucide-react';

interface Session {
  id: string;
  agent_name: string;
  summary: string;
  added?: string[];
  changed?: string[];
  removed?: string[];
  known_issues?: string[];
  created_at: string;
}

interface SessionHistoryProps {
  sessions: Session[];
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ sessions }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>AI Agent Session History</h2>
        <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
          Permanent audit log of tasks completed by AI agents (Claude Code, Cursor, Windsurf, ChatGPT).
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sessions.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
            <Bot size={40} color="#6B7280" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#E5E7EB' }}>No agent sessions recorded yet</p>
            <p style={{ fontSize: '0.85rem' }}>Agents invoke <code style={{ color: '#00F2FE' }}>session.end</code> when completing a task.</p>
          </div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '6px', background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.4)', borderRadius: '8px' }}>
                    <Bot size={20} color="#A78BFA" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>{s.agent_name}</h3>
                    <span style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {s.created_at ? s.created_at.replace('T', ' ').substring(0, 16) : ''}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.92rem', color: '#E5E7EB', lineHeight: '1.5', marginBottom: '14px' }}>
                {s.summary}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.82rem' }}>
                {s.added && s.added.length > 0 && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '6px', color: '#10B981' }}>
                    <strong>Added: </strong> {s.added.join(', ')}
                  </div>
                )}

                {s.changed && s.changed.length > 0 && (
                  <div style={{ background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.2)', padding: '6px 12px', borderRadius: '6px', color: '#00F2FE' }}>
                    <strong>Changed: </strong> {s.changed.join(', ')}
                  </div>
                )}

                {s.removed && s.removed.length > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '6px', color: '#EF4444' }}>
                    <strong>Removed: </strong> {s.removed.join(', ')}
                  </div>
                )}

                {s.known_issues && s.known_issues.length > 0 && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '6px 12px', borderRadius: '6px', color: '#FBBF24' }}>
                    <strong>Known Issues: </strong> {s.known_issues.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
