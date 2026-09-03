import re

with open('src/components/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("`${s.weight}kg×${s.reps}`", "`${s.weight}${unit}×${s.reps}`")
content = content.replace("`${lastWeight.weight}kg ですね", "`${lastWeight.weight}${unit} ですね")
content = content.replace("`${lastWeight.weight}kg でした", "`${lastWeight.weight}${unit} でした")
content = content.replace(">kg</span>", ">{unit}</span>")
content = content.replace("`${value} kg`", "`${value} ${unit}`")

with open('src/components/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
