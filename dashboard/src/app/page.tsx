"use client";

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { ContextExplorer } from '@/components/ContextExplorer';
import { DecisionTimeline } from '@/components/DecisionTimeline';
import { SessionHistory } from '@/components/SessionHistory';
import { IntegrationGuide } from '@/components/IntegrationGuide';
import { TeamsManager } from '@/components/TeamsManager';
import { BookOpen, GitCommit, Bot, Terminal, Plus, Database, Users, LogIn, Loader } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'context' | 'decisions' | 'sessions' | 'integration' | 'teams'>('context');
  const [currentProject, setCurrentProject] = useState<any>({
    id: "00000000-0000-0000-0000-000000000002",
    name: "Demo ContextHub Project"
  });
  const [apiKey, setApiKey] = useState<string>("ch_live_demo1234567890abcdef");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (session) {
        setUser(session.user);
        setUserToken(session.access_token);
        // Auto-join any pending GitHub invites
        try {
          await fetch(`${API_BASE}/api/v1/teams/auto-join`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
        } catch {}
      } else {
        setUser(null);
        setUserToken('');
      }
      setAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        setUser(session.user);
        setUserToken(session.access_token);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const supabase = getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  // --- Context/Data State ---
  const [documents, setDocuments] = useState<any[]>([
    { id: "1", category: "architecture", title: "ContextHub Architecture Overview", body: "ContextHub provides a shared vector memory layer for AI agents. FastAPI handles REST & MCP (stdio/SSE), Supabase pgvector handles 384-dim semantic embeddings.", updated_at: new Date().toISOString() },
    { id: "2", category: "schema", title: "Database Schema & Graph Edges", body: "Core tables: accounts, projects, api_keys, documents, decisions, features, feature_edges, tasks, sessions, agent_notes, teams, team_members, invitations.", updated_at: new Date().toISOString() },
    { id: "3", category: "constraint", title: "$0/Month Infra Constraints", body: "Render free web service (sleeps after 15m idle), Supabase free tier (pauses after 7 days idle), fastembed ONNX all-MiniLM-L6-v2 CPU model running in-process.", updated_at: new Date().toISOString() }
  ]);
  const [decisions, setDecisions] = useState<any[]>([
    { id: "d1", title: "Use Supabase PostgreSQL with pgvector", reason: "Provides Postgres, vector similarity search, and realtime change feeds in a single $0 free tier service.", alternatives: "Pinecone, ChromaDB, Self-hosted Postgres", impact: "Eliminates separate vector database setup and keeps costs at $0.", decided_at: new Date().toISOString() },
    { id: "d2", title: "fastembed (ONNX) over sentence-transformers+PyTorch", reason: "PyTorch alone exceeds Render free tier 512MB RAM. fastembed uses ONNX runtime (~80MB total) with identical vector quality.", alternatives: "OpenAI text-embedding-3-small API", impact: "Stays within Render free tier limits.", decided_at: new Date().toISOString() }
  ]);
  const [sessions, setSessions] = useState<any[]>([
    { id: "s1", agent_name: "Claude Code", summary: "Created initial Supabase schema, FastAPI backend, fastembed embedding, Google OAuth, and teams collaboration system.", added: ["supabase/migrations/20260722000000_teams.sql", "backend/app/routers/teams.py", "dashboard/src/components/TeamsManager.tsx"], changed: ["backend/app/auth.py", "backend/app/main.py"], removed: [], known_issues: [], created_at: new Date().toISOString() }
  ]);
  const [newProjName, setNewProjName] = useState('');
  const [newProjEmail, setNewProjEmail] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjEmail.trim()) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userToken) headers['Authorization'] = `Bearer ${userToken}`;
      const res = await fetch(`${API_BASE}/api/v1/projects`, { method: 'POST', headers, body: JSON.stringify({ name: newProjName, email: newProjEmail }) });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(data.project);
        setApiKey(data.api_key);
      } else {
        const localKey = `ch_live_${Math.random().toString(36).substring(2, 18)}`;
        setCurrentProject({ id: `proj_${Date.now()}`, name: newProjName });
        setApiKey(localKey);
      }
    } catch {
      const localKey = `ch_live_${Math.random().toString(36).substring(2, 18)}`;
      setCurrentProject({ id: `proj_${Date.now()}`, name: newProjName });
      setApiKey(localKey);
    }
    setShowCreateModal(false);
    setShowKeyModal(true);
  };

  const handleSearchContext = async (query: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/context/search?query=${encodeURIComponent(query)}`, { headers: { 'X-API-Key': apiKey } });
      if (res.ok) setDocuments(await res.json());
    } catch {}
  };

  const handleAddDocument = (newDoc: { category: string; title: string; body: string }) => {
    setDocuments([{ id: String(Date.now()), ...newDoc, updated_at: new Date().toISOString() }, ...documents]);
  };

  const handleAddDecision = (newDec: { title: string; reason: string; alternatives?: string; impact?: string }) => {
    setDecisions([{ id: String(Date.now()), ...newDec, decided_at: new Date().toISOString() }, ...decisions]);
  };

  // --- Loading / Login Screen ---
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={40} color="#00F2FE" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '48px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #00F2FE, #A78BFA)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Database size={32} color="#FFF" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>ContextHub</h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.95rem', marginBottom: '32px', lineHeight: '1.6' }}>
            Shared AI project memory for your whole team.<br />Sign in to manage projects and collaborate.
          </p>
          <button
            onClick={handleGoogleLogin}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', fontSize: '1rem', borderRadius: '12px' }}
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
          <p style={{ marginTop: '20px', fontSize: '0.78rem', color: '#6B7280' }}>
            OAuth powered by Supabase Auth
          </p>
        </div>
      </div>
    );
  }

  // --- Authenticated Dashboard ---
  const TABS = [
    { key: 'context', icon: BookOpen, label: 'Project Context' },
    { key: 'decisions', icon: GitCommit, label: 'Decision Log' },
    { key: 'sessions', icon: Bot, label: 'Session Audit' },
    { key: 'teams', icon: Users, label: 'Teams' },
    { key: 'integration', icon: Terminal, label: 'Agent Setup' },
  ] as const;

  return (
    <div>
      <Navbar
        currentProject={currentProject}
        onOpenCreateModal={() => setShowCreateModal(true)}
        onOpenKeyModal={() => setShowKeyModal(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { icon: BookOpen, color: '#00F2FE', bg: 'rgba(0, 242, 254, 0.15)', label: 'Context Documents', value: documents.length },
          { icon: GitCommit, color: '#A78BFA', bg: 'rgba(124, 58, 237, 0.15)', label: 'Decisions Logged', value: decisions.length },
          { icon: Bot, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Agent Sessions', value: sessions.length },
          { icon: Database, color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.15)', label: 'Vector Index', value: 'pgvector (HNSW)', isText: true },
        ].map(({ icon: Icon, color, bg, label, value, isText }) => (
          <div key={label} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: bg, borderRadius: '12px' }}>
              <Icon size={24} color={color} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
              <h2 style={{ fontSize: isText ? '1.1rem' : '1.6rem', fontWeight: 800, color: isText ? '#10B981' : '#FFF' }}>{value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', overflowX: 'auto' }}>
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: activeTab === key ? 'linear-gradient(135deg, rgba(0,242,254,0.2),rgba(124,58,237,0.2))' : 'transparent',
              border: activeTab === key ? '1px solid #00F2FE' : '1px solid transparent',
              color: activeTab === key ? '#FFF' : '#9CA3AF',
              padding: '10px 20px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
            }}
          >
            <Icon size={18} color={activeTab === key ? '#00F2FE' : '#9CA3AF'} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'context' && <ContextExplorer documents={documents} onSearch={handleSearchContext} onAddDocument={handleAddDocument} />}
      {activeTab === 'decisions' && <DecisionTimeline decisions={decisions} onAddDecision={handleAddDecision} />}
      {activeTab === 'sessions' && <SessionHistory sessions={sessions} />}
      {activeTab === 'teams' && <TeamsManager userToken={userToken} userId={user?.id || ''} projectId={currentProject.id} apiBase={API_BASE} />}
      {activeTab === 'integration' && <IntegrationGuide apiKey={apiKey} projectId={currentProject.id} />}

      <ApiKeyModal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} apiKey={apiKey} projectId={currentProject.id} />

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Create New ContextHub Project</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Project Name</label>
                <input type="text" required className="glass-input" style={{ width: '100%' }} placeholder="e.g. Mobile App Redesign" value={newProjName} onChange={e => setNewProjName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Account Email</label>
                <input type="email" required className="glass-input" style={{ width: '100%' }} placeholder="developer@company.com" value={newProjEmail} onChange={e => setNewProjEmail(e.target.value)} />
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
