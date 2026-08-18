import { useState, useEffect } from 'react';

import './App.css';

// Components
import Dashboard from './components/Dashboard';
import WorkoutLogger from './components/WorkoutLogger';
import AIChat from './components/AIChat';
import Settings from './components/Settings';

type Tab = 'dashboard' | 'logger' | 'chat' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [apiKey, setApiKey] = useState<string>(import.meta.env.VITE_GEMINI_API_KEY || '');

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'logger':
        return <WorkoutLogger />;
      case 'chat':
        return <AIChat apiKey={apiKey} onNavigateToLogger={() => setActiveTab('logger')} />;
      case 'settings':
        return <Settings apiKey={apiKey} onSave={handleSaveApiKey} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <header className="main-header">
        <div>
          <h1 className="header-title">
            <img src="/dog-icon.png" alt="dog dumbbell" style={{ width: '40px', height: '40px', borderRadius: '50%', boxShadow: 'var(--shadow-sm)', objectFit: 'cover' }} />
            Training Enhancer
          </h1>
          <p className="header-subtitle" style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>🐾 No Pain No Cute 🐾</p>
        </div>
        
        <nav className="header-nav">
          <button 
            className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span style={{ fontSize: '1.2rem', marginRight: '4px' }}>🏠</span>
            Dashboard
          </button>
          <button 
            className={`nav-button ${activeTab === 'logger' ? 'active' : ''}`}
            onClick={() => setActiveTab('logger')}
          >
            <span style={{ fontSize: '1.2rem', marginRight: '4px' }}>🍖</span>
            Logger
          </button>
          <button 
            className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <span style={{ fontSize: '1.2rem', marginRight: '4px' }}>🐕</span>
            AI Trainer
          </button>
          <button 
            className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span style={{ fontSize: '1.2rem', marginRight: '4px' }}>⚙️</span>
            Settings
          </button>
        </nav>
      </header>

      <main className="dashboard-container">
        {renderContent()}
      </main>
    </>
  );
}

export default App;
