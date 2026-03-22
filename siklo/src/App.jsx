import { useState } from 'react'
import './App.css'
import TranslateHome from './components/translate/TranslateHome'
import ConversationView from './components/translate/ConversationView'
import TranslationResult from './components/translate/TranslationResult'
import TalkHome from './components/talk/TalkHome'
import TalkView from './components/talk/TalkView'
import SplitScreenView from './components/talk/SplitScreenView'
import GoHome from './components/go/GoHome'
import DestinationCard from './components/go/DestinationCard'
import LearnHome from './components/learn/LearnHome'
import CoachResult from './components/learn/CoachResult'
import LogEntry from './components/learn/LogEntry'

const TABS = [
  { id: 'translate', icon: '💬', label: 'Translate' },
  { id: 'talk', icon: '🔴', label: 'Talk' },
  { id: 'go', icon: '🗺️', label: 'Go' },
  { id: 'learn', icon: '📖', label: 'Learn' },
]

const MODE_TITLES = {
  translate: 'Translate',
  talk: 'Talk',
  go: 'Go',
  learn: 'Learn',
}

function App() {
  const [activeTab, setActiveTab] = useState('translate')
  const [subScreen, setSubScreen] = useState(null)
  const [subData, setSubData] = useState(null)
  const [toast, setToast] = useState(null)

  const navigate = (screen, data = null) => {
    setSubScreen(screen)
    setSubData(data)
  }

  const goBack = () => {
    setSubScreen(null)
    setSubData(null)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSubScreen(null)
    setSubData(null)
  }

  const renderContent = () => {
    // Translate mode
    if (activeTab === 'translate') {
      if (subScreen === 'conversation') return <ConversationView contact={subData} onBack={goBack} showToast={showToast} />
      if (subScreen === 'new-translation') return <TranslationResult onBack={goBack} showToast={showToast} />
      return <TranslateHome onSelectContact={(c) => navigate('conversation', c)} onNewTranslation={() => navigate('new-translation')} />
    }
    // Talk mode
    if (activeTab === 'talk') {
      if (subScreen === 'talk-view') return <TalkView onBack={goBack} showToast={showToast} />
      if (subScreen === 'split-screen') return <SplitScreenView onBack={goBack} showToast={showToast} />
      return <TalkHome onStartSession={() => navigate('talk-view')} onSinglePhone={() => navigate('split-screen')} />
    }
    // Go mode
    if (activeTab === 'go') {
      if (subScreen === 'destination-card') return <DestinationCard destination={subData} onBack={goBack} />
      return <GoHome onSelectDestination={(d) => navigate('destination-card', d)} />
    }
    // Learn mode
    if (activeTab === 'learn') {
      if (subScreen === 'coach-result') return <CoachResult data={subData} onBack={goBack} showToast={showToast} />
      if (subScreen === 'log-entry') return <LogEntry entry={subData} onBack={goBack} />
      return <LearnHome onCoachResult={(d) => navigate('coach-result', d)} onLogEntry={(e) => navigate('log-entry', e)} />
    }
  }

  const showHeader = !(subScreen === 'destination-card' || subScreen === 'talk-view' || subScreen === 'split-screen')

  return (
    <div className="app">
      {showHeader && (
        <header className="app-header">
          <div className="wordmark">
            <span className="wordmark-en">Siklo</span>
            <span className="wordmark-zh">識路</span>
          </div>
          <span className="context-title">{MODE_TITLES[activeTab]}</span>
          <svg className="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </header>
      )}

      <div className="app-content">
        {renderContent()}
      </div>

      <nav className="bottom-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
