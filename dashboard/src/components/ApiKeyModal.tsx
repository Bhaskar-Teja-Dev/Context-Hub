"use client";

import React, { useState } from 'react';
import { Key, Copy, Check, X, ShieldAlert } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  projectId: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, apiKey, projectId }) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);

  if (!isOpen) return null;

  const mcpConfigJson = JSON.stringify({
    "mcpServers": {
      "contexthub": {
        "command": "c:\\Users\\bhask\\OneDrive\\Desktop\\Context-Hub\\backend\\venv\\Scripts\\python.exe",
        "args": ["c:\\Users\\bhask\\OneDrive\\Desktop\\Context-Hub\\backend\\app\\mcp_server.py"],
        "env": {
          "CONTEXTHUB_API_KEY": apiKey || "ch_live_demo1234567890abcdef",
          "CONTEXTHUB_PROJECT_ID": projectId || "00000000-0000-0000-0000-000000000002"
        }
      }
    }
  }, null, 2);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey || "ch_live_demo1234567890abcdef");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyMcp = () => {
    navigator.clipboard.writeText(mcpConfigJson);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '28px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Key color="#00F2FE" size={24} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Project API Key & MCP Config</h2>
        </div>

        <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginBottom: '20px' }}>
          Use this API Key to authenticate your MCP agents (Claude Code, Cursor, Windsurf) or REST calls.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
            API Key
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              readOnly
              className="glass-input"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#00F2FE' }}
              value={apiKey || "ch_live_demo1234567890abcdef"}
            />
            <button className="btn-secondary" onClick={handleCopyKey}>
              {copiedKey ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
              {copiedKey ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Claude Desktop / Cursor MCP Config Snippet
            </label>
            <button className="btn-secondary" onClick={handleCopyMcp} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
              {copiedMcp ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              {copiedMcp ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <pre style={{ background: '#0B0F17', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#A78BFA', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', overflowX: 'auto' }}>
            {mcpConfigJson}
          </pre>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};
