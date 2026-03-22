import { useState, useEffect, useRef } from 'react'
import { MOCK_TALK_EXCHANGES } from '../../data/mockTranslations'
import { useSimulatedSession } from '../../hooks/useSimulatedSession'
import StreamingText from '../StreamingText'
import ReactionBar from '../ReactionBar'

export default function TalkView({ onBack, showToast }) {
  const { timer, endSession } = useSimulatedSession()
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState([])
  const [sessionTimer, setSessionTimer] = useState(0)
  const timerRef = useRef(null)
  const exchangeIdx = useRef(0)

  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handlePTT = () => {
    if (isRecording) {
      setIsRecording(false)
      const exchange = MOCK_TALK_EXCHANGES[exchangeIdx.current % MOCK_TALK_EXCHANGES.length]
      // Show your message after "translating"
      setTimeout(() => {
        setMessages(prev => [...prev, { type: 'you', ...exchange.you }])
      }, 800)
    } else {
      setIsRecording(true)
    }
  }

  const simulatePartner = () => {
    const exchange = MOCK_TALK_EXCHANGES[exchangeIdx.current % MOCK_TALK_EXCHANGES.length]
    setMessages(prev => [...prev, { type: 'partner', ...exchange.partner }])
    exchangeIdx.current++
  }

  const handleEnd = () => {
    clearInterval(timerRef.current)
    endSession()
    onBack()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)', position: 'relative' }}>
      {/* Ambient pulse when recording */}
      {isRecording && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 70%, var(--accent-muted) 0%, transparent 70%)',
          animation: 'breathe 2s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}

      {/* Top bar */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 1,
      }}>
        <button onClick={handleEnd} style={{ fontSize: 13, color: 'var(--status-important)', fontWeight: 600 }}>End</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Chan Siu-Ming — Building Manager</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatTime(sessionTimer)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E85D3A', animation: 'livePulse 1s infinite' }} />
          <span style={{ fontSize: 11, color: '#E85D3A', fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Main area — two halves */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1 }}>
        {/* Your side */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 500, marginBottom: 8 }}>You → Cantonese</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {messages.filter(m => m.type === 'you').map((msg, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <StreamingText text={msg.english} style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }} />
                <StreamingText text={msg.cantonese} isChinese style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'block', fontWeight: 500, lineHeight: 1.6 }} delay={60} />
              </div>
            ))}
          </div>

          {/* PTT Button */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <button
              onMouseDown={handlePTT}
              onMouseUp={() => isRecording && handlePTT()}
              onClick={handlePTT}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: `3px solid var(--accent-primary)`,
                background: isRecording ? 'var(--accent-primary)' : 'transparent',
                color: isRecording ? '#fff' : 'var(--accent-primary)',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
                animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isRecording ? 'Listening…' : 'Hold to Speak'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-base)', padding: '2px 8px', fontSize: 11, color: 'var(--text-secondary)' }}>⇅</span>
        </div>

        {/* Partner side */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: 11, color: 'var(--accent-jade)', fontWeight: 500, marginBottom: 8 }}>Chan Siu-Ming → English</div>
          {messages.filter(m => m.type === 'partner').map((msg, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <StreamingText text={msg.english} style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }} />
              <StreamingText text={msg.cantonese} isChinese style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'block', fontWeight: 500, lineHeight: 1.6 }} delay={60} />
            </div>
          ))}
          {messages.filter(m => m.type === 'partner').length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Waiting for partner to speak…</p>
          )}
        </div>
      </div>

      {/* Bottom: Simulate + Reactions */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 16px', background: 'var(--bg-base)', zIndex: 1 }}>
        <button
          onClick={simulatePartner}
          style={{
            width: '100%',
            padding: '6px',
            fontSize: 11,
            color: 'var(--accent-jade)',
            background: 'var(--accent-jade-muted)',
            borderRadius: 6,
            marginBottom: 4,
          }}
        >
          ▶ Simulate Partner Speaking
        </button>
        <ReactionBar compact onReact={(r) => showToast(`${r.emoji} sent to partner`)} />
      </div>
    </div>
  )
}
