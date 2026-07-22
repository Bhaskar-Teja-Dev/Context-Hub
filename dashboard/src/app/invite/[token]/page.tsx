"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { Users, CheckCircle, XCircle, Loader } from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, "");

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [status, setStatus] = useState<'loading' | 'signing-in' | 'claiming' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    handleClaim();
  }, [token]);

  const handleClaim = async () => {
    const supabase = getSupabase();
    setStatus('signing-in');
    setMessage('Checking your session…');

    const { data: { session } }: any = await supabase.auth.getSession();

    if (!session) {
      // Redirect to login, come back after
      const redirectTo = `${window.location.origin}/invite/${token}`;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      return;
    }

    // Session exists — claim the invite
    setStatus('claiming');
    setMessage('Joining the team…');

    try {
      const res = await fetch(`${API_BASE}/api/v1/teams/invite/claim?token=${encodeURIComponent(token!)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setStatus('success');
        setMessage(`You've successfully joined the team!`);
      } else {
        const err = await res.json();
        setStatus('error');
        setMessage(err.detail || 'Invite link is invalid or expired.');
      }
    } catch (e) {
      setStatus('error');
      setMessage('Failed to contact server. Please try again.');
    }
  };

  const iconMap = {
    loading: <Loader size={48} color="#00F2FE" className="animate-spin" />,
    'signing-in': <Loader size={48} color="#00F2FE" />,
    claiming: <Loader size={48} color="#A78BFA" />,
    success: <CheckCircle size={48} color="#10B981" />,
    error: <XCircle size={48} color="#EF4444" />
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '40px', textAlign: 'center' }}>
        <div style={{ marginBottom: '20px' }}>{iconMap[status]}</div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px' }}>
          {status === 'success' ? '🎉 Team Joined!' :
           status === 'error' ? 'Invite Invalid' :
           'Team Invitation'}
        </h1>

        <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>{message}</p>

        {status === 'success' && (
          <a href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} /> Go to Dashboard
          </a>
        )}

        {status === 'error' && (
          <a href="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Back to Dashboard
          </a>
        )}
      </div>
    </div>
  );
}
