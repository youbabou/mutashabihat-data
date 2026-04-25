/* ══════════════════════════════════════════════════════════════════
   QV — مصحف الحفظ الميسر  v3.1
   Pure vanilla JS | أثر الروح | Bazary_plus

   ✅ Image only — no verse list, no action buttons
   ✅ Page images : cdn.islamic.network/quran/images/high-resolution/{n}.png
   ✅ Page info   : api.alquran.cloud/v1/page/{n}/quran-uthmani (sessionStorage cache)
   ✅ Footer: page navigation only (tafseer handled in index.html text reader)
   ✅ Tajweed: text rendering delegated to tajweed-map.js via window.applyTajweed()
              (This viewer shows page images; tajweed coloring applies to the
               text reader in index.html which calls applyTajweed() directly.)
══════════════════════════════════════════════════════════════════ */

const QV = (() => {

  /* ─── state ─── */
  let _page    = _clampPage(parseInt(localStorage.getItem('qv_page') || '1') || 1);
  let _memMode = false;
  let _cache   = {};   /* page → { surahLabel, juz } */

  const _imgUrl = p => 'https://cdn.islamic.network/quran/images/high-resolution/' + p + '.png';

  function _clampPage(n) { return Math.max(1, Math.min(604, +n || 1)); }
  function _ar(n)  { return String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]); }
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─── lightweight page info (surah name + juz only) ─── */
  async function _loadInfo(p) {
    if (_cache[p]) return _cache[p];
    try {
      const hit = sessionStorage.getItem('qv_' + p);
      if (hit) { _cache[p] = JSON.parse(hit); return _cache[p]; }
    } catch {}

    const res = await fetch('https://api.alquran.cloud/v1/page/' + p + '/quran-uthmani');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const ayahs = (json.data && json.data.ayahs) || [];

    const seen = new Set();
    const surahLabel = ayahs
      .map(a => a.surah && a.surah.name)
      .filter(n => n && !seen.has(n) && seen.add(n))
      .join(' — ');

    /* also stash first surah number for tadabbur deep-link */
    const firstSurah = ayahs.length && ayahs[0].surah ? ayahs[0].surah.number : 0;

    const result = {
      surahLabel,
      juz:        ayahs.length ? ayahs[0].juz || '' : '',
      firstSurah,
    };
    _cache[p] = result;
    try { sessionStorage.setItem('qv_' + p, JSON.stringify(result)); } catch {}
    return result;
  }

  /* ─── spinner ─── */
  function _spin(msg) {
    return (
      '<div style="text-align:center;padding:70px 20px;">' +
      '<div style="width:44px;height:44px;border:4px solid #cde8e1;border-top-color:#2d8f7b;' +
        'border-radius:50%;animation:qrspin .8s linear infinite;margin:0 auto 16px;"></div>' +
      '<div style="color:#7a9e98;font-size:14px;font-weight:700;">' + _esc(msg) + '</div></div>'
    );
  }

  /* ══════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════ */
  async function render() {
    const root = document.getElementById('qv-root');
    if (!root) return;

    root.innerHTML = _spin('جاري تحميل الصفحة…');

    let info = { surahLabel: '', juz: '', firstSurah: 0 };
    try { info = await _loadInfo(_page); } catch (_) { /* render with no labels */ }

    const p = _page;

    /* Preload adjacent images */
    [p - 1, p + 1].forEach(function(n) {
      if (n >= 1 && n <= 604) { var i = new Image(); i.src = _imgUrl(n); }
    });

    /* ── top bar ── */
    const topBar =
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;' +
        'padding:11px 15px;background:linear-gradient(135deg,#071a15,#0f3028,#1a6b5a);' +
        'border-radius:14px;margin-bottom:12px;color:#fff;box-shadow:0 4px 16px rgba(5,15,11,.35);">' +

        '<div style="font-family:\'Amiri\',serif;font-size:14px;line-height:1.6;flex:1;min-width:0;' +
          'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
          (info.surahLabel ? 'سورة ' + _esc(info.surahLabel) : '&nbsp;') +
          (info.juz ? ' <span style="font-size:11px;opacity:.55;">— جزء ' + info.juz + '</span>' : '') +
        '</div>' +

        '<div style="color:#e8c84a;font-weight:900;font-family:\'Amiri\',serif;font-size:15px;' +
          'flex-shrink:0;margin:0 8px;">صفحة ' + _ar(p) + ' ╱ ' + _ar(604) + '</div>' +

        '<button onclick="QV._m()" style="padding:7px 14px;border-radius:20px;border:none;cursor:pointer;' +
          'font-family:\'Tajawal\',sans-serif;font-size:12px;font-weight:800;flex-shrink:0;transition:all .2s;' +
          (_memMode
            ? 'background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;'
            : 'background:linear-gradient(135deg,#e8c84a,#c9a227);color:#1a0a00;') +
          '">' + (_memMode ? '🙈 إيقاف الحفظ' : '📖 وضع الحفظ') + '</button>' +
      '</div>';

    /* ── memorization hint ── */
    const memHint = _memMode
      ? '<div style="background:linear-gradient(135deg,#fff8e1,#fff3c4);border-radius:10px;' +
          'padding:10px 14px;margin-bottom:11px;font-size:12.5px;font-weight:700;color:#8a6b00;' +
          'border:1px solid rgba(201,162,39,.3);">' +
          '💡 اضغطي باستمرار لكشف الصفحة — ارفعي الإصبع لإخفائها</div>'
      : '';

    /* ── image container ── */
    const imgWrap =
      '<div id="qv-img-wrap" ' +
        'style="position:relative;border-radius:14px;overflow:hidden;background:#fdf8ef;' +
          'box-shadow:0 5px 24px rgba(0,0,0,.12);border:1px solid rgba(201,162,39,.18);' +
          'margin-bottom:12px;user-select:none;"' +
        (_memMode
          ? ' ontouchstart="QV._reveal(1);event.preventDefault()" ontouchend="QV._reveal(0)"' +
            ' onmousedown="QV._reveal(1)" onmouseup="QV._reveal(0)" onmouseleave="QV._reveal(0)"'
          : '') + '>' +

        '<img id="qv-img" src="' + _imgUrl(p) + '" alt="صفحة ' + p + '"' +
          ' style="width:100%;height:auto;display:block;" draggable="false" loading="eager"' +
          ' onerror="document.getElementById(\'qv-err\').style.display=\'flex\';this.style.display=\'none\'">' +

        /* memorization overlay */
        '<div id="qv-mem-ov" style="display:' + (_memMode ? 'flex' : 'none') + ';' +
          'position:absolute;inset:0;background:rgba(8,18,16,.92);pointer-events:none;' +
          'align-items:center;justify-content:center;flex-direction:column;gap:10px;">' +
          '<div style="font-size:36px;">🙈</div>' +
          '<div style="color:rgba(255,255,255,.55);font-size:13px;font-weight:700;">اضغطي للكشف المؤقت</div>' +
        '</div>' +

        /* image error */
        '<div id="qv-err" style="display:none;flex-direction:column;align-items:center;' +
          'justify-content:center;padding:60px 20px;min-height:200px;text-align:center;">' +
          '<div style="font-size:48px;margin-bottom:12px;opacity:.3;">🖼️</div>' +
          '<div style="font-weight:800;font-size:14px;color:#3d5c55;margin-bottom:6px;">صورة الصفحة غير متاحة</div>' +
          '<div style="font-size:11.5px;color:#7a9e98;">تحققي من الاتصال بالإنترنت</div>' +
        '</div>' +
      '</div>';

    /* ── footer bar: page navigation ── */
    const footer =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;' +
        'background:#fff;border-radius:13px;padding:11px 14px;' +
        'box-shadow:0 2px 10px rgba(45,143,123,.07);border:1px solid rgba(45,143,123,.1);' +
        'margin-bottom:14px;">' +

        /* prev */
        '<button onclick="QV.go(' + (p - 1) + ')"' + (p <= 1 ? ' disabled' : '') +
          ' style="padding:9px 16px;border-radius:10px;border:none;font-family:\'Tajawal\',sans-serif;' +
          'font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;' +
          (p <= 1
            ? 'background:#f0f0f0;color:#bbb;cursor:not-allowed;'
            : 'background:linear-gradient(135deg,#2d8f7b,#1a6b5a);color:#fff;' +
              'box-shadow:0 3px 9px rgba(45,143,123,.3);') +
          '">◄</button>' +

        /* page input + tafseer button */
        '<div style="flex:1;text-align:center;">' +
          '<input type="number" min="1" max="604" value="' + p + '"' +
            ' onchange="QV.go(parseInt(this.value)||1)"' +
            ' style="width:70px;padding:6px;border:2px solid #cde8e1;border-radius:9px;' +
              'font-size:15px;font-weight:700;text-align:center;color:#1a6b5a;' +
              'background:#faf8f2;outline:none;font-family:\'Tajawal\',sans-serif;"' +
            ' onfocus="this.style.borderColor=\'#2d8f7b\'"' +
            ' onblur="this.style.borderColor=\'#cde8e1\'">' +
          '<div style="font-size:11px;color:#7a9e98;margin-top:3px;">صفحة من 604</div>' +
        '</div>' +

        /* next */
        '<button onclick="QV.go(' + (p + 1) + ')"' + (p >= 604 ? ' disabled' : '') +
          ' style="padding:9px 16px;border-radius:10px;border:none;font-family:\'Tajawal\',sans-serif;' +
          'font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;' +
          (p >= 604
            ? 'background:#f0f0f0;color:#bbb;cursor:not-allowed;'
            : 'background:linear-gradient(135deg,#2d8f7b,#1a6b5a);color:#fff;' +
              'box-shadow:0 3px 9px rgba(45,143,123,.3);') +
          '">►</button>' +
      '</div>';

    root.innerHTML = topBar + memHint + imgWrap + footer;
  }

  /* ══════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════ */
  return {

    render,

    go(n) {
      _page = _clampPage(n);
      try { localStorage.setItem('qv_page', _page); } catch {}
      render();
    },

    _m() {
      _memMode = !_memMode;
      render();
    },

    _reveal(on) {
      var ov = document.getElementById('qv-mem-ov');
      if (ov) ov.style.opacity = on ? '0' : '1';
    },

    getPage() { return _page; },

    /**
     * renderAyahText(rawText)
     * Utility: render a single ayah string through the tajweed engine
     * if tajweed is currently ON (reads S.quran.tajweedOn).
     * Used by any future overlay / annotation feature on top of page images.
     * Returns an HTML string (tajweed ON) or a plain escaped string (OFF).
     */
    renderAyahText(rawText) {
      const tajweedOn =
        (typeof S !== 'undefined' && S.quran && S.quran.tajweedOn) ||
        localStorage.getItem('qv_tajweed') === '1';
      if (tajweedOn && typeof applyTajweed === 'function') {
        return applyTajweed(rawText);
      }
      /* Fallback: plain HTML-escaped text */
      return String(rawText || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /* Legacy stubs */
    _h() {}, _s() {}, _play() {}, _tadabbur() {}, _mutash() {},
  };

})();
