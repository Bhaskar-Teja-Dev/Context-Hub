"use client";

import React, { useState } from 'react';
import { GitCommit, Plus, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Decision {
  id: string;
  title: string;
  reason: string;
  alternatives?: string;
  impact?: string;
  decided_at: string;
}

interface DecisionTimelineProps {
  decisions: Decision[];
  onAddDecision: (dec: { title: string; reason: string; alternatives?: string; impact?: string }) => void;
}

export const DecisionTimeline: React.FC<DecisionTimelineProps> = ({
  decisions,
  onAddDecision
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [impact, setImpact] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reason.trim()) return;
    onAddDecision({
      title: title.trim(),
      reason: reason.trim(),
      alternatives: alternatives.trim() || undefined,
      impact: impact.trim() || undefined
    });
    setTitle('');
    setReason('');
    setAlternatives('');
    setImpact('');
    setShowModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>Architectural Decision Log</h2>
          <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
            Record critical technical choices so AI agents never undo past architectural decisions.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Log Decision
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        {decisions.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
            <GitCommit size={40} color="#6B7280" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#E5E7EB' }}>No decisions logged yet</p>
            <p style={{ fontSize: '0.85rem' }}>Agents and developers can record decisions via MCP or API.</p>
          </div>
        ) : (
          decisions.map((dec, idx) => (
            <div key={dec.id} className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid #00F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={18} color="#00F2FE" />
                </div>
                {idx < decisions.length - 1 && (
                  <div style={{ width: '2px', flex: 1, background: 'rgba(255,255,255,0.1)', marginTop: '8px' }}></div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF' }}>{dec.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
                    {dec.decided_at ? dec.decided_at.split('T')[0] : ''}
                  </span>
                </div>

                <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: '#E5E7EB', lineHeight: '1.5' }}>
                  <strong style={{ color: '#00F2FE' }}>Rationale: </strong>{dec.reason}
                </div>

                {dec.alternatives && (
                  <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#9CA3AF' }}>
                    <strong style={{ color: '#A78BFA' }}>Alternatives Considered: </strong>{dec.alternatives}
                  </div>
                )}

                {dec.impact && (
                  <div style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
                    <strong style={{ color: '#10B981' }}>Impact: </strong>{dec.impact}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Log Architectural Decision</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Decision Title</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Use Supabase pgvector for vector similarity search"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Rationale / Reason</label>
                <textarea
                  required
                  rows={3}
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="Explain why this decision was made..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Alternatives Considered (Optional)</label>
                <input
                  type="text"
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Pinecone, Qdrant, ChromaDB"
                  value={alternatives}
                  onChange={(e) => setAlternatives(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Impact / Trade-offs (Optional)</label>
                <input
                  type="text"
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Zero infrastructure cost, single Postgres instance"
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Log Decision</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
