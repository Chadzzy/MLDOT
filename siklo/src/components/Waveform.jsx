export default function Waveform({ color = 'var(--accent-primary)', height = 32 }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      height,
    }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: color,
            animation: `waveBar 0.8s ease-in-out ${i * 0.08}s infinite`,
            height: 4,
          }}
        />
      ))}
    </div>
  )
}
