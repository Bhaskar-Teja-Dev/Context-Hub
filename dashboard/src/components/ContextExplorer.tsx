"use client";

import React, { useState } from 'react';
import { Search, FileText, Plus, Sparkles, Filter, Database, BookOpen } from 'lucide-react';

interface Document {
  id: str;
  category: str;
  title: str;
  body: str;
  updated_at: str;
  similarity?: number;
}

interface ContextExplorerProps {
  documents: Document[];
  onSearch: (query: string) => void;
  onAddDocument: (doc: { category: string; title: string; body: string }) => void;
}

export const ContextExplorer: React.FC<ContextExplorerProps> = ({
  documents,
  onSearch,
  onAddDocument
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState('architecture');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const categories = [
    { id: 'all', label: 'All Documents' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'requirement', label: 'Requirements' },
    { id: 'constraint', label: 'Constraints' },
    { id: 'api', label: 'API Specs' },
    { id: 'schema', label: 'Schemas' },
    { id: 'coding_standard', label: 'Standards' }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    onAddDocument({
      category: newCategory,
      title: newTitle.trim(),
      body: newBody.trim()
    });
    setNewTitle('');
    setNewBody('');
    setShowAddModal(false);
  };

  const filteredDocs = activeCategory === 'all'
    ? documents
    : documents.filter(d => d.category === activeCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search & Action Bar */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%', paddingLeft: '38px' }}
              placeholder="Semantic vector search across project memory (e.g. 'How is auth handled?')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            <Sparkles size={16} /> Search
          </button>
        </form>

        <button className="btn-secondary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Context Doc
        </button>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: activeCategory === cat.id ? '1px solid #00F2FE' : '1px solid rgba(255,255,255,0.1)',
              background: activeCategory === cat.id ? 'rgba(0, 242, 254, 0.15)' : 'rgba(17, 24, 39, 0.6)',
              color: activeCategory === cat.id ? '#00F2FE' : '#9CA3AF',
              fontWeight: 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredDocs.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
            <BookOpen size={40} color="#6B7280" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#E5E7EB' }}>No context documents found</p>
            <p style={{ fontSize: '0.85rem' }}>Add context or connect an MCP agent to write facts automatically.</p>
          </div>
        ) : (
          filteredDocs.map(doc => (
            <div key={doc.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className={`badge ${doc.category === 'architecture' ? 'badge-cyan' : doc.category === 'api' ? 'badge-purple' : 'badge-emerald'}`}>
                    {doc.category}
                  </span>
                  {doc.similarity !== undefined && (
                    <span style={{ fontSize: '0.75rem', color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                      {(doc.similarity * 100).toFixed(1)}% match
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: '#FFF' }}>{doc.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#9CA3AF', lineHeight: '1.5', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
                  {doc.body}
                </p>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: '#6B7280' }}>
                Updated {doc.updated_at ? doc.updated_at.split('T')[0] : ''}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Add Project Context Document</h2>
            <form onSubmit={handleCreateDoc} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Category</label>
                <select
                  className="glass-input"
                  style={{ width: '100%' }}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="architecture">Architecture</option>
                  <option value="requirement">Requirement</option>
                  <option value="constraint">Constraint</option>
                  <option value="api">API Specification</option>
                  <option value="schema">Schema Definition</option>
                  <option value="coding_standard">Coding Standard</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Title</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Supabase pgvector Setup"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '6px' }}>Content Body</label>
                <textarea
                  required
                  rows={5}
                  className="glass-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Describe the architecture, constraints, or schemas in detail..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
