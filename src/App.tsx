import { useState, useEffect } from 'react';

import './App.css';

// Components
import Dashboard from './components/Dashboard';
import WorkoutLogger from './components/WorkoutLogger';
import AIChat from './components/AIChat';

type Tab = 'dashboard' | 'logger' | 'chat';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [unit, setUnit] = useState<'lbs' | 'kg'>(() => (localStorage.getItem('preferred_unit') as 'lbs' | 'kg') || 'lbs');
  const [apiKey, setApiKey] = useState<string>(import.meta.env.VITE_GEMINI_API_KEY || '');

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }

    // 自動で毎日の初回起動時にバックアップを取る（前日の状態を保存）
    const today = new Date().toISOString().slice(0, 10);
    const lastBackupDate = localStorage.getItem('auto_backup_date');
    if (lastBackupDate !== today) {
      const currentWorkouts = localStorage.getItem('training_workouts') || '[]';
      const currentWeights = localStorage.getItem('training_weights') || '[]';
      localStorage.setItem('auto_backup_workouts', currentWorkouts);
      localStorage.setItem('auto_backup_weights', currentWeights);
      localStorage.setItem('auto_backup_date', today);
    }
  }, []);

  const toggleUnit = () => {
    const newUnit = unit === 'lbs' ? 'kg' : 'lbs';
    setUnit(newUnit);
    localStorage.setItem('preferred_unit', newUnit);
  };

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard unit={unit} />;
      case 'logger':
        return <WorkoutLogger unit={unit} />;
      case 'chat':
        return <AIChat apiKey={apiKey} onNavigateToLogger={() => setActiveTab('logger')} onSaveApiKey={handleSaveApiKey} />;
      default:
        return <Dashboard unit={unit} />;
    }
  };

const APP_VERSION = 'v1.1.10';

  return (
    <>
      <header className="main-header">
        <div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <h1 className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/dog-icon.png" alt="dog dumbbell" style={{ width: '40px', height: '40px', borderRadius: '50%', boxShadow: 'var(--shadow-sm)', objectFit: 'cover' }} />
              Training Enhancer
            </h1>
            <span style={{ position: 'absolute', bottom: '-2px', right: '-32px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {APP_VERSION}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <p className="header-subtitle" style={{ color: 'var(--accent-hover)', fontWeight: 700, margin: 0 }}>🐾 No Pain No Cute 🐾</p>
            <button 
              onClick={toggleUnit}
              style={{
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                borderRadius: '12px',
                padding: '0.1rem 0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              単位: {unit}
            </button>
          </div>
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
        </nav>
      </header>

      <main className="dashboard-container">
        {renderContent()}
      </main>
    </>
  );
}

export default App;
