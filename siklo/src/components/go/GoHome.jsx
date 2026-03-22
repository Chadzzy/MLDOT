import { useState } from 'react'
import { RECENT_DESTINATIONS, SEARCH_SUGGESTIONS } from '../../data/mockDestinations'

export default function GoHome({ onSelectDestination }) {
  const [query, setQuery] = useState('')
  const [lang, setLang] = useState('cantonese')

  const showSuggestions = query.length > 0
  const filteredSuggestions = showSuggestions
    ? SEARCH_SUGGESTIONS.filter(d =>
        d.english.toLowerCase().includes(query.toLowerCase()) ||
        d.cantonese.includes(query)
      )
    : []

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search */}
      <div style={{
        position: 'relative',
        marginBottom: 16,
      }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Where are you going?"
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            fontSize: 15,
            color: 'var(--text-primary)',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-secondary)' }}
          >✕</button>
        )}
      </div>

      {/* Language toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'cantonese', label: '粵 Cantonese' },
          { id: 'mandarin', label: '普 Mandarin' },
        ].map(l => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              background: lang === l.id ? 'var(--accent-muted)' : 'var(--bg-surface)',
              color: lang === l.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: lang === l.id ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
              transition: 'all 0.2s',
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {filteredSuggestions.map(dest => (
            <button
              key={dest.id}
              onClick={() => onSelectDestination({ ...dest, lang })}
              style={{
                width: '100%',
                padding: '14px 0',
                borderBottom: '1px solid var(--border-subtle)',
                textAlign: 'left',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  <span style={{ marginRight: 8 }}>{lang === 'mandarin' ? dest.mandarin : dest.cantonese}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{dest.english}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Recent destinations */}
      {!showSuggestions && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Recent</div>
          {RECENT_DESTINATIONS.map(dest => (
            <button
              key={dest.id}
              onClick={() => onSelectDestination({ ...dest, lang })}
              style={{
                width: '100%',
                padding: '14px 0',
                borderBottom: '1px solid var(--border-subtle)',
                textAlign: 'left',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <div style={{ fontWeight: 500, lineHeight: 1.6 }}>
                  <span style={{ fontSize: 17 }}>{lang === 'mandarin' ? dest.mandarin : dest.cantonese}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {dest.english} · {dest.area}
                </div>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
