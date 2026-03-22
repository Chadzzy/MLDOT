import { useState } from 'react'
import Waveform from '../Waveform'

export default function CoachResult({ data, onBack, showToast }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecordingAgain, setIsRecordingAgain] = useState(false)

  if (!data) return null

  const playAudio = () => {
    setIsPlaying(true)
    setTimeout(() => setIsPlaying(false), 2000)
  }

  const handleTryAgain = () => {
    setIsRecordingAgain(true)
    setTimeout(() => {
      setIsRecordingAgain(false)
      showToast('Great attempt! Keep practising.')
    }, 3000)
  }

  const handleSave = () => {
    showToast('Saved to your log 📖')
    setTimeout(onBack, 800)
  }

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <button onClick={onBack} style={{ fontSize: 16, color: 'var(--text-secondary)', padding: '4px 0', marginBottom: 16 }}>← Back</button>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {data.english}
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>
          {data.cantonese}
        </div>
      </div>

      {/* Correct pronunciation */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--status-understood)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Correct Pronunciation
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{data.correctPronunciation}</div>
        <button
          onClick={playAudio}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: 'var(--accent-jade-muted)',
            color: 'var(--accent-jade)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isPlaying ? <Waveform color="var(--accent-jade)" height={16} /> : <>🔊 Hear it</>}
        </button>
      </div>

      {/* Your attempt */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        border: '1px solid var(--border-active)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Your Attempt
        </div>
        <div style={{ fontSize: 18, fontWeight: 500 }}>
          {data.userAttempt} <span style={{ fontSize: 13, color: 'var(--accent-primary)' }}>← close, but...</span>
        </div>
      </div>

      {/* What went wrong */}
      <div style={{
        marginBottom: 20,
        padding: 16,
        background: 'var(--bg-elevated)',
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          What Went Wrong
        </div>
        <p style={{
          fontSize: 15,
          lineHeight: 1.8,
          color: 'var(--text-english)',
          paddingLeft: 12,
          whiteSpace: 'pre-line',
        }}>
          {data.whatWentWrong}
        </p>
      </div>

      {/* Think of it like */}
      <div style={{
        marginBottom: 24,
        padding: 16,
        background: 'var(--accent-jade-muted)',
        borderRadius: 12,
        borderLeft: '3px solid var(--accent-jade)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-jade)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Think of it Like
        </div>
        <p style={{
          fontSize: 15,
          lineHeight: 1.8,
          color: 'var(--text-english)',
          paddingLeft: 12,
        }}>
          {data.thinkOfItLike}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 20 }}>
        {isRecordingAgain ? (
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: 'var(--accent-muted)',
            border: '1px solid var(--border-active)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <Waveform />
            <span style={{ fontSize: 13, color: 'var(--accent-primary)' }}>Listening…</span>
          </div>
        ) : (
          <button
            onClick={handleTryAgain}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              background: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            🎤 Try Again
          </button>
        )}

        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            fontWeight: 500,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}
        >
          Save to my log
        </button>
      </div>
    </div>
  )
}
