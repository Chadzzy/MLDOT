import { useState, useEffect, useRef } from 'react'
import { MOCK_TALK_EXCHANGES } from '../../data/mockTranslations'
import StreamingText from '../StreamingText'
import ReactionBar from '../ReactionBar'

export default function SplitScreenView({ onBack, showToast }) {
  const [messages, setMessages] = useState([])
  const [isRecordingTop, setIsRecordingTop] = useState(false)
  const [isRecordingBottom, setIsRecordingBottom] = useState(false)
  const [sessionTimer, setSessionTimer] = useState(0)
  const exchangeIdx = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleTopTap = () => {
    if (isRecordingTop) {
      setIsRecordingTop(false)
      const exchange = MOCK_TALK_EXCHANGES[exchangeIdx.current % MOCK_TALK_EXCHANGES.length]
      setTimeout(() => {
        setMessages(prev => [...prev, { side: 'top', english: exchange.you.english, cantonese: exchange.you.cantonese }])
        exchangeIdx.current++
      }, 800)
    } else {
      setIsRecordingTop(true)
    }
  }

  const handleBottomTap = () => {
    if (isRecordingBottom) {
      setIsRecordingBottom(false)
      const exchange = MOCK_TALK_EXCHANGES[exchangeIdx.current % MOCK_TALK_EXCHANGES.length]
      setTimeout(() => {
        setMessages(prev => [...prev, { side: 'bottom', english: exchange.partner.english, cantonese: exchange.partner.cantonese }])
        exchangeIdx.current++
      }, 800)
    } else {
      setIsRecordingBottom(true)
    }
  }

  const topMessages = messages.filter(m => m.side === 'top')
  const bottomMessages = messages.filter(m => m.side === 'bottom')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Mini header */}
      <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={() => { clearInterval(timerRef.current); onBack() }} style={{ fontSize: 13, color: 'var(--status-important)', fontWeight: 600 }}>End</button>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatTime(sessionTimer)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E85D3A', animation: 'livePulse 1s infinite' }} />
          <span style={{ fontSize: 11, color: '#E85D3A', fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Top half — English (your side) */}
      <div
        onClick={handleTopTap}
        style={{
          flex: 1,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          background: isRecordingTop ? 'var(--bg-surface)' : 'var(--bg-base)',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 500, marginBottom: 8 }}>English · Tap to speak</div>
        {topMessages.length > 0 ? (
          topMessages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <StreamingText text={msg.english} style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }} />
              <StreamingText text={msg.cantonese} isChinese style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'block' }} delay={60} />
            </div>
          ))
        ) : (
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {isRecordingTop ? '🎙️ Listening…' : 'Tap this half to speak English'}
          </p>
        )}
        {isRecordingTop && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 50%, var(--accent-muted) 0%, transparent 70%)',
            animation: 'breathe 2s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-active)', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 10, fontSize: 14, color: 'var(--text-secondary)' }}>⇅</span>
      </div>

      {/* Bottom half — Cantonese (their side) */}
      <div
        onClick={handleBottomTap}
        style={{
          flex: 1,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          background: isRecordingBottom ? 'var(--bg-elevated)' : 'var(--bg-surface)',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--accent-jade)', fontWeight: 500, marginBottom: 8 }}>粵語 · 撳呢度講嘢</div>
        {bottomMessages.length > 0 ? (
          bottomMessages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <StreamingText text={msg.cantonese} isChinese style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', display: 'block', lineHeight: 1.6, marginBottom: 4 }} delay={60} />
              <StreamingText text={msg.english} style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'block' }} />
            </div>
          ))
        ) : (
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {isRecordingBottom ? '🎙️ 聆聽中…' : '撳呢度用粵語講嘢'}
          </p>
        )}
        {isRecordingBottom && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 50%, var(--accent-jade-muted) 0%, transparent 70%)',
            animation: 'breathe 2s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Reactions */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 12px', background: 'var(--bg-base)' }}>
        <ReactionBar compact onReact={(r) => showToast(`${r.emoji} sent`)} />
      </div>
    </div>
  )
}
