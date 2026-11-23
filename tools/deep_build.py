# Builds renderer/data/topics.js (topic -> hymns, from each hymn's "t") and adds window.HDEEP to stories.js
# from data/hymn_deep.json: [{n, t:[topic ids], i:idea, v:[[ref, phrase]], s:[story title, ref, why]}]
# usage: python3 tools/deep_build.py <project dir> <renderer/data dir>
import json, sys, os, re
P, OUT = sys.argv[1], sys.argv[2]
D = json.load(open(os.path.join(P, 'data/hymn_deep.json')))
T = []
for ln in open(os.path.join(P, 'tools/bible_topics.txt'), encoding='utf8'):
    ln = ln.strip()
    if not ln or ln.startswith('#'): continue
    i, name, ref, sec = ln.split('|')
    T.append({'id': int(i), 'name': name, 'ref': ref, 'section': sec, 'nums': []})
byid = {t['id']: t for t in T}
for e in D:
    for k in e['t']: byid[k]['nums'].append(e['n'])
for t in T: t['nums'] = sorted(set(t['nums']))
open(os.path.join(OUT, 'topics.js'), 'w', encoding='utf8').write('window.TOPICS=' + json.dumps(T, ensure_ascii=False, separators=(',', ':')) + ';\n')
HD = {str(e['n']): {'i': e['i'], 'v': e['v'], 's': e['s']} for e in D}
sp = os.path.join(OUT, 'stories.js'); s = open(sp, encoding='utf8').read()
s = re.sub(r'\nwindow\.HDEEP=.*', '', s, flags=re.S).rstrip() + '\n'
s += 'window.HDEEP=' + json.dumps(HD, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(sp, 'w', encoding='utf8').write(s)
print('topics', [(t['id'], len(t['nums'])) for t in T]); print('deep', len(HD))
