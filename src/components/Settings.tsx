import React, { useState } from 'react';
import { Key, Save, ShieldAlert, Database, Upload } from 'lucide-react';
import { resetSupabase, getSupabase } from '../lib/supabase';
import { saveWorkout } from '../utils/supabaseApi';
import type { DailyWorkout } from '../types';

interface SettingsProps {
  apiKey: string;
  onSave: (key: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ apiKey, onSave }) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [supaUrl, setSupaUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [supaKey, setSupaKey] = useState(localStorage.getItem('supabase_anon_key') || '');
  
  const [savedGemini, setSavedGemini] = useState(false);
  const [savedSupabase, setSavedSupabase] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');

  const handleSaveGemini = () => {
    onSave(inputKey);
    setSavedGemini(true);
    setTimeout(() => setSavedGemini(false), 3000);
  };

  const handleSaveSupabase = () => {
    localStorage.setItem('supabase_url', supaUrl);
    localStorage.setItem('supabase_anon_key', supaKey);
    resetSupabase(); // Re-initialize with new keys
    setSavedSupabase(true);
    setTimeout(() => setSavedSupabase(false), 3000);
    // Reload the page to ensure all components fetch from Supabase
    window.location.reload();
  };

  const handleMigrate = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setMigrationStatus('Supabase is not configured.');
      return;
    }

    const saved = localStorage.getItem('training_workouts');
    if (!saved) {
      setMigrationStatus('No local workouts found to migrate.');
      return;
    }

    setMigrationStatus('Migrating...');
    try {
      const workouts: DailyWorkout[] = JSON.parse(saved);
      let successCount = 0;
      for (const w of workouts) {
        const ok = await saveWorkout(w);
        if (ok) successCount++;
      }
      setMigrationStatus(`Migration complete! Successfully migrated ${successCount}/${workouts.length} workouts.`);
    } catch (e) {
      console.error(e);
      setMigrationStatus('Error during migration.');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', textAlign: 'center' }}>
        Settings
      </h2>

      {/* Gemini Settings */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 className="card-title" style={{ fontSize: '1.25rem' }}>
          <Key className="h-6 w-6" style={{ color: 'var(--accent-primary)' }} />
          Gemini API Configuration
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
          To use the AI Trainer features, please provide your Google Gemini API Key. 
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <label htmlFor="apiKey" style={{ fontWeight: 600, fontSize: '0.95rem' }}>API Key</label>
          <input
            id="apiKey"
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy..."
            style={{ width: '100%', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button className="action-button primary" onClick={handleSaveGemini}>
            <Save size={18} />
            Save Key
          </button>
          {savedGemini && <span style={{ color: 'var(--success)', fontSize: '0.95rem', fontWeight: 600 }}>Saved successfully!</span>}
        </div>
      </div>

      {/* Supabase Settings */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 className="card-title" style={{ fontSize: '1.25rem' }}>
          <Database className="h-6 w-6" style={{ color: 'var(--success)' }} />
          Supabase Configuration
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Configure your Supabase database to sync your workouts across devices. Note: Saving will refresh the app.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="supaUrl" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Project URL</label>
            <input
              id="supaUrl"
              type="text"
              value={supaUrl}
              onChange={(e) => setSupaUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="supaKey" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Anon Key</label>
            <input
              id="supaKey"
              type="password"
              value={supaKey}
              onChange={(e) => setSupaKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button className="action-button primary" onClick={handleSaveSupabase}>
            <Save size={18} />
            Save Supabase Settings
          </button>
          {savedSupabase && <span style={{ color: 'var(--success)', fontSize: '0.95rem', fontWeight: 600 }}>Saved! Reloading...</span>}
        </div>
        
        <hr style={{ margin: '2rem 0', borderColor: 'var(--glass-border)' }} />
        
        <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Data Migration</h4>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Move your existing local data to the connected Supabase database.
        </p>
        <button className="action-button secondary" onClick={handleMigrate}>
          <Upload size={18} />
          Migrate Local Data to Supabase
        </button>
        {migrationStatus && <p style={{ marginTop: '1rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{migrationStatus}</p>}
      </div>

      <div className="glass-card" style={{ backgroundColor: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
        <h3 className="card-title" style={{ color: 'var(--warning)', fontSize: '1.25rem' }}>
          <ShieldAlert className="h-6 w-6" />
          Privacy Notice
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          API keys are stored locally in your browser. Clearing your browser data will clear these settings.
        </p>
      </div>
    </div>
  );
};

export default Settings;
