import { useState } from 'react'
import Waveform from '../Waveform'

export default function DestinationCard({ destination, onBack }) {
  const [isPlaying, setIsPlaying] = useState(null) // 'cantonese' | 'mandarin' | null
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [lang, setLang] = useState(destination?.lang || 'cantonese')

  if (!destination) return null

  const isCantonese = lang === 'cantonese'
  const chars = isCantonese ? destination.cantonese : destination.mandarin
  const landmark = isCantonese ? destination.landmark : destination.mandarinLandmark
  const landmarkEn = destination.landmarkEn

  const playAudio = (audioLang) => {
    setIsPlaying(audioLang)
    setTimeout(() => setIsPlaying(null), 2000)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#F5ECD8',
      color: '#1A1208',
    }}>
      {/* Card content — light inverted scheme for driver */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: '#8B7D6B', marginBottom: 24 }}>
          Destination
        </div>

        {/* Language toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { id: 'cantonese', label: '粵 Cantonese' },
            { id: 'mandarin', label: '普 Mandarin' },
          ].map(l => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 500,
                background: lang === l.id ? '#1A1208' : 'transparent',
                color: lang === l.id ? '#F5ECD8' : '#8B7D6B',
                border: lang === l.id ? 'none' : '1px solid #C4B8A4',
                transition: 'all 0.2s',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Main characters */}
        <div style={{
          fontSize: 52,
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: 8,
          color: '#1A1208',
        }}>
          {chars}
        </div>

        <div style={{ fontSize: 18, fontWeight: 500, color: '#5A4D3C', marginBottom: 24 }}>
          {destination.english}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#D4C9B8', marginBottom: 24 }} />

        {/* Landmark */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.6, color: '#1A1208', marginBottom: 4 }}>
            {landmark}
          </div>
          <div style={{ fontSize: 14, color: '#8B7D6B' }}>
            {landmarkEn}
          </div>
        </div>

        {/* Driver note */}
        {note && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(26, 18, 8, 0.06)',
            borderRadius: 8,
            fontSize: 14,
            color: '#5A4D3C',
            marginBottom: 16,
          }}>
            {note}
          </div>
        )}

        {/* Audio buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => playAudio('cantonese')}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: '#1A1208',
              color: '#F5ECD8',
              fontSize: 16,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {isPlaying === 'cantonese' ? <Waveform color="#F5ECD8" height={24} /> : <><span>🔊</span> Play in Cantonese</>}
          </button>

          <button
            onClick={() => playAudio('mandarin')}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: 'transparent',
              color: '#1A1208',
              fontSize: 16,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              border: '2px solid #1A1208',
            }}
          >
            {isPlaying === 'mandarin' ? <Waveform color="#1A1208" height={24} /> : <><span>🔊</span> Play in Mandarin</>}
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #D4C9B8',
      }}>
        <button onClick={onBack} style={{ fontSize: 15, fontWeight: 500, color: '#5A4D3C' }}>← Back</button>

        {!showNote ? (
          <button
            onClick={() => setShowNote(true)}
            style={{ fontSize: 13, color: '#8B7D6B' }}
          >
            + Add note for driver
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, flex: 1, marginLeft: 16 }}>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Stop near the red building"
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #C4B8A4',
                fontSize: 13,
                background: 'rgba(26, 18, 8, 0.04)',
                color: '#1A1208',
              }}
            />
            <button
              onClick={() => setShowNote(false)}
              style={{ fontSize: 13, fontWeight: 600, color: '#1A1208', padding: '8px' }}
            >Done</button>
          </div>
        )}

        {!showNote && (
          <button style={{ fontSize: 15, fontWeight: 500, color: '#5A4D3C' }}>Share →</button>
        )}
      </div>
    </div>
  )
}
