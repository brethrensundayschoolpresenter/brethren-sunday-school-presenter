#!/usr/bin/env python3
"""Publish a hymn-data update (no reinstall needed).
1) copy the new hymns.js / topics.js / stories.js into renderer/data/
2) python3 tools/publish_content.py "اتضافت ترنيمة ..." "اتصلحت غلطة في ..."
3) commit + push renderer/data to main. Installed apps (1.0.7+) download it within a few hours
   (on start + every 3 h) and show a '✨ ترانيم جديدة' button; the notes appear in 'الجديد في البرنامج'.
Bump minApp only if the new data needs a newer app."""
import json, hashlib, sys, os
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'renderer', 'data')
p = os.path.join(d, 'content.json')
c = json.load(open(p, encoding='utf8'))
c['dataVersion'] = int(c.get('dataVersion', 0)) + 1
c['files'] = {f: hashlib.sha256(open(os.path.join(d, f), 'rb').read()).hexdigest() for f in ['hymns.js', 'topics.js', 'stories.js']}
c['notes'] = sys.argv[1:]
json.dump(c, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('dataVersion', c['dataVersion'], c['notes'])
