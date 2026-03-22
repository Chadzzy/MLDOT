import { MOCK_CONTACTS } from '../../data/mockContacts'

export default function TranslateHome({ onSelectContact, onNewTranslation }) {
  return (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Recent conversations</p>
      </div>

      {MOCK_CONTACTS.map(contact => (
        <button
          key={contact.id}
          onClick={() => onSelectContact(contact)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '14px 16px',
            textAlign: 'left',
            borderBottom: '1px solid var(--border-subtle)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: contact.accentColor + '22',
            border: `1.5px solid ${contact.accentColor}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: contact.accentColor,
            flexShrink: 0,
          }}>
            {contact.avatar}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{contact.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{contact.lastTime}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 500, marginTop: 1 }}>
              {contact.relationship}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {contact.lastMessage}
            </div>
          </div>
        </button>
      ))}

      {/* FAB */}
      <button
        onClick={onNewTranslation}
        style={{
          position: 'fixed',
          bottom: 84,
          right: 'calc(50% - 195px)',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          color: '#fff',
          fontSize: 28,
          fontWeight: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(232, 135, 58, 0.4)',
          transition: 'transform 0.2s, background 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        +
      </button>
    </div>
  )
}
