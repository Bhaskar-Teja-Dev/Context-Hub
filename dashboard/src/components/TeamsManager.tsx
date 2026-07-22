"use client";

import React, { useState, useEffect } from 'react';
import { Users, Plus, Link, Github, Copy, Check, UserPlus, Trash2, Crown, Shield } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  email: string;
  github_id?: string;
  role: string;
  joined_at?: string;
}

interface TeamsManagerProps {
  userToken: string;
  userId: string;
  projectId: string;
  apiBase: string;
}

export const TeamsManager: React.FC<TeamsManagerProps> = ({ userToken, userId, projectId, apiBase }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteGithub, setInviteGithub] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteMode, setInviteMode] = useState<'github' | 'email' | 'link'>('github');
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const authHeaders = { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (userToken) fetchTeams();
  }, [userToken]);

  useEffect(() => {
    if (selectedTeam) fetchMembers(selectedTeam.id);
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${apiBase}/api/v1/teams`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        if (data.length > 0 && !selectedTeam) setSelectedTeam(data[0]);
      }
    } catch {}
  };

  const fetchMembers = async (teamId: string) => {
    try {
      const res = await fetch(`${apiBase}/api/v1/teams/${teamId}/members`, { headers: authHeaders });
      if (res.ok) setMembers(await res.json());
    } catch {}
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/teams?name=${encodeURIComponent(newTeamName)}`, {
        method: 'POST', headers: authHeaders
      });
      if (res.ok) {
        const team = await res.json();
        setTeams([...teams, team]);
        setSelectedTeam(team);
        setShowCreateTeam(false);
        setNewTeamName('');
        setStatus('Team created successfully!');
      }
    } catch { setStatus('Failed to create team.'); }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!selectedTeam) return;
    const hasGithub = inviteMode === 'github' && inviteGithub.trim();
    const hasEmail = inviteMode === 'email' && inviteEmail.trim();
    const isLink = inviteMode === 'link';

    if (!hasGithub && !hasEmail && !isLink) {
      setStatus('Enter a GitHub ID or email to invite.');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (hasGithub) params.set('github_id', inviteGithub.trim());
      if (hasEmail) params.set('email', inviteEmail.trim());

      const res = await fetch(`${apiBase}/api/v1/teams/${selectedTeam.id}/invite?${params.toString()}`, {
        method: 'POST', headers: authHeaders
      });

      if (res.ok) {
        const inv = await res.json();
        const fullLink = `${window.location.origin}/invite/${inv.token}`;
        setPendingInvites([{ ...inv, full_link: fullLink }, ...pendingInvites]);

        if (hasGithub) {
          setStatus(`✓ Invitation queued for GitHub user @${inviteGithub}. They will auto-join when they log in.`);
          setInviteGithub('');
        } else if (hasEmail) {
          setStatus(`✓ Invite link created for ${inviteEmail}. Share the link below.`);
          setInviteEmail('');
        } else {
          setStatus('✓ Invite link generated. Copy and share it.');
        }
      }
    } catch { setStatus('Failed to send invite.'); }
    setLoading(false);
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const roleIcon = (role: string) => role === 'owner'
    ? <Crown size={12} color="#FBBF24" />
    : <Shield size={12} color="#60A5FA" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#00F2FE" /> Team Collaboration
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
              Create teams, invite members via GitHub ID (auto-joined at login) or shareable link.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreateTeam(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> New Team
          </button>
        </div>
      </div>

      {status && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px 16px', color: '#10B981', fontSize: '0.9rem' }}>
          {status}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>
        {/* Team List */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Your Teams</p>
          {teams.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: '#6B7280', textAlign: 'center', padding: '20px 0' }}>No teams yet</p>
          )}
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              style={{
                padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: selectedTeam?.id === team.id ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255,255,255,0.03)',
                color: selectedTeam?.id === team.id ? '#00F2FE' : '#E5E7EB',
                fontWeight: selectedTeam?.id === team.id ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Users size={14} /> {team.name}
            </button>
          ))}
        </div>

        {/* Team Detail */}
        {selectedTeam ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Invite Panel */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={16} color="#00F2FE" /> Invite to {selectedTeam.name}
              </h3>

              {/* Invite Mode Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                  { key: 'github', label: '⚡ GitHub ID', hint: 'Auto-joins at login' },
                  { key: 'email', label: '✉ Email', hint: 'Link + email' },
                  { key: 'link', label: '🔗 Link Only', hint: 'Anyone with link' }
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setInviteMode(m.key as any)}
                    title={m.hint}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                      border: inviteMode === m.key ? '1px solid #00F2FE' : '1px solid rgba(255,255,255,0.08)',
                      background: inviteMode === m.key ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255,255,255,0.03)',
                      color: inviteMode === m.key ? '#00F2FE' : '#9CA3AF'
                    }}
                  >{m.label}</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                {inviteMode === 'github' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>
                      GitHub Username — they auto-join when they sign in
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Github size={16} color="#9CA3AF" />
                      <input
                        type="text"
                        className="glass-input"
                        style={{ flex: 1 }}
                        placeholder="e.g. torvalds"
                        value={inviteGithub}
                        onChange={e => setInviteGithub(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {inviteMode === 'email' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>
                      Email — create invite link for this email
                    </label>
                    <input
                      type="email"
                      className="glass-input"
                      style={{ width: '100%' }}
                      placeholder="developer@company.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                )}

                {inviteMode === 'link' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>
                      Anyone with the link can join (expires in 7 days)
                    </label>
                  </div>
                )}

                <button
                  className="btn-primary"
                  onClick={handleInvite}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  {inviteMode === 'github' ? <><Github size={14} /> Send Invite</> :
                   inviteMode === 'email' ? <><UserPlus size={14} /> Create Link</> :
                   <><Link size={14} /> Generate Link</>}
                </button>
              </div>

              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Active Invites</p>
                  {pendingInvites.map(inv => (
                    <div key={inv.invite_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div>
                        {inv.github_id && <span style={{ fontSize: '0.85rem', color: '#E5E7EB' }}>@{inv.github_id}</span>}
                        {inv.email && <span style={{ fontSize: '0.85rem', color: '#E5E7EB' }}>{inv.email}</span>}
                        {!inv.github_id && !inv.email && <span style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Open invite link</span>}
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>Expires: {inv.expires_at?.split('T')[0]}</p>
                      </div>
                      <button
                        onClick={() => copyInviteLink(inv.full_link)}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#9CA3AF', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}
                      >
                        {copiedLink === inv.full_link ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        {copiedLink === inv.full_link ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
                Members ({members.length})
              </h3>
              {members.length === 0 && (
                <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>No members yet. Invite someone above!</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #00F2FE, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>
                        {m.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.9rem', color: '#E5E7EB', fontWeight: 600 }}>{m.email}</p>
                        {m.github_id && (
                          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Github size={11} /> @{m.github_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: m.role === 'owner' ? '#FBBF24' : '#60A5FA', background: m.role === 'owner' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(96, 165, 250, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                      {roleIcon(m.role)} {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <Users size={48} color="#374151" />
            <p style={{ color: '#6B7280' }}>Select or create a team to manage members</p>
            <button className="btn-primary" onClick={() => setShowCreateTeam(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Create your first team
            </button>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Create a New Team</h2>
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%', marginBottom: '16px' }}
              placeholder="Team name e.g. Frontend Squad"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setShowCreateTeam(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateTeam} disabled={loading || !newTeamName.trim()}>
                {loading ? 'Creating…' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
