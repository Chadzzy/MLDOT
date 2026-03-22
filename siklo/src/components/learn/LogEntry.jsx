import { useState } from 'react'
import Waveform from '../Waveform'

const STATUS_CONFIG = {
  struggling: { color: 'var(--status-important)', label: 'Still struggling', emoji: '🔴' },
  getting_there: { color: 'var(--status-confused)', label: 'Getting there', emoji: '🟡' },
  mastered: { color: 'var(--status-understood)', label: 'Mastered', emoji: '🟢' },
}

export default function LogEntry({ entry, onBack }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [personalNote, setPersonalNote] = useState(entry?.coachResult?.personalNote || '')

  if (!entry) return null

  const status = STATUS_CONFIG[entry.status]

  const playAudio = () => {
    setIsPlaying(true)
    setTimeout(() => setIsPlaying(false), 2000)
  }

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <button onClick={onBack} style={{ fontSize: 16, color: 'var(--text-secondary)', padding: '4px 0', marginBottom: 16 }}>← Back</button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>
          {entry.cantonese}
        </div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
          {entry.english}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {entry.romanization}
        </div>
      </div>

      {/* Status & stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 20,
        padding: '12px 0',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Status</div>
          <div style={{ color: status.color, fontWeight: 500, fontSize: 13, marginTop: 4 }}>{status.emoji} {status.label}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Attempts</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{entry.attempts}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Added</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{entry.dateAdded}</div>
        </div>
      </div>

      {/* Pronunciation */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--status-understood)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Correct
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{entry.coachResult.correctPronunciation}</div>
        <button onClick={playAudio} style={{
          padding: '8px 16px', borderRadius: 8,
          background: 'var(--accent-jade-muted)', color: 'var(--accent-jade)',
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {isPlaying ? <Waveform color="var(--accent-jade)" height={16} /> : <>🔊 Hear it</>}
        </button>
      </div>

      {/* Coach feedback */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-english)', whiteSpace: 'pre-line' }}>
          {entry.coachResult.whatWentWrong}
        </p>
      </div>

      {/* Think of it like */}
      <div style={{
        padding: 16,
        background: 'var(--accent-jade-muted)',
        borderRadius: 12,
        borderLeft: '3px solid var(--accent-jade)',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-jade)', marginBottom: 6 }}>THINK OF IT LIKE</div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-english)' }}>{entry.coachResult.thinkOfItLike}</p>
      </div>

      {/* Personal notes */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Personal Notes</div>
        <textarea
          value={personalNote}
          onChange={e => setPersonalNote(e.target.value)}
          placeholder='e.g. "Tried this ordering dim sum at Tim Ho Wan — got a smile!"'
          rows={3}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 10,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            fontSize: 14,
            resize: 'none',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Practice again */}
      <button
        onClick={() => {
          setIsRecording(true)
          setTimeout(() => setIsRecording(false), 3000)
        }}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          background: isRecording ? 'var(--accent-muted)' : 'var(--accent-primary)',
          color: isRecording ? 'var(--accent-primary)' : '#fff',
          border: isRecording ? '1px solid var(--border-active)' : 'none',
          fontWeight: 600,
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {isRecording ? <><Waveform height={20} /> Listening…</> : <>🎤 Practice again</>}
      </button>
    </div>
  )
}
