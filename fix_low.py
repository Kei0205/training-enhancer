import re
import os

# 1. index.css
with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()
css = css.replace("@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Klee+One:wght@400;600&display=swap');\n", '')
with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

# 2. index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
font_tags = """    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Klee+One:wght@400;600&display=swap" rel="stylesheet">"""
if "fonts.googleapis.com" not in html:
    html = html.replace('<title>', f"{font_tags}\n    <title>")
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)

# 3. AIChat.tsx
with open('src/components/AIChat.tsx', 'r', encoding='utf-8') as f:
    aichat = f.read()
aichat = aichat.replace("if (saved && savedDate === today)", "if (saved)")
with open('src/components/AIChat.tsx', 'w', encoding='utf-8') as f:
    f.write(aichat)

# 4. Dashboard.tsx (Weight Modal ESC)
with open('src/components/Dashboard.tsx', 'r', encoding='utf-8') as f:
    dashboard = f.read()

# Add onKeyDown, tabIndex to modal overlay
dashboard = dashboard.replace(
    '''onClick={() => setIsWeightModalOpen(false)}''',
    '''onClick={() => setIsWeightModalOpen(false)}
          onKeyDown={(e) => { if(e.key === 'Escape') setIsWeightModalOpen(false); }}
          tabIndex={-1}'''
)
with open('src/components/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(dashboard)

# 5. WorkoutLogger.tsx (Calendar Accessibility)
with open('src/components/WorkoutLogger.tsx', 'r', encoding='utf-8') as f:
    logger = f.read()

# calendarDays.map div
logger = logger.replace(
    '''onClick={() => setSelectedDate(date)}''',
    '''onClick={() => setSelectedDate(date)}
                        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') setSelectedDate(date); }}
                        tabIndex={0}
                        role="button"'''
)
with open('src/components/WorkoutLogger.tsx', 'w', encoding='utf-8') as f:
    f.write(logger)
