"use client";

import React, { useState } from 'react';
import { Terminal, Code, Cpu, MessageSquare, ExternalLink, Check, Copy } from 'lucide-react';

interface IntegrationGuideProps {
  apiKey: string;
  projectId: string;
}

export const IntegrationGuide: React.FC<IntegrationGuideProps> = ({ apiKey, projectId }) => {
  const [activeTab, setActiveTab] = useState<'claude' | 'cursor' | 'windsurf' | 'chatgpt' | 'rest'>('claude');
  const [copied, setCopied] = useState(false);

  const effectiveKey = apiKey || "ch_live_demo1234567890abcdef";
  const effectiveProject = projectId || "00000000-0000-0000-0000-000000000002";

  const getSnippet = () => {
    switch (activeTab) {
      case 'claude':
        return `# Add to ~/.claude.json or project .claude.json
{
  "mcpServers": {
    "contexthub": {
      "command": "c:\\\\Users\\\\bhask\\\\OneDrive\\\\Desktop\\\\Context-Hub\\\\backend\\\\venv\\\\Scripts\\\\python.exe",
      "args": ["c:\\\\Users\\\\bhask\\\\OneDrive\\\\Desktop\\\\Context-Hub\\\\backend\\\\app\\\\mcp_server.py"],
      "env": {
        "CONTEXTHUB_API_KEY": "${effectiveKey}",
        "CONTEXTHUB_PROJECT_ID": "${effectiveProject}"
      }
    }
  }
}`;
      case 'cursor':
        return `// Cursor MCP Server Config (Features -> MCP Servers -> Add Server)
Name: ContextHub
Type: stdio
Command: c:\\Users\\bhask\\OneDrive\\Desktop\\Context-Hub\\backend\\venv\\Scripts\\python.exe
Arguments: c:\\Users\\bhask\\OneDrive\\Desktop\\Context-Hub\\backend\\app\\mcp_server.py
Environment Variables:
  CONTEXTHUB_API_KEY=${effectiveKey}
  CONTEXTHUB_PROJECT_ID=${effectiveProject}`;

      case 'windsurf':
        return `# Add to ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "contexthub": {
      "command": "c:\\\\Users\\\\bhask\\\\OneDrive\\\\Desktop\\\\Context-Hub\\\\backend\\\\venv\\\\Scripts\\\\python.exe",
      "args": ["c:\\\\Users\\\\bhask\\\\OneDrive\\\\Desktop\\\\Context-Hub\\\\backend\\\\app\\\\mcp_server.py"],
      "env": {
        "CONTEXTHUB_API_KEY": "${effectiveKey}",
        "CONTEXTHUB_PROJECT_ID": "${effectiveProject}"
      }
    }
  }
}`;

      case 'chatgpt':
        return `# ChatGPT Custom GPT Action Setup
URL: https://contexthub-api.onrender.com/openapi.json
Authentication: API Key (Header)
Header Name: X-API-Key
Value: ${effectiveKey}`;

      case 'rest':
        return `# cURL REST Fallback Example
# 1. Fetch Full Context
curl -H "X-API-Key: ${effectiveKey}" https://contexthub-api.onrender.com/api/v1/context

# 2. Log Decision
curl -X POST https://contexthub-api.onrender.com/api/v1/decisions \\
  -H "X-API-Key: ${effectiveKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Adopt Next.js", "reason": "Server components and zero config"}'`;

      default:
        return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>
          Connect Any AI Agent
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
          ContextHub works out of the box with all MCP-compatible tools and any agent via REST.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('claude')}
            style={{
              background: activeTab === 'claude' ? 'rgba(0, 242, 254, 0.15)' : 'none',
              border: activeTab === 'claude' ? '1px solid #00F2FE' : 'none',
              color: activeTab === 'claude' ? '#00F2FE' : '#9CA3AF',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Claude Code
          </button>
          <button
            onClick={() => setActiveTab('cursor')}
            style={{
              background: activeTab === 'cursor' ? 'rgba(0, 242, 254, 0.15)' : 'none',
              border: activeTab === 'cursor' ? '1px solid #00F2FE' : 'none',
              color: activeTab === 'cursor' ? '#00F2FE' : '#9CA3AF',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cursor
          </button>
          <button
            onClick={() => setActiveTab('windsurf')}
            style={{
              background: activeTab === 'windsurf' ? 'rgba(0, 242, 254, 0.15)' : 'none',
              border: activeTab === 'windsurf' ? '1px solid #00F2FE' : 'none',
              color: activeTab === 'windsurf' ? '#00F2FE' : '#9CA3AF',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Windsurf
          </button>
          <button
            onClick={() => setActiveTab('chatgpt')}
            style={{
              background: activeTab === 'chatgpt' ? 'rgba(0, 242, 254, 0.15)' : 'none',
              border: activeTab === 'chatgpt' ? '1px solid #00F2FE' : 'none',
              color: activeTab === 'chatgpt' ? '#00F2FE' : '#9CA3AF',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ChatGPT (Custom GPT)
          </button>
          <button
            onClick={() => setActiveTab('rest')}
            style={{
              background: activeTab === 'rest' ? 'rgba(0, 242, 254, 0.15)' : 'none',
              border: activeTab === 'rest' ? '1px solid #00F2FE' : 'none',
              color: activeTab === 'rest' ? '#00F2FE' : '#9CA3AF',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            REST API
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={handleCopy}
            className="btn-secondary"
            style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', fontSize: '0.8rem' }}
          >
            {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>

          <pre style={{ background: '#0B0F17', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#A78BFA', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.6', overflowX: 'auto' }}>
            {getSnippet()}
          </pre>
        </div>
      </div>
    </div>
  );
};
