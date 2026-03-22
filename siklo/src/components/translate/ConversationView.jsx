import { MOCK_CONVERSATIONS } from '../../data/mockTranslations'
import ReactionBar from '../ReactionBar'

function ReactionBadges({ reactions }) {
  if (!reactions?.length) return null
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
      {reactions.map((r, i) => (
        <span key={i} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 8px',
          borderRadius: 8,
          background: 'var(--accent-muted)',
          fontSize: 12,
        }}>
          {r}
        </span>
      ))}
    </div>
  )
}

export default function ConversationView({ contact, onBack, showToast }) {
  const messages = MOCK_CONVERSATIONS[contact.id] || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Contact header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button onClick={onBack} style={{ fontSize: 20, padding: '4px 8px 4px 0' }}>←</button>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: contact.accentColor + '22',
          border: `1.5px solid ${contact.accentColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, color: contact.accentColor,
        }}>{contact.avatar}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{contact.name} <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{contact.nameCantonese}</span></div>
          <div style={{ fontSize: 11, color: 'var(--accent-primary)' }}>{contact.relationship}</div>
        </div>
      </div>

      {/* Context note */}
      <div style={{
        padding: '8px 16px',
        background: 'var(--accent-muted)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {contact.context}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.map((msg, i) => (
          <div key={msg.id} style={{
            maxWidth: '85%',
            marginBottom: 16,
            animation: `slideUp 0.3s ease-out ${i * 0.1}s both`,
          }}>
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 16,
              padding: '12px 16px',
              border: i === messages.length - 1 ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
              boxShadow: i === messages.length - 1 ? 'inset 0 0 20px var(--accent-muted)' : 'none',
            }}>
              <p style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                fontWeight: 500,
                lineHeight: 1.6,
                marginBottom: 8,
              }}>
                {msg.cantonese}
              </p>
              <p style={{ fontSize: 15, color: 'var(--text-english)', lineHeight: 1.5 }}>
                {msg.english}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingLeft: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{msg.time} · {msg.duration}</span>
              <ReactionBadges reactions={msg.reactions} />
            </div>
          </div>
        ))}
      </div>

      {/* Reaction bar */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 16px', background: 'var(--bg-base)' }}>
        <ReactionBar compact onReact={(r) => showToast(`${r.emoji} Reaction sent to ${contact.name}`)} />
      </div>
    </div>
  )
}
