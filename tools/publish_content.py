#!/usr/bin/env python3
"""Publish a hymn-data update to EVERY place at once (no reinstall needed): the Windows/Mac app AND the mobile web app.
1) copy the new hymns.js / topics.js / stories.js into renderer/data/
2) python3 tools/publish_content.py [--site <clone of brethrensundayschoolpresenter.github.io>] "اتضافت ترنيمة «...»" "اتصلحت غلطة في ..."
   - bumps dataVersion in renderer/data/content.json (+ sha256 of the files + the notes)
   - with --site: copies the 3 files + content.json into <site>/app/data/ and sets DATA_VERSION in <site>/app/app.js
3) commit + push BOTH repos (app repo main, site repo main).
   Desktop apps (1.0.7+) download it within a few hours (on start + every 3 h) and show «✨ ترانيم جديدة»; the notes appear in «الجديد».
   The mobile web app gets it the next time it is opened online, reloads by itself and shows a yellow «الجديد» card with the notes
   (+ «ترنيمة جديدة اتضافت: «...» ‹ افتحها» for new hymns).
Bump minApp only if the new data needs a newer app."""
import json, hashlib, sys, os, re, shutil
args = sys.argv[1:]
site = None
if args[:1] == ['--site']:
    site, args = args[1], args[2:]
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'renderer', 'data')
p = os.path.join(d, 'content.json')
c = json.load(open(p, encoding='utf8'))
c['dataVersion'] = int(c.get('dataVersion', 0)) + 1
FILES = ['hymns.js', 'topics.js', 'stories.js']
c['files'] = {f: hashlib.sha256(open(os.path.join(d, f), 'rb').read()).hexdigest() for f in FILES}
c['notes'] = args
json.dump(c, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('dataVersion', c['dataVersion'], c['notes'])
if site:
    sd = os.path.join(site, 'app', 'data')
    for f in FILES + ['content.json']:
        shutil.copy(os.path.join(d, f), os.path.join(sd, f))
    ap = os.path.join(site, 'app', 'app.js')
    s = open(ap, encoding='utf8').read()
    s = re.sub(r'const DATA_VERSION = \d+;', 'const DATA_VERSION = %d;' % c['dataVersion'], s)
    open(ap, 'w', encoding='utf8').write(s)
    print('site updated:', sd, 'DATA_VERSION', c['dataVersion'])
