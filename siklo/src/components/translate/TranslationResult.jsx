import { useState, useEffect } from 'react'
import { MOCK_NEW_TRANSLATION } from '../../data/mockTranslations'
import { MOCK_CONTACTS } from '../../data/mockContacts'
import ReactionBar from '../ReactionBar'
import Waveform from '../Waveform'

const STEPS = [
  'Transcribing Cantonese…',
  'Translating…',
  'Applying context…',
]

export default function TranslationResult({ onBack, showToast }) {
  const [phase, setPhase] = useState('source') // source, processing, result
  const [currentStep, setCurrentStep] = useState(0)
  const contact = MOCK_CONTACTS.find(c => c.id === MOCK_NEW_TRANSLATION.contactId)

  const startProcessing = (source) => {
    setPhase('processing')
    setCurrentStep(0)
    setTimeout(() => setCurrentStep(1), 800)
    setTimeout(() => setCurrentStep(2), 1500)
    setTimeout(() => setPhase('result'), 2200)
  }

  if (phase === 'source') {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        <button onClick={onBack} style={{ alignSelf: 'flex-start', fontSize: 16, color: 'var(--text-secondary)', padding: '4px 0' }}>← Back</button>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>New Translation</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Import a Cantonese voice note to transcribe and translate.</p>

        <button
          onClick={() => startProcessing('upload')}
          style={{
            padding: '20px',
            background: 'var(--bg-surface)',
            borderRadius: 16,
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <div style={{ fontWeight: 500 }}>Upload audio file</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Select from your device</div>
        </button>

        <button
          onClick={() => startProcessing('record')}
          style={{
            padding: '20px',
            background: 'var(--bg-surface)',
            borderRadius: 16,
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎙️</div>
          <div style={{ fontWeight: 500 }}>Record now</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Hold your phone near the speaker</div>
        </button>
      </div>
    )
  }

  if (phase === 'processing') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 32,
        padding: 24,
      }}>
        <Waveform height={40} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 260 }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              color: i <= currentStep ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'color 0.3s',
            }}>
              <span style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                background: i < currentStep ? 'var(--status-understood)' : i === currentStep ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: i <= currentStep ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.3s',
              }}>
                {i < currentStep ? '✓' : i === currentStep ? '…' : '○'}
              </span>
              {step}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Result phase
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{ fontSize: 20, padding: '4px 8px 4px 0' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Translation Result</span>
      </div>

      {/* Contact selector */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--accent-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: contact.accentColor + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, color: contact.accentColor,
        }}>{contact.avatar}</div>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{contact.name}</span>
        <span style={{ fontSize: 11, color: 'var(--accent-primary)' }}>· {contact.relationship}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Cantonese */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Cantonese Transcript
          </div>
          <p style={{
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.7,
            color: 'var(--text-cantonese)',
            background: 'var(--bg-surface)',
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
          }}>
            {MOCK_NEW_TRANSLATION.cantonese}
          </p>
        </div>

        {/* English */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent-jade)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            English Translation
          </div>
          <p style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--text-english)',
            background: 'var(--bg-surface)',
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
          }}>
            {MOCK_NEW_TRANSLATION.english}
          </p>
        </div>

        {/* Context */}
        <div style={{
          padding: '10px 14px',
          background: 'var(--accent-jade-muted)',
          borderRadius: 10,
          borderLeft: '3px solid var(--accent-jade)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          {MOCK_NEW_TRANSLATION.context}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 16px', background: 'var(--bg-base)' }}>
        <ReactionBar compact onReact={(r) => showToast(`${r.emoji} Reaction sent to ${contact.name}`)} />
      </div>
    </div>
  )
}
