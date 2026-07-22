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
import { BookOpen, GitCommit, Bot, Terminal, Plus, Database, Users, LogIn, Loader, FolderKanban } from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, "");

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'context' | 'decisions' | 'sessions' | 'integration' | 'teams'>('context');
  
  // Projects State
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);

  // Context Data State (initialized to empty arrays to prevent leaking data between users/projects)
  const [documents, setDocuments] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  
  const [newProjName, setNewProjName] = useState('');

  // 1. Manage User Session and Auth Listener
  useEffect(() => {
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (session) {
        setUser(session.user);
        setUserToken(session.access_token);
        // Auto-join pending invites on sign in
        try {
          await fetch(`${API_BASE}/api/v1/teams/auto-join`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
        } catch {}
      } else {
        setUser(null);
        setUserToken('');
        setProjects([]);
        setCurrentProject(null);
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

  // 2. Fetch projects whenever userToken changes
  useEffect(() => {
    if (!userToken) return;
    fetchProjects();
  }, [userToken]);

  // 3. Fetch project details (context, decisions, sessions) whenever currentProject changes
  useEffect(() => {
    if (!userToken || !currentProject) {
      setDocuments([]);
      setDecisions([]);
      setSessions([]);
      return;
    }
    fetchProjectData();
  }, [currentProject, userToken]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/projects`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          // Keep selection or default to first
          const found = data.find((p: any) => p.id === currentProject?.id);
          setCurrentProject(found || data[0]);
        }
      }
    } catch {}
  };

  const fetchProjectData = async () => {
    try {
      // Fetch full context (documents, decisions) using User Token + X-Project-Id Header
      const contextRes = await fetch(`${API_BASE}/api/v1/context`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'X-Project-Id': currentProject.id
        }
      });
      if (contextRes.ok) {
        const contextData = await contextRes.json();
        setDocuments(contextData.documents || []);
        setDecisions(contextData.decisions || []);
      }

      // Fetch sessions list
      const sessionsRes = await fetch(`${API_BASE}/api/v1/sessions`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'X-Project-Id': currentProject.id
        }
      });
      if (sessionsRes.ok) {
        setSessions(await sessionsRes.json());
      }
    } catch {}
  };

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

  // Create Project handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !userToken) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: newProjName,
          email: user.email
        })
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.api_key); // Save raw key for display once
        setCurrentProject(data.project);
        setProjects([data.project, ...projects]);
        setShowCreateModal(false);
        setNewProjName('');
        setShowKeyModal(true); // Pop open the Key modal immediately so they can copy it
      }
    } catch {}
  };

  const handleSearchContext = async (query: string) => {
    if (!currentProject) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/context/search?query=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'X-Project-Id': currentProject.id
        }
      });
      if (res.ok) setDocuments(await res.json());
    } catch {}
  };

  const handleAddDocument = async (newDoc: { category: string; title: string; body: string }) => {
    if (!currentProject) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
          'X-Project-Id': currentProject.id
        },
        body: JSON.stringify(newDoc)
      });
      if (res.ok) {
        const added = await res.json();
        setDocuments([added, ...documents]);
      }
    } catch {}
  };

  const handleAddDecision = async (newDec: { title: string; reason: string; alternatives?: string; impact?: string }) => {
    if (!currentProject) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
          'X-Project-Id': currentProject.id
        },
        body: JSON.stringify(newDec)
      });
      if (res.ok) {
        const added = await res.json();
        setDecisions([added, ...decisions]);
      }
    } catch {}
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={40} color="#00F2FE" />
      </div>
    );
  }

  // --- Login Screen ---
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
        onOpenKeyModal={() => {
          if (currentProject) {
            setShowKeyModal(true);
          }
        }}
        user={user}
        onLogout={handleLogout}
      />

      {projects.length === 0 ? (
        // Empty State: Create First Project
        <div className="glass-panel" style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
          <FolderKanban size={48} color="#4B5563" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>No Projects Found</h2>
          <p style={{ color: '#9CA3AF', fontSize: '0.9rem', maxWidth: '400px' }}>
            Get started by creating your first ContextHub project. Projects store your custom context documents and agent logs.
          </p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <>
          {/* Project Selection Banner */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', padding: '0 10px', textTransform: 'uppercase', fontWeight: 700 }}>Select Project:</span>
            {projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => setCurrentProject(proj)}
                style={{
                  background: currentProject?.id === proj.id ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: currentProject?.id === proj.id ? '1px solid #00F2FE' : '1px solid transparent',
                  color: currentProject?.id === proj.id ? '#00F2FE' : '#9CA3AF',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: currentProject?.id === proj.id ? 700 : 400
                }}
              >
                {proj.name}
              </button>
            ))}
          </div>

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
          {activeTab === 'teams' && <TeamsManager userToken={userToken} userId={user?.id || ''} projectId={currentProject?.id} apiBase={API_BASE} />}
          {activeTab === 'integration' && <IntegrationGuide apiKey={apiKey || 'Generate API Key above'} projectId={currentProject?.id} />}
        </>
      )}

      {currentProject && (
        <ApiKeyModal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} apiKey={apiKey} projectId={currentProject.id} />
      )}

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Create New ContextHub Project</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Project Name</label>
                <input type="text" required className="glass-input" style={{ width: '100%' }} placeholder="e.g. Mobile App Redesign" value={newProjName} onChange={e => setNewProjName(e.target.value)} />
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
