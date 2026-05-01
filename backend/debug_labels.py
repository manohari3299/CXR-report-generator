import json
from collections import Counter

with open('index/metadata.json', 'r') as f:
    meta = json.load(f)

keywords = ['pneumonia', 'effusion', 'pneumothorax', 'cardiomegaly', 'atelectasis', 'edema']
counts = Counter()
multi_label = 0

for m in meta[:5000]:
    r = m['report'].lower()
    found = [k for k in keywords if k in r]
    for k in found:
        counts[k] += 1
    if len(found) > 1:
        multi_label += 1

print('Keyword counts in first 5000 reports:')
for k, v in counts.most_common():
    print(f'  {k}: {v} ({v/5000*100:.1f}%)')
print(f'Reports mentioning 2+ conditions: {multi_label} ({multi_label/5000*100:.1f}%)')
print()

# Check negation problem
no_effusion = 0
has_effusion = 0
for m in meta[:5000]:
    r = m['report'].lower()
    if 'effusion' in r:
        # Check for negation patterns
        before = r.split('effusion')[0][-50:]
        if 'no ' in before or 'without' in before or 'no pleural' in before or 'not ' in before:
            no_effusion += 1
        else:
            has_effusion += 1

print(f'Reports with effusion keyword:')
print(f'  Negated (no effusion): {no_effusion}')
print(f'  Actual effusion: {has_effusion}')
print()

# Show some example reports that get labeled "Effusion" but are actually negative
print('=== Example NEGATED effusion reports (currently mislabeled) ===')
count = 0
for m in meta[:5000]:
    r = m['report'].lower()
    if 'effusion' in r:
        before = r.split('effusion')[0][-50:]
        if 'no ' in before or 'without' in before or 'no pleural' in before:
            if count < 3:
                print(f'\n  Report: {m["report"][:200]}')
                count += 1
