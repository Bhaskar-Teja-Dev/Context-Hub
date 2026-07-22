"use client";

import React, { useState } from 'react';
import { Terminal, Code, Server, Check, Copy, Settings } from 'lucide-react';

interface IntegrationGuideProps {
  apiKey: string;
  projectId: string;
}

export const IntegrationGuide: React.FC<IntegrationGuideProps> = ({ apiKey, projectId }) => {
  const [activeTab, setActiveTab] = useState<'claude' | 'cursor' | 'windsurf' | 'chatgpt' | 'rest'>('claude');
  const [copied, setCopied] = useState(false);
  const [configMode, setConfigMode] = useState<'cloud' | 'local'>('cloud');
  const [localPath, setLocalPath] = useState('C:\\path\\to\\Context-Hub');
  const [backendUrl, setBackendUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  );

  const effectiveKey = apiKey || "ch_live_demo1234567890abcdef";
  const effectiveProject = projectId || "00000000-0000-0000-0000-000000000002";
  
  const cleanBackendUrl = backendUrl.replace(/\/$/, "");
  const sseUrl = `${cleanBackendUrl}/sse`;

  const getSnippet = () => {
    switch (activeTab) {
      case 'claude':
        if (configMode === 'cloud') {
          return `# Add to ~/.claude.json or project .claude.json
{
  "mcpServers": {
    "contexthub": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${sseUrl}",
        "--header",
        "X-API-Key: ${effectiveKey}"
      ]
    }
  }
}`;
        } else {
          return `# Add to ~/.claude.json or project .claude.json
{
  "mcpServers": {
    "contexthub": {
      "command": "${localPath.replace(/\\/g, '\\\\')}\\\\backend\\\\venv\\\\Scripts\\\\python.exe",
      "args": [
        "${localPath.replace(/\\/g, '\\\\')}\\\\backend\\\\app\\\\mcp_server.py"
      ],
      "env": {
        "CONTEXTHUB_API_KEY": "${effectiveKey}",
        "CONTEXTHUB_PROJECT_ID": "${effectiveProject}"
      }
    }
  }
}`;
        }

      case 'cursor':
        if (configMode === 'cloud') {
          return `// Cursor MCP Server Config (Features -> MCP Servers -> Add Server)
Name: ContextHub
Type: SSE
URL: ${sseUrl}
Headers:
  X-API-Key: ${effectiveKey}`;
        } else {
          return `// Cursor MCP Server Config (Features -> MCP Servers -> Add Server)
Name: ContextHub
Type: stdio
Command: ${localPath}\\backend\\venv\\Scripts\\python.exe
Arguments: ${localPath}\\backend\\app\\mcp_server.py
Environment Variables:
  CONTEXTHUB_API_KEY=${effectiveKey}
  CONTEXTHUB_PROJECT_ID=${effectiveProject}`;
        }

      case 'windsurf':
        if (configMode === 'cloud') {
          return `# Add to ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "contexthub": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${sseUrl}",
        "--header",
        "X-API-Key: ${effectiveKey}"
      ]
    }
  }
}`;
        } else {
          return `# Add to ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "contexthub": {
      "command": "${localPath.replace(/\\/g, '\\\\')}\\\\backend\\\\venv\\\\Scripts\\\\python.exe",
      "args": [
        "${localPath.replace(/\\/g, '\\\\')}\\\\backend\\\\app\\\\mcp_server.py"
      ],
      "env": {
        "CONTEXTHUB_API_KEY": "${effectiveKey}",
        "CONTEXTHUB_PROJECT_ID": "${effectiveProject}"
      }
    }
  }
}`;
        }

      case 'chatgpt':
        return `# ChatGPT Custom GPT Action Setup
OpenAPI Spec URL: ${cleanBackendUrl}/openapi.json
Authentication: API Key (Header)
Header Name: X-API-Key
Value: ${effectiveKey}`;

      case 'rest':
        return `# cURL REST Fallback Example
# 1. Fetch Full Context
curl -H "X-API-Key: ${effectiveKey}" ${cleanBackendUrl}/api/v1/context

# 2. Log Decision
curl -X POST ${cleanBackendUrl}/api/v1/decisions \\
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

      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Step 1: Select Environment */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#E5E7EB', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} color="#00F2FE" /> 1. Select Environment Mode
          </h3>
          <div style={{ display: 'flex', gap: '10px', maxWidth: '400px' }}>
            <button
              onClick={() => setConfigMode('cloud')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: configMode === 'cloud' ? '1px solid #00F2FE' : '1px solid rgba(255,255,255,0.08)',
                background: configMode === 'cloud' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(17, 24, 39, 0.4)',
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
              onClick={() => setConfigMode('local')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: configMode === 'local' ? '1px solid #00F2FE' : '1px solid rgba(255,255,255,0.08)',
                background: configMode === 'local' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(17, 24, 39, 0.4)',
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
        </div>

        {/* Step 2: Dynamic Path / Endpoint Settings */}
        <div>
          {configMode === 'cloud' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Backend Server Base URL</label>
              <input
                type="text"
                className="glass-input"
                style={{ width: '100%', maxWidth: '500px' }}
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="e.g. https://contexthub-api.onrender.com"
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Local Git Repository Path</label>
              <input
                type="text"
                className="glass-input"
                style={{ width: '100%', maxWidth: '500px', fontFamily: 'var(--font-mono)' }}
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="e.g. C:\Users\name\Desktop\Context-Hub"
              />
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }} />

        {/* Step 3: Choose Client Agent */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#E5E7EB', marginBottom: '12px' }}>
            2. Choose Agent client to copy configuration snippet
          </h3>
          
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            {['claude', 'cursor', 'windsurf', 'chatgpt', 'rest'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{
                  background: activeTab === tab ? 'rgba(0, 242, 254, 0.15)' : 'none',
                  border: activeTab === tab ? '1px solid #00F2FE' : 'none',
                  color: activeTab === tab ? '#00F2FE' : '#9CA3AF',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'claude' ? 'Claude Code' : tab === 'chatgpt' ? 'ChatGPT' : tab === 'rest' ? 'REST API' : tab}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={handleCopy}
              className="btn-secondary"
              style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', fontSize: '0.8rem', zIndex: 10 }}
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
    </div>
  );
};
