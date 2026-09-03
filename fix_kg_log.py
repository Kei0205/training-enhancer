import re

with open('src/components/WorkoutLogger.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('placeholder="kg"', 'placeholder={unit}')

with open('src/components/WorkoutLogger.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
