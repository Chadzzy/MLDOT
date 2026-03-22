import { useState } from 'react'
import { useSimulatedSession } from '../../hooks/useSimulatedSession'

export default function TalkHome({ onStartSession, onSinglePhone }) {
  const { roomCode, sessionState, startSession } = useSimulatedSession()
  const [joinCode, setJoinCode] = useState('')

  if (sessionState === 'waiting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, gap: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Room Code</div>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: 12, color: 'var(--accent-primary)' }}>{roomCode}</div>
        <div style={{
          width: 120, height: 120, borderRadius: 12,
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, color: 'var(--text-secondary)',
        }}>⊞</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>Share this code or let them scan</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-jade)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-jade)', animation: 'livePulse 1.5s infinite' }} />
          <span style={{ fontSize: 13 }}>Waiting for partner to join…</span>
        </div>
      </div>
    )
  }

  if (sessionState === 'connected' || sessionState === 'active') {
    onStartSession()
    return null
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Start session card */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid var(--border-subtle)',
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Start a session</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          You're the host. Share a code with the person you're talking to.
        </p>
        <button
          onClick={startSession}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: 'var(--accent-primary)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
        >
          Start Session
        </button>
      </div>

      {/* Join session card */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid var(--border-subtle)',
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Join a session</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          Enter the code they shared with you.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 8,
              textAlign: 'center',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={onStartSession}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              background: joinCode.length === 4 ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: joinCode.length === 4 ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 15,
              transition: 'all 0.2s',
            }}
          >
            Join
          </button>
        </div>
      </div>

      {/* Single phone mode */}
      <button
        onClick={onSinglePhone}
        style={{
          fontSize: 13,
          color: 'var(--accent-jade)',
          padding: 8,
          textAlign: 'center',
        }}
      >
        Or use single-phone mode →
      </button>
    </div>
  )
}
