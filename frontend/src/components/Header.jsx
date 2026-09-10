import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Sparkles } from 'lucide-react';

export default function Header({ showBack = false, title = 'AR Studio' }) {
  return (
    <header className="home-header">
      <Link to="/" className="logo-badge" style={{ textDecoration: 'none' }}>
        <div className="logo-icon-wrapper">
          <Layers size={24} />
        </div>
        <div>
          <span className="brand-name text-gradient">AR Studio</span>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Realidad Aumentada
          </span>
        </div>
      </Link>

      <div className="badge-pill">
        <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
        v1.0
      </div>
    </header>
  );
}
