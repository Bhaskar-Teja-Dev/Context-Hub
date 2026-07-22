"use client";

import React, { useState } from 'react';
import { Key, Copy, Check, X, Server, Code } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  projectId: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, apiKey, projectId }) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [configMode, setConfigMode] = useState<'cloud' | 'local'>('cloud');
  const [localPath, setLocalPath] = useState('C:\\Users\\bhask\\OneDrive\\Desktop\\Context-Hub');
  const [backendUrl, setBackendUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  );

  if (!isOpen) return null;

  const cleanBackendUrl = backendUrl.replace(/\/$/, "");
  const sseUrl = `${cleanBackendUrl}/sse`;

  const mcpConfigJson = configMode === 'cloud'
    ? JSON.stringify({
        "mcpServers": {
          "contexthub": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/client-sse",
              sseUrl
            ],
            "env": {
              "X_API_KEY": apiKey || "ch_live_demo1234567890abcdef"
            }
          }
        }
      }, null, 2)
    : JSON.stringify({
        "mcpServers": {
          "contexthub": {
            "command": `${localPath}\\backend\\venv\\Scripts\\python.exe`,
            "args": [
              `${localPath}\\backend\\app\\mcp_server.py`
            ],
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '620px', padding: '28px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Key color="#00F2FE" size={24} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Project API Key & MCP Config</h2>
        </div>

        <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginBottom: '20px' }}>
          Use this API Key to authenticate your MCP agents or direct REST requests.
        </p>

        {/* API Key Display */}
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

        {/* Dynamic Config Switcher Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setConfigMode('cloud')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: configMode === 'cloud' ? '1px solid #00F2FE' : '1px solid transparent',
              background: configMode === 'cloud' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              color: configMode === 'cloud' ? '#00F2FE' : '#9CA3AF',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Server size={14} /> Cloud Deployment (SSE)
          </button>
          <button
            type="button"
            onClick={() => setConfigMode('local')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: configMode === 'local' ? '1px solid #00F2FE' : '1px solid transparent',
              background: configMode === 'local' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              color: configMode === 'local' ? '#00F2FE' : '#9CA3AF',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Code size={14} /> Local Dev (Stdio)
          </button>
        </div>

        {/* Dynamic Path/URL Inputs */}
        <div style={{ marginBottom: '18px' }}>
          {configMode === 'cloud' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>
                Cloud Backend Server API URL
              </label>
              <input
                type="text"
                className="glass-input"
                style={{ width: '100%' }}
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="e.g. https://contexthub-api.onrender.com"
              />
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>
                Local Project Repository Root Directory
              </label>
              <input
                type="text"
                className="glass-input"
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="e.g. C:\path\to\Context-Hub"
              />
            </div>
          )}
        </div>

        {/* JSON Code Snippet */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Configuration JSON (Copy to Cursor/Claude Desktop)
            </label>
            <button className="btn-secondary" onClick={handleCopyMcp} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
              {copiedMcp ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              {copiedMcp ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <pre style={{ background: '#0B0F17', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#A78BFA', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', overflowX: 'auto', maxHeight: '180px' }}>
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
