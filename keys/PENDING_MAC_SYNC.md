# Cloud changes waiting to be copied to Shady's Mac

The weekly cloud task (Wednesday 10:47 Cairo) adds a line here every time it publishes keys.
In the next chat that has the Mac: copy the site file app/data/keys.js to
~/Movies/Claude/SundaySchool_Presenter/data/keys.js, snapshot versions/vNN, then change the
line's status to «synced <date>» and push.


★ RULE (Shady, 2026-11-25): anything done while the Mac is unreachable is logged here. The FIRST chat that reaches the Mac applies every «pending» / «pending-mac» row before anything else, then updates HANDOFF CURRENT STATE + NEW_CHAT_PROMPT + _brain (CHANGELOG/OPEN_ITEMS) and marks the rows «synced <date>».
Status «pending» = keys only (the Wednesday Mac-sync task handles those). «pending-mac» = hymn/data work the scheduled task must NOT mark — a chat does it.
(Mac caught up 2026-11-25 13:30 — HANDOFF/NEW_CHAT_PROMPT/_brain updated.)

| date | what | status |
|---|---|---|
| 2026-11-25 | DATA 14: topic 30 «آيات مرنّمة» +18 hymns → in data/hymn_deep.json add 30 to "t" of: 41,134,74,803,642,344,694,91,566,398,380,392,283,432,24,105,226,478 (see keys/pending/2026-11-25_data14-15.json) | synced 2026-11-25 (Mac v48; 971–974 have no source_fixes pptx yet — see HANDOFF) |
| 2026-11-25 | DATA 15: new hymns #971 «لا تنظروا», #972 «أنا مش هستغرب» made in the cloud (from Shady's WhatsApp text, no pptx). On the Mac: make source_fixes pptx for both (slides exactly as in the json, labels ق/1/2) so build_hymns keeps them, add to keep_files/file_dates/layout_asis as needed, add hymn_deep entries (json), copy renderer/data hymns.js+stories.js+topics.js+content.json to Mac data/, versions/vNN, sheet rows if missing | synced 2026-11-25 (Mac v48; 971–974 have no source_fixes pptx yet — see HANDOFF) |
| 2026-11-25 | DATA 16: new hymns #973 «هكذا أحب الله العالم», #974 «لا لا تشاكلوا» (from Shady's screenshots, no labels = as the source). Same Mac steps as DATA 15 (source_fixes pptx, hymn_deep entries, copy renderer/data, versions/vNN, sheet rows) | synced 2026-11-25 (Mac v48; 971–974 have no source_fixes pptx yet — see HANDOFF) |
| 2026-11-25 | DATA 21 (no notes = no popup): titles «الشعار ده قرارك»→«ده قرارك», «ربي خلقني خليقة جديدة - الشعار»→«ربي خلقني خليقة جديدة», «لازم يشوفوك فيا - الشعار»→«لازم يشوفوك فيا», «انت جند يسوع البار»→«انت جندي يسوع البار»; «فيه واحد بيحبك» first slide (photo/photo) removed. On the Mac: add raw_fixes.jsonl records + fix the source pptx/hymns.json so build_hymns keeps them, copy renderer/data, versions/vNN, rename in the sheets | synced 2026-11-25 (title_fixes.txt + raw_fixes; data 22 relabels verses 1-3 to match the Mac build) |
| 2026-11-25 | keys.js published (+1 ~0 -0: «نفسي ياربي وده شوق قلبي» Dm -2), by hand in chat | synced 2026-11-25 (Mac v51) |
| 2026-11-25 | DATA 24: new hymn #976 «علبة ألواني بتعلمني» (from Shady's St-Takla PDF, labels ق/1-7, chorus after each verse; topics 3,7,12,27; story خلق آدم تك 2: 7). On the Mac: source_fixes pptx + raw_fixes record (rule), keep_files/file_dates/layout_asis, hymn_deep entry, copy renderer/data, versions/vNN, rebuild 0 diffs; ALSO add its row to the Keys sheet (A=976, B name, C first line, D 2026-11-25, I unticked) | synced 2026-11-25 (Mac v51 + Keys sheet row) |
| 2026-11-25 | keys.js published (+38 ~0 -0 → 125; «لازم يشوفوك فيا» written «c» in the sheet, published as C), by hand in chat | pending |
| 2026-11-25 | Save WhatsApp draft to communication/رسائل واتساب as «06 - راجي ووسيم - أسئلة على شيت الـKeys (مسودة).txt»: «مساء الفل يا رجالة، تسلم إيدكم على الشغل الجميل ده، الرب يبارككم، نزلنا 38 Key جديد على البرنامج. / بس حاجتين صغيرين: / 1. «قابلني بكل اللي فيَّ» مكتوب لها D#m، ده صح؟ / 2. لسه مستنيين الـ✓: «لانك انت قدير»، «ربي خلقني خليقة جديدة»، «بعد الرحلة والمشوار»، «مين ساكن فى قلبك».» (« / » = new line). ALSO: Keys sheet, «لازم يشوفوك فيا» column E: change «c» to «C» (Shady: fix it ourselves; the app already has C) | pending-mac |
| 2026-11-25 | HANDOFF note: 17:53 Keys publish hit GitHub Pages deploy error 500 twice (site stayed on 88 Keys); a 3rd empty-commit push deployed OK 18:11 and Shady confirmed on his phone. LESSON: after every site push run `gh run list -L 2` and if the Pages run failed push an empty commit; the cloud WebFetch can show a stale copy, the phone is the real check. | pending-mac |
| 2026-11-25 | REMIND SHADY (he asked) when he is at the computer: claude.ai in a web browser › Settings › Capabilities › allowed domains → add brethrensundayschoolpresenter.github.io, so Claude can check the live site itself after each publish. Also add it to _brain/OPEN_ITEMS. | pending-mac |
| 2026-11-25 | keys.js published (+86 ~0 -0 → 212, all Wassim), 20:38, deploy OK | pending |
