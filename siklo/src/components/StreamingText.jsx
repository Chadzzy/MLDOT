import { useStreamingText } from '../hooks/useStreamingText'

export default function StreamingText({ text, isChinese = false, style = {}, autoStart = true, delay = 90 }) {
  const { displayedText, isStreaming, isDone } = useStreamingText(text, {
    autoStart,
    isChinese,
    delay,
  })

  return (
    <span style={style}>
      {displayedText}
      {isStreaming && (
        <span style={{
          display: 'inline-block',
          color: 'var(--accent-primary)',
          animation: 'blink 0.6s ease-in-out infinite',
          marginLeft: 2,
        }}>▋</span>
      )}
      {isDone && !isStreaming && (
        <span style={{
          display: 'inline-block',
          color: 'var(--accent-primary)',
          animation: 'cursorFade 0.4s ease-out forwards',
          marginLeft: 2,
        }}>▋</span>
      )}
    </span>
  )
}
