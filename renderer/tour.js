// طريقة الاستخدام (from ترنيمات روحية v33): a short tour inside the app. The keyboard keeps working while it is open, so each step can be tried.
(() => {
    const S = [
    { t: 'أهلاً! ده برنامج ترانيم مدارس الأحد', d: 'هوريك في دقيقة إزاي تدوّر وتعرض. تقدر تجرب كل خطوة بالكيبورد والشرح مفتوح.' },
    { el: '#q', tab: 'hymns', t: 'دوّر على ترنيمة', d: 'اكتب أي كلام من الترنيمة على طول — بيتكتب في البحث لوحده، حتى لو فيه غلطة إملائية أو فاكر حتة صغيرة منها بس.<br>جرب: <b>نورها جاي</b>' },
    { el: '#results', tab: 'hymns', t: 'اختار بالأسهم', d: 'انزل بالأسهم <kbd>↓</kbd> <kbd>↑</kbd> ودوس <kbd>Enter</kbd> — الترنيمة بتتفتح من أولها وتظهر على الشاشة.<br>والعدد اللي فيه الكلام اللي دورت عليه بيتعلّم بالأصفر.' },
    { el: '#results', tab: 'hymns', t: 'الترتيب', d: 'الترانيم مرتبة بالحروف، وجوه كل حرف الأحدث الأول.' },
    { el: '#slides', t: 'شرايح الترنيمة', d: 'ضغطة على شريحة = تجهزها، ضغطتين = تظهر.' },
    { el: '.screens', t: 'على الشاشة الآن والتالي', d: 'فوق (الكبيرة) = اللي الولاد شايفينه دلوقتي.<br>تحت (الصغيرة) = اللي جاي.' },
    { el: '.ctrl', t: 'الأزرار', d: '<kbd>مسافة</kbd> = اعرض، <kbd>←</kbd> التالي، <kbd>→</kbd> السابق.' },
    { el: '#blankBtn', t: 'إخفاء الشاشة', d: 'حرف <kbd>B</kbd> سواء الكيبورد إنجليزي أو عربي يخفي الكلام من على الشاشة ويرجعه.' },
    { el: '[data-tab=topics]', tab: 'topics', t: 'المواضيع', d: 'الترانيم متقسمة بمواضيع من الكتاب المقدس — اختار موضوع الدرس وهتلاقي ترانيمه.' },
    { el: '#storyBtn', t: 'قصة مقترحة', d: 'مع كل ترنيمة فيه قصة وشاهد من الكتاب المقدس مناسبين ليها. دوس على القصة تفتح في الكتاب.' },
    { el: '[data-tab=bible]', tab: 'bible', t: 'الكتاب المقدس', d: 'اكتب اختصار السفر والإصحاح والعدد ودوس <kbd>Enter</kbd>، أمثلة:<br><b><bdi>يو ٣ ١٦</bdi></b> = يوحنا ٣: ١٦<br><b><bdi>١كو ١٣ ٤</bdi></b> = كورنثوس الأولى ١٣: ٤<br><b><bdi>امثال8 1</bdi></b> = الأمثال ٨: ١' },
    { el: '#slides', tab: 'bible', t: 'آيات الإصحاح', d: 'بعد ما الآية تظهر، أي رقم + <kbd>Enter</kbd> = آية تانية في نفس الإصحاح.<br>أو انزل بالأسهم <kbd>↓</kbd> <kbd>↑</kbd> ودوس <kbd>Enter</kbd>.' },
    { el: '#setBtn', t: 'الشكل والخط', d: 'اختار ألوان الشرايح والتصميم والخط وحجم الكلام — التغيير بيتطبق على كل الترانيم.' },
    { el: '#openOut', t: 'شاشة العرض', d: 'وصّل البروجكتور واعمل <b>Extend</b> (زرار الويندوز + <kbd>P</kbd>) وشاشة العرض هتفتح عليه <b>لوحدها</b>.<br>الزرار ده بيقولك حالتها: «شغالة على البروجكتور». ولو مفيش بروجكتور تقدر تجرّب الشاشة منه.' },
    { el: '#sugBtn', t: 'ابعت اقتراح', d: 'لقيت غلطة في ترنيمة أو عندك فكرة؟ ابعتها من هنا وهنصلحها للكل.' },
    { t: 'خلاص', d: 'الشرح ده موجود دايماً في زرار "طريقة الاستخدام" فوق.' }
  ];
  let i = 0, box, hole;
  function build() {
    hole = document.createElement('div'); hole.id = 'tourHole';
    box = document.createElement('div'); box.id = 'tourBox';
    document.body.append(hole, box);
  }
  function show() {
    const s = S[i];
    if (s.tab && typeof setTab === 'function' && typeof st !== 'undefined' && st.tab !== s.tab) setTab(s.tab);
    const el = s.el && document.querySelector(s.el);
    box.innerHTML = `<div class="tt">${s.t}</div><div class="td">${s.d}</div>
      <div class="tb"><span>${i + 1} / ${S.length}</span><span class="sp"></span>
      ${i ? '<button class="btn" data-a="prev">السابق</button>' : ''}
      <button class="btn primary" data-a="next">${i === S.length - 1 ? 'إنهاء' : 'التالي'}</button>
      <button class="btn" data-a="close">قفل</button></div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'next') go(1); else if (a === 'prev') go(-1); else close(); });
    if (el) {
      const r = el.getBoundingClientRect(), p = 6;
      Object.assign(hole.style, { display: 'block', left: r.left - p + 'px', top: r.top - p + 'px', width: r.width + 2 * p + 'px', height: r.height + 2 * p + 'px' });
      // card next to the highlighted part, inside the window
      const bw = 380, bh = box.offsetHeight || 200;
      let x = r.left - bw - 18; if (x < 10) x = r.right + 18; if (x + bw > innerWidth - 10) x = Math.max(10, (innerWidth - bw) / 2);
      let y = Math.min(Math.max(10, r.top), innerHeight - bh - 10);
      Object.assign(box.style, { left: x + 'px', top: y + 'px', transform: 'none' });
    } else {
      hole.style.display = 'block'; Object.assign(hole.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
      Object.assign(box.style, { left: '50%', top: '40%', transform: 'translate(-50%,-50%)' });
    }
  }
  function go(d) { i = Math.max(0, Math.min(S.length - 1, i + d)); if (d > 0 && i === S.length - 1 && box.querySelector('[data-a=next]').textContent === 'إنهاء') { close(); return; } show(); }
  function close() { hole.remove(); box.remove(); hole = box = null; try { localStorage.setItem('ss_tourSeen', '1'); } catch (e) {} }
  window.startTour = () => { if (box) close(); i = 0; build(); show(); };
  addEventListener('resize', () => { if (box) show(); });
  // the first time the app opens on a computer
  addEventListener('load', () => { let seen = '1'; try { seen = localStorage.getItem('ss_tourSeen'); } catch (e) {} if (!seen && !(typeof HAD_SET !== 'undefined' && HAD_SET)) setTimeout(window.startTour, 900); });
})();
