/* ══════════════════════════════════════════════════════════════════
   MV — مصحف الحفظ الميسر المطوّر  v1.0
   Enhanced Mushaf Image Viewer — Drop-in enhancement for QV
   Pure vanilla JS | أثر الروح | Bazary_plus

   ── PUBLIC API (mirrors QV exactly, plus extras) ─────────────────
     MV.render()           render current page into #qv-root
     MV.go(n)              navigate to page n and render
     MV._m()               toggle memorization mode
     MV._reveal(on)        reveal / hide memorization overlay
     MV.getPage()          return current page number
     MV.renderAyahText(t)  tajweed-aware text renderer (compat stub)

   ── EXTRA FEATURES (vs the original QV) ─────────────────────────
     • Quick-jump panel   — jump by Juz (1-30) or Surah (1-114)
     • Page bookmarks     — ⭐ star any page; persisted in localStorage
     • Zoom controls      — +/− zoom + reset; persisted in sessionStorage
     • Swipe gestures     — swipe left / right on touch screens
     • Keyboard nav       — ← → arrow keys (bound once on init)
     • Pre-cache ±2 pages  vs ±1 in QV
     • Inline retry button on image error
     • Progress strip     — visual position indicator (page / 604)
     • Sync with QV state — reads/writes qv_page so both stay in sync

   ── SAFETY RULES ─────────────────────────────────────────────────
     • Renders into #qv-root  (same as QV — no new DOM roots needed)
     • NEVER touches S (app state) directly
     • NEVER modifies quran-viewer.js or any existing code
     • If QV is preferred, the caller can fall back with:
         if (typeof MV !== 'undefined') MV.render();
         else if (typeof QV !== 'undefined') QV.render();
══════════════════════════════════════════════════════════════════ */

const MV = (() => {

  /* ════════════════════════════════════════════════════
     DATA TABLES  (Madina mushaf — 604-page layout)
  ════════════════════════════════════════════════════ */

  /**
   * First page of each surah (1-indexed surah → index + 1).
   * Source: standard Madina mushaf page map.
   */
  const SURAH_PAGES = [
     1,  2, 50, 77,106,128,151,177,187,208,  /* 1–10   */
   221,235,249,255,262,267,282,293,312,320,  /* 11–20  */
   332,342,350,359,367,377,385,396,404,411,  /* 21–30  */
   415,418,428,434,440,446,453,458,467,477,  /* 31–40  */
   483,489,496,503,507,511,515,519,523,526,  /* 41–50  */
   528,531,535,537,542,544,546,549,551,553,  /* 51–60  */
   554,556,558,560,562,564,566,568,570,572,  /* 61–70  */
   574,575,577,578,580,581,583,584,586,587,  /* 71–80  */
   587,588,589,590,591,591,592,592,593,593,  /* 81–90  */
   594,595,595,596,596,597,597,598,599,599,  /* 91–100 */
   600,600,601,601,602,602,602,603,603,603,  /* 101–110*/
   603,604,604,604,                          /* 111–114*/
  ];

  /**
   * First page of each juz (1-indexed juz → index + 1).
   */
  const JUZ_PAGES = [
     1, 22, 42, 62, 82,102,122,142,162,182,  /* 1–10  */
   202,222,242,262,282,302,322,342,362,382,  /* 11–20 */
   402,422,442,462,482,502,522,542,562,582,  /* 21–30 */
  ];

  /** Surah names in Arabic (index 0 = surah 1) */
  const SURAH_NAMES = [
    'الفاتحة','البقرة','آل عمران','النساء','المائدة',
    'الأنعام','الأعراف','الأنفال','التوبة','يونس',
    'هود','يوسف','الرعد','إبراهيم','الحجر',
    'النحل','الإسراء','الكهف','مريم','طه',
    'الأنبياء','الحج','المؤمنون','النور','الفرقان',
    'الشعراء','النمل','القصص','العنكبوت','الروم',
    'لقمان','السجدة','الأحزاب','سبأ','فاطر',
    'يس','الصافات','ص','الزمر','غافر',
    'فصلت','الشورى','الزخرف','الدخان','الجاثية',
    'الأحقاف','محمد','الفتح','الحجرات','ق',
    'الذاريات','الطور','النجم','القمر','الرحمن',
    'الواقعة','الحديد','المجادلة','الحشر','الممتحنة',
    'الصف','الجمعة','المنافقون','التغابن','الطلاق',
    'التحريم','الملك','القلم','الحاقة','المعارج',
    'نوح','الجن','المزمل','المدثر','القيامة',
    'الإنسان','المرسلات','النبأ','النازعات','عبس',
    'التكوير','الانفطار','المطففين','الانشقاق','البروج',
    'الطارق','الأعلى','الغاشية','الفجر','البلد',
    'الشمس','الليل','الضحى','الشرح','التين',
    'العلق','القدر','البينة','الزلزلة','العاديات',
    'القارعة','التكاثر','العصر','الهمزة','الفيل',
    'قريش','الماعون','الكوثر','الكافرون','النصر',
    'المسد','الإخلاص','الفلق','الناس',
  ];

  /* ════════════════════════════════════════════════════
     STATE
  ════════════════════════════════════════════════════ */

  /* Seed from MV-specific key, fall back to QV key so they share position */
  let _page    = _clampPage(
    parseInt(localStorage.getItem('mv_page') ||
             localStorage.getItem('qv_page') || '1') || 1
  );
  let _memMode  = false;                /* memorization overlay */
  let _zoomLvl  = _clampZoom(parseFloat(sessionStorage.getItem('mv_zoom') || '1'));
  let _showJmp  = false;                /* quick-jump panel visible */
  let _cache    = {};                   /* page-info cache (runtime) */
  let _swipeX   = null;                 /* touch swipe start X */
  let _kbBound  = false;                /* keyboard listener bound? */

  /* ════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════ */

  function _clampPage(n) { return Math.max(1, Math.min(604, +n || 1)); }
  function _clampZoom(z) { return Math.max(0.6, Math.min(2.5, +z || 1)); }

  /** Western digits → Arabic-Indic numerals */
  function _ar(n) {
    return String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  /** Minimal HTML-escape (attribute-safe) */
  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Image CDN — same as QV for consistency */
  const _imgUrl = p =>
    'https://cdn.islamic.network/quran/images/high-resolution/' + p + '.png';

  /* ─── Bookmarks ─── */
  function _getBookmarks() {
    try { return JSON.parse(localStorage.getItem('mv_bm') || '[]'); } catch { return []; }
  }
  function _saveBookmarks(bm) {
    try { localStorage.setItem('mv_bm', JSON.stringify(bm)); } catch {}
  }
  function _isBookmarked(p) { return _getBookmarks().includes(p); }
  function _toggleBookmark(p) {
    const bm = _getBookmarks();
    const idx = bm.indexOf(p);
    if (idx >= 0) bm.splice(idx, 1); else bm.push(p);
    _saveBookmarks(bm);
  }

  /* ─── Page info (surah label + juz) from API with sessionStorage cache ─── */
  async function _loadInfo(p) {
    if (_cache[p]) return _cache[p];
    try {
      const hit = sessionStorage.getItem('mv_pi_' + p);
      if (hit) { _cache[p] = JSON.parse(hit); return _cache[p]; }
    } catch {}
    try {
      const res  = await fetch('https://api.alquran.cloud/v1/page/' + p + '/quran-uthmani');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const ayahs = (json.data && json.data.ayahs) || [];
      const seen  = new Set();
      const surahLabel = ayahs
        .map(a => a.surah && a.surah.name)
        .filter(n => n && !seen.has(n) && seen.add(n))
        .join(' — ');
      const result = {
        surahLabel,
        juz:        ayahs.length ? (ayahs[0].juz || '') : '',
        firstSurah: ayahs.length && ayahs[0].surah ? ayahs[0].surah.number : 0,
      };
      _cache[p] = result;
      try { sessionStorage.setItem('mv_pi_' + p, JSON.stringify(result)); } catch {}
      return result;
    } catch {
      return { surahLabel: '', juz: '', firstSurah: 0 };
    }
  }

  /* ─── Pre-cache adjacent page images (±2 pages) ─── */
  function _preload(p) {
    for (let d = -2; d <= 2; d++) {
      const n = p + d;
      if (n >= 1 && n <= 604 && d !== 0) {
        const img = new Image(); img.src = _imgUrl(n);
      }
    }
  }

  /* ─── Touch / pointer swipe ─── */
  function _initSwipe(el) {
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 1) _swipeX = e.touches[0].clientX;
    }, { passive: true });
    el.addEventListener('touchend', e => {
      if (_swipeX === null) return;
      const dx = e.changedTouches[0].clientX - _swipeX;
      _swipeX = null;
      if (Math.abs(dx) < 50) return;
      /* RTL mushaf: swipe left → next page, swipe right → prev page */
      if (dx < 0) _pub.go(_page + 1);
      else        _pub.go(_page - 1);
    }, { passive: true });
  }

  /* ─── Keyboard navigation (bound only once per page-lifetime) ─── */
  function _bindKeyboard() {
    if (_kbBound) return;
    _kbBound = true;
    document.addEventListener('keydown', e => {
      /* Only active when the image-viewer panel is visible */
      if (!document.getElementById('mv-img-wrap')) return;
      if (['INPUT','TEXTAREA','SELECT'].includes(
          (document.activeElement || {}).tagName || '')) return;
      if (e.key === 'ArrowLeft')  _pub.go(_page + 1);
      if (e.key === 'ArrowRight') _pub.go(_page - 1);
    });
  }

  /* ════════════════════════════════════════════════════
     HTML BUILDERS
  ════════════════════════════════════════════════════ */

  /** Loading spinner (shown before render completes) */
  function _spinnerHTML() {
    return (
      '<div style="text-align:center;padding:80px 20px;">' +
        '<div style="width:48px;height:48px;border:4px solid #cde8e1;' +
          'border-top-color:#2d8f7b;border-radius:50%;' +
          'animation:mvSpin .8s linear infinite;margin:0 auto 16px;"></div>' +
        '<div style="color:#7a9e98;font-size:14px;font-weight:700;">' +
          'جاري تحميل صفحة القرآن الكريم…' +
        '</div>' +
      '</div>'
    );
  }

  /** Quick-jump panel (Juz buttons + Surah dropdown) */
  function _jumpHTML() {
    if (!_showJmp) return '';

    /* Juz buttons — highlight the active juz */
    const activeJuz = JUZ_PAGES.reduce((best, pg, i) => {
      return (pg <= _page) ? i : best;
    }, 0);

    const juzBtns = JUZ_PAGES.map((pg, i) => {
      const active = i === activeJuz;
      return (
        '<button onclick="MV.goJuz(' + (i + 1) + ')" title="الجزء ' + _ar(i + 1) + '" ' +
          'style="padding:6px 10px;border-radius:9px;border:1.5px solid ' +
            (active ? '#2d8f7b' : 'var(--brd)') + ';' +
          'background:' + (active
            ? 'linear-gradient(135deg,#2d8f7b,#1a6b5a);color:#fff;'
            : 'var(--cream);color:var(--mid);') +
          'font-family:\'Tajawal\',sans-serif;font-size:12px;font-weight:700;' +
          'cursor:pointer;transition:all .2s;line-height:1;">' +
          _ar(i + 1) +
        '</button>'
      );
    }).join('');

    /* Surah dropdown */
    const surahOpts = SURAH_NAMES.map((name, i) => {
      const pg = SURAH_PAGES[i];
      const sel = (_page >= pg && (SURAH_PAGES[i + 1] === undefined || _page < SURAH_PAGES[i + 1]))
        ? ' selected' : '';
      return '<option value="' + (i + 1) + '"' + sel + '>' +
        (i + 1) + '. ' + _esc(name) + ' — ص' + _ar(pg) +
      '</option>';
    }).join('');

    return (
      '<div id="mv-jump" style="background:#fff;border-radius:16px;padding:18px;' +
        'margin-bottom:13px;box-shadow:0 4px 20px rgba(45,143,123,.12);' +
        'border:1px solid rgba(45,143,123,.14);">' +

        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
          '<div style="font-weight:900;font-size:14px;color:var(--td);">🧭 الانتقال السريع</div>' +
          '<button onclick="MV._toggleJump()" ' +
            'style="background:none;border:none;cursor:pointer;color:var(--lt);' +
              'font-size:17px;padding:2px 8px;line-height:1;">✕</button>' +
        '</div>' +

        /* Juz section */
        '<div style="margin-bottom:14px;">' +
          '<div style="font-size:10.5px;font-weight:900;color:var(--lt);' +
            'text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">الأجزاء الثلاثون</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:5px;">' + juzBtns + '</div>' +
        '</div>' +

        /* Surah section */
        '<div>' +
          '<div style="font-size:10.5px;font-weight:900;color:var(--lt);' +
            'text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">انتقال بالسورة</div>' +
          '<select onchange="MV.goSurah(parseInt(this.value))" ' +
            'style="width:100%;padding:10px 12px;border:2px solid var(--brd);border-radius:11px;' +
              'font-family:\'Amiri\',serif;font-size:14px;color:var(--dark);' +
              'background:var(--cream);outline:none;direction:rtl;appearance:none;' +
              '-webkit-appearance:none;cursor:pointer;">' +
            surahOpts +
          '</select>' +
        '</div>' +

      '</div>'
    );
  }

  /** Bookmarks mini-bar (up to 6 bookmarked pages) */
  function _bookmarksHTML() {
    const bm = _getBookmarks();
    if (!bm.length) return '';

    const items = bm.sort((a, b) => a - b).slice(0, 6).map(p => {
      const active = p === _page;
      return (
        '<button onclick="MV.go(' + p + ')" ' +
          'style="padding:5px 12px;border-radius:20px;' +
            'border:1.5px solid ' + (active ? 'var(--t)' : 'var(--brd)') + ';' +
            'background:' + (active ? 'var(--t);color:#fff' : 'var(--cream);color:var(--td)') + ';' +
            'font-family:\'Tajawal\',sans-serif;font-size:12px;font-weight:700;' +
            'cursor:pointer;transition:all .2s;">' +
          _ar(p) + ' ✦' +
        '</button>'
      );
    }).join('');

    return (
      '<div style="background:rgba(201,162,39,.07);border-radius:12px;padding:10px 14px;' +
        'margin-bottom:12px;border:1px solid rgba(201,162,39,.2);">' +
        '<div style="font-size:10.5px;font-weight:900;color:var(--gd);' +
          'margin-bottom:8px;letter-spacing:.5px;">🔖 صفحاتي المحفوظة</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + items + '</div>' +
      '</div>'
    );
  }

  /* ════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════ */
  async function render() {
    const root = document.getElementById('qv-root');
    if (!root) return;

    /* Show spinner immediately */
    root.innerHTML = _spinnerHTML();

    /* Bind keyboard once */
    _bindKeyboard();

    /* Pre-load ±2 adjacent images in the background */
    _preload(_page);

    /* Fetch page metadata */
    let info = { surahLabel: '', juz: '', firstSurah: 0 };
    try { info = await _loadInfo(_page); } catch (_) {}

    const p       = _page;
    const bm      = _isBookmarked(p);
    const pct     = Math.round(p / 604 * 100);
    const isDark  = document.documentElement.classList.contains('dark-mode');

    /* ── 1. Progress strip ── */
    const progressBar =
      '<div style="height:4px;border-radius:4px;background:var(--brd);' +
        'margin-bottom:12px;overflow:hidden;">' +
        '<div style="height:100%;width:' + pct + '%;' +
          'background:linear-gradient(90deg,#2d8f7b,#e8c84a);border-radius:4px;' +
          'transition:width .6s ease;"></div>' +
      '</div>';

    /* ── 2. Top bar ── */
    const topBar =
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:7px;' +
        'padding:11px 14px;background:linear-gradient(135deg,#071a15,#0f3028,#1a6b5a);' +
        'border-radius:14px;margin-bottom:11px;color:#fff;box-shadow:0 4px 16px rgba(5,15,11,.35);">' +

        /* Surah / juz label */
        '<div style="font-family:\'Amiri\',serif;font-size:13.5px;line-height:1.6;flex:1;min-width:0;' +
          'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
          (info.surahLabel ? 'سورة ' + _esc(info.surahLabel) : '&nbsp;') +
          (info.juz
            ? ' <span style="font-size:11px;opacity:.55;"> — جزء ' + _esc(String(info.juz)) + '</span>'
            : '') +
        '</div>' +

        /* Page counter */
        '<div style="color:#e8c84a;font-weight:900;font-family:\'Amiri\',serif;font-size:14px;' +
          'flex-shrink:0;margin:0 6px;">' +
          'صفحة ' + _ar(p) + ' ╱ ' + _ar(604) +
        '</div>' +

        /* Action buttons */
        '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">' +

          /* Bookmark toggle */
          '<button onclick="MV._bmToggle(' + p + ')" ' +
            'title="' + (bm ? 'إلغاء حفظ الصفحة' : 'حفظ هذه الصفحة') + '" ' +
            'style="padding:6px 11px;border-radius:20px;border:none;cursor:pointer;' +
              'font-size:13px;transition:all .2s;font-family:\'Tajawal\',sans-serif;font-size:11px;font-weight:700;' +
              (bm
                ? 'background:rgba(201,162,39,.3);color:#e8c84a;'
                : 'background:rgba(255,255,255,.12);color:rgba(255,255,255,.65);') +
            '">' +
            (bm ? '🔖 محفوظة' : '🔖 حفظ') +
          '</button>' +

          /* Quick-jump toggle */
          '<button onclick="MV._toggleJump()" ' +
            'style="padding:6px 11px;border-radius:20px;border:none;cursor:pointer;' +
              'font-family:\'Tajawal\',sans-serif;font-size:11px;font-weight:800;' +
              'background:rgba(255,255,255,.12);color:rgba(255,255,255,.75);transition:all .2s;">' +
            '🧭 انتقال' +
          '</button>' +

          /* Memorization mode toggle */
          '<button onclick="MV._m()" ' +
            'style="padding:6px 12px;border-radius:20px;border:none;cursor:pointer;' +
              'font-family:\'Tajawal\',sans-serif;font-size:11px;font-weight:800;flex-shrink:0;transition:all .2s;' +
              (_memMode
                ? 'background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;'
                : 'background:linear-gradient(135deg,#e8c84a,#c9a227);color:#1a0a00;') +
            '">' +
            (_memMode ? '🙈 إيقاف الحفظ' : '📖 وضع الحفظ') +
          '</button>' +

        '</div>' +
      '</div>';

    /* ── 3. Memorization hint ── */
    const memHint = _memMode
      ? '<div style="background:linear-gradient(135deg,#fff8e1,#fff3c4);border-radius:10px;' +
          'padding:9px 14px;margin-bottom:10px;font-size:12px;font-weight:700;color:#8a6b00;' +
          'border:1px solid rgba(201,162,39,.3);">' +
          '💡 اضغطي باستمرار لكشف الصفحة — ارفعي الإصبع لإخفائها' +
        '</div>'
      : '';

    /* ── 4. Zoom controls ── */
    const zoomBar =
      '<div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-bottom:9px;">' +
        '<button onclick="MV._zoom(-0.1)" title="تصغير" ' +
          'style="width:30px;height:30px;border-radius:50%;border:1.5px solid var(--brd);' +
            'background:var(--cream);color:var(--td);font-size:18px;font-weight:900;cursor:pointer;' +
            'display:flex;align-items:center;justify-content:center;line-height:1;transition:all .2s;">' +
          '−' +
        '</button>' +
        '<span id="mv-zoom-lbl" style="font-size:11px;color:var(--lt);font-weight:700;' +
          'min-width:38px;text-align:center;">' +
          Math.round(_zoomLvl * 100) + '%' +
        '</span>' +
        '<button onclick="MV._zoom(0.1)" title="تكبير" ' +
          'style="width:30px;height:30px;border-radius:50%;border:1.5px solid var(--brd);' +
            'background:var(--cream);color:var(--td);font-size:18px;font-weight:900;cursor:pointer;' +
            'display:flex;align-items:center;justify-content:center;line-height:1;transition:all .2s;">' +
          '＋' +
        '</button>' +
        '<button onclick="MV._zoom(0)" title="الحجم الطبيعي" ' +
          'style="padding:4px 10px;border-radius:8px;border:1.5px solid var(--brd);' +
            'background:var(--cream);color:var(--lt);font-size:11px;font-weight:700;cursor:pointer;' +
            'transition:all .2s;font-family:\'Tajawal\',sans-serif;">' +
          (_zoomLvl !== 1 ? '↩ إعادة' : '100%') +
        '</button>' +
      '</div>';

    /* ── 5. Image container ── */
    const imgWrap =
      '<div id="mv-img-wrap" ' +
        'style="position:relative;border-radius:14px;overflow:hidden;background:#fdf8ef;' +
          'box-shadow:0 5px 24px rgba(0,0,0,.12);border:1px solid rgba(201,162,39,.18);' +
          'margin-bottom:12px;user-select:none;touch-action:pan-y;cursor:grab;"' +
        (_memMode
          ? ' ontouchstart="MV._reveal(1);event.preventDefault()"' +
            ' ontouchend="MV._reveal(0)"' +
            ' onmousedown="MV._reveal(1)"' +
            ' onmouseup="MV._reveal(0)"' +
            ' onmouseleave="MV._reveal(0)"'
          : '') +
        '>' +

        /* Zoom wrapper — scale without affecting layout */
        '<div id="mv-zoom-wrap" ' +
          'style="transform:scale(' + _zoomLvl + ');transform-origin:top center;' +
            'transition:transform .25s cubic-bezier(.34,1.1,.64,1);">' +
          '<img id="mv-img" src="' + _imgUrl(p) + '" alt="صفحة ' + p + '" ' +
            'style="width:100%;height:auto;display:block;" draggable="false" loading="eager" ' +
            'onload="(function(){var l=document.getElementById(\'mv-loader\');' +
              'if(l)l.style.display=\'none\';})()" ' +
            'onerror="(function(){' +
              'document.getElementById(\'mv-err\').style.display=\'flex\';' +
              'document.getElementById(\'mv-loader\').style.display=\'none\';' +
              'this.style.display=\'none\';}).call(this)">' +
        '</div>' +

        /* Loading overlay — disappears once image fires onload */
        '<div id="mv-loader" ' +
          'style="position:absolute;inset:0;background:#fdf8ef;' +
            'display:flex;align-items:center;justify-content:center;' +
            'pointer-events:none;z-index:5;">' +
          '<div style="width:40px;height:40px;border:4px solid #cde8e1;' +
            'border-top-color:#2d8f7b;border-radius:50%;' +
            'animation:mvSpin .8s linear infinite;"></div>' +
        '</div>' +

        /* Memorization overlay */
        '<div id="mv-mem-ov" ' +
          'style="display:' + (_memMode ? 'flex' : 'none') + ';' +
            'position:absolute;inset:0;background:rgba(8,18,16,.92);pointer-events:none;' +
            'align-items:center;justify-content:center;flex-direction:column;gap:10px;">' +
          '<div style="font-size:40px;">🙈</div>' +
          '<div style="color:rgba(255,255,255,.55);font-size:13px;font-weight:700;">' +
            'اضغطي للكشف المؤقت' +
          '</div>' +
        '</div>' +

        /* Image error state with retry */
        '<div id="mv-err" ' +
          'style="display:none;flex-direction:column;align-items:center;' +
            'justify-content:center;padding:60px 20px;min-height:220px;text-align:center;">' +
          '<div style="font-size:48px;margin-bottom:14px;opacity:.3;">🖼️</div>' +
          '<div style="font-weight:800;font-size:14px;color:#3d5c55;margin-bottom:8px;">' +
            'صورة الصفحة غير متاحة' +
          '</div>' +
          '<div style="font-size:12px;color:#7a9e98;margin-bottom:14px;">' +
            'تحققي من الاتصال بالإنترنت' +
          '</div>' +
          '<button onclick="MV.go(' + p + ')" ' +
            'style="padding:9px 22px;border-radius:11px;border:none;cursor:pointer;' +
              'background:linear-gradient(135deg,#2d8f7b,#1a6b5a);color:#fff;' +
              'font-family:\'Tajawal\',sans-serif;font-size:13px;font-weight:800;' +
              'box-shadow:0 4px 14px rgba(45,143,123,.3);">' +
            '🔄 إعادة المحاولة' +
          '</button>' +
        '</div>' +

      '</div>';

    /* ── 6. Footer navigation ── */
    const footer =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;' +
        'background:#fff;border-radius:13px;padding:10px 14px;' +
        'box-shadow:0 2px 10px rgba(45,143,123,.07);border:1px solid rgba(45,143,123,.1);' +
        'margin-bottom:14px;">' +

        /* Prev page */
        '<button onclick="MV.go(' + (p - 1) + ')"' + (p <= 1 ? ' disabled' : '') +
          ' style="padding:9px 18px;border-radius:10px;border:none;font-family:\'Tajawal\',sans-serif;' +
            'font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;' +
            (p <= 1
              ? 'background:#f0f0f0;color:#bbb;cursor:not-allowed;'
              : 'background:linear-gradient(135deg,#2d8f7b,#1a6b5a);color:#fff;' +
                'box-shadow:0 3px 9px rgba(45,143,123,.3);') +
          '">◄</button>' +

        /* Page input */
        '<div style="flex:1;text-align:center;">' +
          '<input type="number" min="1" max="604" value="' + p + '" ' +
            'onchange="MV.go(parseInt(this.value)||1)" ' +
            'style="width:72px;padding:7px;border:2px solid #cde8e1;border-radius:9px;' +
              'font-size:15px;font-weight:700;text-align:center;color:#1a6b5a;' +
              'background:#faf8f2;outline:none;font-family:\'Tajawal\',sans-serif;" ' +
            'onfocus="this.style.borderColor=\'#2d8f7b\'" ' +
            'onblur="this.style.borderColor=\'#cde8e1\'">' +
          '<div style="font-size:10.5px;color:#7a9e98;margin-top:3px;">من ' + _ar(604) + ' صفحة</div>' +
        '</div>' +

        /* Next page */
        '<button onclick="MV.go(' + (p + 1) + ')"' + (p >= 604 ? ' disabled' : '') +
          ' style="padding:9px 18px;border-radius:10px;border:none;font-family:\'Tajawal\',sans-serif;' +
            'font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;' +
            (p >= 604
              ? 'background:#f0f0f0;color:#bbb;cursor:not-allowed;'
              : 'background:linear-gradient(135deg,#2d8f7b,#1a6b5a);color:#fff;' +
                'box-shadow:0 3px 9px rgba(45,143,123,.3);') +
          '">►</button>' +

      '</div>';

    /* ── Assemble all parts ── */
    root.innerHTML =
      progressBar +
      topBar +
      memHint +
      _jumpHTML() +
      _bookmarksHTML() +
      zoomBar +
      imgWrap +
      footer;

    /* Wire up swipe after DOM is ready */
    const wrap = document.getElementById('mv-img-wrap');
    if (wrap) _initSwipe(wrap);
  }

  /* ════════════════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════════════════ */
  const _pub = {

    /** Render current page. Called by index.html's renderQuran / qrTabSwitch. */
    render,

    /** Navigate to absolute page number n. */
    go(n) {
      _page = _clampPage(n);
      /* Keep both MV key and QV key in sync so switching viewers
         preserves the last-viewed page */
      try {
        localStorage.setItem('mv_page', String(_page));
        localStorage.setItem('qv_page', String(_page));
      } catch {}
      render();
    },

    /** Toggle memorization overlay mode. */
    _m() {
      _memMode = !_memMode;
      render();
    },

    /**
     * Reveal (on=1) or hide (on=0) the memorization overlay.
     * Called via ontouchstart / onmousedown inline events.
     */
    _reveal(on) {
      const ov = document.getElementById('mv-mem-ov');
      if (ov) ov.style.opacity = on ? '0' : '1';
    },

    /** Toggle bookmark for page p and re-render. */
    _bmToggle(p) {
      _toggleBookmark(p);
      render();
    },

    /** Show / hide the quick-jump panel. */
    _toggleJump() {
      _showJmp = !_showJmp;
      render();
    },

    /**
     * Zoom in / out / reset.
     * @param {number} delta  +0.1 = zoom in, -0.1 = zoom out, 0 = reset to 100 %
     */
    _zoom(delta) {
      if (delta === 0) {
        _zoomLvl = 1;
      } else {
        _zoomLvl = _clampZoom(
          Math.round((_zoomLvl + delta) * 10) / 10
        );
      }
      try { sessionStorage.setItem('mv_zoom', String(_zoomLvl)); } catch {}

      /* Fast path: update only the zoom wrapper + label without a full re-render */
      const zw  = document.getElementById('mv-zoom-wrap');
      const lbl = document.getElementById('mv-zoom-lbl');
      if (zw && lbl) {
        zw.style.transform = 'scale(' + _zoomLvl + ')';
        lbl.textContent    = Math.round(_zoomLvl * 100) + '%';
        /* Re-render the zoom bar button label ("إعادة" ↔ "100%") */
        const resetBtn = lbl.nextElementSibling;
        if (resetBtn) resetBtn.textContent = (_zoomLvl !== 1) ? '↩ إعادة' : '100%';
      } else {
        render();
      }
    },

    /**
     * Jump to the first page of surah n (1-indexed).
     * Falls back to page 1 if n is out of range.
     */
    goSurah(n) {
      const idx = Math.max(0, Math.min(113, (n || 1) - 1));
      this.go(SURAH_PAGES[idx] || 1);
    },

    /**
     * Jump to the first page of juz n (1-indexed).
     * Falls back to page 1 if n is out of range.
     */
    goJuz(n) {
      const idx = Math.max(0, Math.min(29, (n || 1) - 1));
      this.go(JUZ_PAGES[idx] || 1);
    },

    /** Return the current page number. */
    getPage() { return _page; },

    /**
     * renderAyahText — compatibility stub matching QV's public API.
     * Used by any future annotation / overlay feature.
     * Returns HTML with tajweed colouring if the engine is loaded, else plain.
     */
    renderAyahText(rawText) {
      const tajweedOn =
        (typeof S !== 'undefined' && S.quran && S.quran.tajweedOn) ||
        localStorage.getItem('qv_tajweed') === '1';
      if (tajweedOn && typeof applyTajweed === 'function') {
        return applyTajweed(rawText);
      }
      return String(rawText || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /* ── Legacy stubs (mirror QV public surface exactly) ── */
    _h() {}, _s() {}, _play() {}, _tadabbur() {}, _mutash() {},
  };

  return _pub;

})();
