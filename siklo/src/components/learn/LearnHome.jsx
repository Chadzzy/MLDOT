import { useState } from 'react'
import { MOCK_LEARN_LOG, MOCK_NEW_COACH_RESULT } from '../../data/mockLearnLog'
import Waveform from '../Waveform'

const STATUS_CONFIG = {
  struggling: { color: 'var(--status-important)', label: '🔴' },
  getting_there: { color: 'var(--status-confused)', label: '🟡' },
  mastered: { color: 'var(--status-understood)', label: '🟢' },
}

export default function LearnHome({ onCoachResult, onLogEntry }) {
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  const handleRecord = () => {
    setIsRecording(true)
    setTimeout(() => {
      setIsRecording(false)
      onCoachResult(MOCK_NEW_COACH_RESULT)
    }, 3000)
  }

  const handleSkip = () => {
    if (inputText.trim()) {
      onCoachResult({ ...MOCK_NEW_COACH_RESULT, english: inputText })
    }
  }

  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      {/* Coach input */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        border: '1px solid var(--border-subtle)',
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Try a word or phrase</h3>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type what you were trying to say in English"
          rows={2}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 10,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            fontSize: 15,
            resize: 'none',
            marginBottom: 12,
            color: 'var(--text-primary)',
          }}
        />

        {isRecording ? (
          <div style={{
            padding: '16px',
            borderRadius: 12,
            background: 'var(--accent-muted)',
            border: '1px solid var(--border-active)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}>
            <Waveform />
            <span style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 500 }}>Listening… speak now</span>
          </div>
        ) : (
          <>
            <button
              onClick={handleRecord}
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
                transition: 'background 0.2s',
              }}
            >
              🎤 Record my attempt
            </button>
            <button
              onClick={handleSkip}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: 13,
                color: 'var(--accent-jade)',
                marginTop: 8,
              }}
            >
              Skip recording — just explain
            </button>
          </>
        )}
      </div>

      {/* Log */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>My Log</h3>
        {MOCK_LEARN_LOG.map((entry, i) => {
          const status = STATUS_CONFIG[entry.status]
          return (
            <button
              key={entry.id}
              onClick={() => onLogEntry(entry)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 0',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                animation: `slideUp 0.3s ease-out ${i * 0.05}s both`,
              }}
            >
              <div style={{
                width: 4,
                height: 36,
                borderRadius: 2,
                background: status.color,
                flexShrink: 0,
                marginTop: 2,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 500, fontSize: 15 }}>
                    {status.label} {entry.english}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{entry.dateAdded}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-cantonese)', lineHeight: 1.6, marginTop: 2 }}>
                  {entry.cantonese} <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>· {entry.romanization}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{entry.note}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
