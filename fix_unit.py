import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add unit state
content = content.replace(
    "const [activeTab, setActiveTab] = useState<Tab>('dashboard');",
    "const [activeTab, setActiveTab] = useState<Tab>('dashboard');\n  const [unit, setUnit] = useState<'lbs' | 'kg'>(() => (localStorage.getItem('preferred_unit') as 'lbs' | 'kg') || 'lbs');"
)

# Add effect to save unit
content = content.replace(
    "  const handleSaveApiKey = (key: string) => {",
    "  const toggleUnit = () => {\n    const newUnit = unit === 'lbs' ? 'kg' : 'lbs';\n    setUnit(newUnit);\n    localStorage.setItem('preferred_unit', newUnit);\n  };\n\n  const handleSaveApiKey = (key: string) => {"
)

# Pass unit to components
content = content.replace(
    "<Dashboard />",
    "<Dashboard unit={unit} />"
)
content = content.replace(
    "<WorkoutLogger />",
    "<WorkoutLogger unit={unit} />"
)

# Add unit toggle button to header
content = content.replace(
    '<p className="header-subtitle" style={{ color: \'var(--accent-hover)\', fontWeight: 700, marginTop: \'0.5rem\' }}>🐾 No Pain No Cute 🐾</p>',
    '''<div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
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
          </div>'''
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
