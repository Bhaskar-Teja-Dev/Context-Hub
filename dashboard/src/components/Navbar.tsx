"use client";

import React from 'react';
import { Database, ShieldCheck, Cpu, Sparkles, Plus, Key } from 'lucide-react';

interface NavbarProps {
  currentProject: any;
  onOpenCreateModal: () => void;
  onOpenKeyModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  onOpenCreateModal,
  onOpenKeyModal
}) => {
  return (
    <header className="glass-panel" style={{ borderRadius: '0 0 16px 16px', borderTop: 'none', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ background: 'linear-gradient(135deg, #00F2FE 0%, #7C3AED 100%)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(0, 242, 254, 0.4)' }}>
          <Database size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(90deg, #FFFFFF 0%, #9CA3AF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ContextHub
            </h1>
            <span className="badge badge-cyan">MVP</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Universal Shared AI Project Memory</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} className="pulse-glow"></span>
          <span style={{ fontSize: '0.85rem', color: '#E5E7EB', fontWeight: 500 }}>
            {currentProject ? currentProject.name : 'Demo ContextHub Project'}
          </span>
        </div>

        <button className="btn-secondary" onClick={onOpenKeyModal}>
          <Key size={16} /> API Key
        </button>

        <button className="btn-primary" onClick={onOpenCreateModal}>
          <Plus size={16} /> New Project
        </button>
      </div>
    </header>
  );
};
