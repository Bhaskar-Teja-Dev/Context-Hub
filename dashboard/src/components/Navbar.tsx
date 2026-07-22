"use client";

import React from 'react';
import { Database, Plus, Key, LogOut, User } from 'lucide-react';

interface NavbarProps {
  currentProject: any;
  onOpenCreateModal: () => void;
  onOpenKeyModal: () => void;
  user?: any;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  onOpenCreateModal,
  onOpenKeyModal,
  user,
  onLogout
}) => {
  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || '';

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
            <span className="badge badge-cyan">v2</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Universal Shared AI Project Memory</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Active Project Badge */}
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

        {/* User Avatar + Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #00F2FE, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                {displayName?.[0]?.toUpperCase() || <User size={14} />}
              </div>
            )}
            <span style={{ fontSize: '0.82rem', color: '#E5E7EB', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', padding: '2px' }}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
