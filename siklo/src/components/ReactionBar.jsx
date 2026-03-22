import { useState } from 'react'

const REACTIONS = [
  { emoji: '✓', label: 'Understood', color: 'var(--status-understood)' },
  { emoji: '❤️', label: 'Good', color: 'var(--status-love)' },
  { emoji: '❓', label: 'Confused', color: 'var(--status-confused)' },
  { emoji: '‼️', label: 'Important', color: 'var(--status-important)' },
]

export default function ReactionBar({ onReact, compact = false }) {
  const [animating, setAnimating] = useState(null)

  const handleTap = (reaction) => {
    setAnimating(reaction.emoji)
    setTimeout(() => setAnimating(null), 150)
    onReact?.(reaction)
  }

  return (
    <div style={{
      display: 'flex',
      gap: compact ? 8 : 12,
      justifyContent: 'center',
      padding: compact ? '8px 0' : '12px 0',
    }}>
      {REACTIONS.map(r => (
        <button
          key={r.emoji}
          onClick={() => handleTap(r)}
          style={{
            width: compact ? 48 : 56,
            height: compact ? 48 : 56,
            borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            transition: 'transform 0.15s',
            transform: animating === r.emoji ? 'scale(1.3)' : 'scale(1)',
          }}
        >
          <span style={{ fontSize: compact ? 18 : 22 }}>{r.emoji}</span>
          {!compact && <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 500 }}>{r.label}</span>}
        </button>
      ))}
    </div>
  )
}
