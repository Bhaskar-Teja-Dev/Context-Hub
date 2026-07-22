"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { ContextExplorer } from '@/components/ContextExplorer';
import { DecisionTimeline } from '@/components/DecisionTimeline';
import { SessionHistory } from '@/components/SessionHistory';
import { IntegrationGuide } from '@/components/IntegrationGuide';
import { BookOpen, GitCommit, Bot, Terminal, Plus, Sparkles, CheckCircle, Database } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'context' | 'decisions' | 'sessions' | 'integration'>('context');
  const [currentProject, setCurrentProject] = useState<any>({
    id: "00000000-0000-0000-0000-000000000002",
    name: "Demo ContextHub Project"
  });
  const [apiKey, setApiKey] = useState<string>("ch_live_demo1234567890abcdef");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Initial demo context state
  const [documents, setDocuments] = useState<any[]>([
    {
      id: "1",
      category: "architecture",
      title: "ContextHub Architecture Overview",
      body: "ContextHub provides a shared vector memory layer for AI agents. FastAPI handles REST & MCP (stdio/SSE), Supabase pgvector handles 384-dim semantic embeddings.",
      updated_at: new Date().toISOString()
    },
    {
      id: "2",
      category: "schema",
      title: "Database Schema & Graph Edges",
      body: "Core tables: accounts, projects, api_keys, documents, decisions, features, feature_edges, tasks, sessions, agent_notes. Vector HNSW index on documents & decisions.",
      updated_at: new Date().toISOString()
    },
    {
      id: "3",
      category: "constraint",
      title: "$0/Month Infra Constraints",
      body: "Render free web service (sleeps after 15m idle), Supabase free tier (pauses after 7 days idle), sentence-transformers (all-MiniLM-L6-v2) CPU model running in-process.",
      updated_at: new Date().toISOString()
    }
  ]);

  const [decisions, setDecisions] = useState<any[]>([
    {
      id: "d1",
      title: "Use Supabase PostgreSQL with pgvector",
      reason: "Provides Postgres, vector similarity search, and realtime change feeds in a single $0 free tier service.",
      alternatives: "Pinecone, ChromaDB, Self-hosted Postgres",
      impact: "Eliminates separate vector database setup and keeps costs at $0.",
      decided_at: new Date().toISOString()
    },
    {
      id: "d2",
      title: "In-Process Local Sentence-Transformers Embedding Model",
      reason: "Avoids third-party embedding API costs (OpenAI/Cohere) to guarantee a zero-cost free tier.",
      alternatives: "OpenAI text-embedding-3-small API",
      impact: "Requires ~80MB memory footprint and CPU vector calculation on Render instance.",
      decided_at: new Date().toISOString()
    }
  ]);

  const [sessions, setSessions] = useState<any[]>([
    {
      id: "s1",
      agent_name: "Claude Code",
      summary: "Created initial Supabase database schema with pgvector extensions, HNSW vector similarity search functions, and FastAPI backend structure.",
      added: ["supabase/schema.sql", "backend/app/main.py", "backend/app/mcp_server.py"],
      changed: ["contexthub-prd.md"],
      removed: [],
      known_issues: ["Next.js dashboard UI polish"],
      created_at: new Date().toISOString()
    }
  ]);

  // Handle Project Creation
  const [newProjName, setNewProjName] = useState('');
  const [newProjEmail, setNewProjEmail] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjEmail.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjName, email: newProjEmail })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(data.project);
        setApiKey(data.api_key);
        setShowCreateModal(false);
        setShowKeyModal(true);
      } else {
        // Fallback local key generation if API server offline
        const localKey = `ch_live_${Math.random().toString(36).substring(2, 18)}`;
        const localProj = { id: `proj_${Date.now()}`, name: newProjName };
        setCurrentProject(localProj);
        setApiKey(localKey);
        setShowCreateModal(false);
        setShowKeyModal(true);
      }
    } catch (err) {
      const localKey = `ch_live_${Math.random().toString(36).substring(2, 18)}`;
      const localProj = { id: `proj_${Date.now()}`, name: newProjName };
      setCurrentProject(localProj);
      setApiKey(localKey);
      setShowCreateModal(false);
      setShowKeyModal(true);
    }
  };

  const handleSearchContext = async (query: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/context/search?query=${encodeURIComponent(query)}`, {
        headers: { 'X-API-Key': apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        // Local simulation filtering
        const filtered = documents.map(d => ({
          ...d,
          similarity: d.title.toLowerCase().includes(query.toLowerCase()) || d.body.toLowerCase().includes(query.toLowerCase()) ? 0.89 : 0.25
        }));
        setDocuments(filtered);
      }
    } catch {
      const filtered = documents.map(d => ({
        ...d,
        similarity: d.title.toLowerCase().includes(query.toLowerCase()) || d.body.toLowerCase().includes(query.toLowerCase()) ? 0.89 : 0.25
      }));
      setDocuments(filtered);
    }
  };

  const handleAddDocument = (newDoc: { category: string; title: string; body: string }) => {
    const createdDoc = {
      id: String(Date.now()),
      ...newDoc,
      updated_at: new Date().toISOString()
    };
    setDocuments([createdDoc, ...documents]);
  };

  const handleAddDecision = (newDec: { title: string; reason: string; alternatives?: string; impact?: string }) => {
    const createdDec = {
      id: String(Date.now()),
      ...newDec,
      decided_at: new Date().toISOString()
    };
    setDecisions([createdDec, ...decisions]);
  };

  return (
    <div>
      <Navbar
        currentProject={currentProject}
        onOpenCreateModal={() => setShowCreateModal(true)}
        onOpenKeyModal={() => setShowKeyModal(true)}
      />

      {/* Main Metric Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.15)', borderRadius: '12px' }}>
            <BookOpen size={24} color="#00F2FE" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Context Documents</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFF' }}>{documents.length}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(124, 58, 237, 0.15)', borderRadius: '12px' }}>
            <GitCommit size={24} color="#A78BFA" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Decisions Logged</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFF' }}>{decisions.length}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px' }}>
            <Bot size={24} color="#10B981" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Agent Sessions</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFF' }}>{sessions.length}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '12px' }}>
            <Database size={24} color="#FBBF24" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Vector Index</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10B981' }}>pgvector (HNSW)</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('context')}
          style={{
            background: activeTab === 'context' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)' : 'transparent',
            border: activeTab === 'context' ? '1px solid #00F2FE' : '1px solid transparent',
            color: activeTab === 'context' ? '#FFF' : '#9CA3AF',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <BookOpen size={18} color={activeTab === 'context' ? '#00F2FE' : '#9CA3AF'} /> Project Context
        </button>

        <button
          onClick={() => setActiveTab('decisions')}
          style={{
            background: activeTab === 'decisions' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)' : 'transparent',
            border: activeTab === 'decisions' ? '1px solid #00F2FE' : '1px solid transparent',
            color: activeTab === 'decisions' ? '#FFF' : '#9CA3AF',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <GitCommit size={18} color={activeTab === 'decisions' ? '#00F2FE' : '#9CA3AF'} /> Decision Log
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            background: activeTab === 'sessions' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)' : 'transparent',
            border: activeTab === 'sessions' ? '1px solid #00F2FE' : '1px solid transparent',
            color: activeTab === 'sessions' ? '#FFF' : '#9CA3AF',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Bot size={18} color={activeTab === 'sessions' ? '#00F2FE' : '#9CA3AF'} /> Session Audit Trail
        </button>

        <button
          onClick={() => setActiveTab('integration')}
          style={{
            background: activeTab === 'integration' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)' : 'transparent',
            border: activeTab === 'integration' ? '1px solid #00F2FE' : '1px solid transparent',
            color: activeTab === 'integration' ? '#FFF' : '#9CA3AF',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Terminal size={18} color={activeTab === 'integration' ? '#00F2FE' : '#9CA3AF'} /> Agent Setup Guide
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'context' && (
        <ContextExplorer
          documents={documents}
          onSearch={handleSearchContext}
          onAddDocument={handleAddDocument}
        />
      )}

      {activeTab === 'decisions' && (
        <DecisionTimeline
          decisions={decisions}
          onAddDecision={handleAddDecision}
        />
      )}

      {activeTab === 'sessions' && (
        <SessionHistory sessions={sessions} />
      )}

      {activeTab === 'integration' && (
        <IntegrationGuide apiKey={apiKey} projectId={currentProject.id} />
      )}

      {/* Modals */}
      <ApiKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        apiKey={apiKey}
        projectId={currentProject.id}
      />

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Create New ContextHub Project</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Project Name</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Mobile App Redesign"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Account Email</label>
                <input
                  type="email"
                  required
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="developer@company.com"
                  value={newProjEmail}
                  onChange={(e) => setNewProjEmail(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
