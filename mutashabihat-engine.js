/**
 * mutashabihat-engine.js  v4.0
 * محرك البحث الذكي للمتشابهات — أثر الروح | Bazary_plus
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * v4.0 fixes:
 *   ✅ عرض النص بالتشكيل من e.text
 *   ✅ البحث بدون تشكيل عبر e.normalized / e._normText
 *   ✅ Highlight ذكي يتجاهل التشكيل في النص الأصلي
 *   ✅ حسب السورة — 114 سورة كاملة مع lazy load
 *   ✅ المفضلة — حفظ وعرض صحيح
 *   ✅ window.openMutashabihat(text) — ربط مباشر
 *   ✅ Patch: mtCard / mtRenderSurahPanel / mtRenderFav / mtToggleFav
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════
     ① CONFIG
  ══════════════════════════════════════════════════ */
  const BASE_URL =
    'https://raw.githubusercontent.com/youbabou/mutashabihat-data/main/mutashabihat/';

  const SURAH_MAP = [
    { slug: 'al-fatihah',    name: '\u0627\u0644\u0641\u0627\u062a\u062d\u0629' },
    { slug: 'al-baqarah',    name: '\u0627\u0644\u0628\u0642\u0631\u0629' },
    { slug: 'ali-imran',     name: '\u0622\u0644 \u0639\u0645\u0631\u0627\u0646' },
    { slug: 'an-nisa',       name: '\u0627\u0644\u0646\u0633\u0627\u0621' },
    { slug: 'al-maidah',     name: '\u0627\u0644\u0645\u0627\u0626\u062f\u0629' },
    { slug: 'al-anam',       name: '\u0627\u0644\u0623\u0646\u0639\u0627\u0645' },
    { slug: 'al-araf',       name: '\u0627\u0644\u0623\u0639\u0631\u0627\u0641' },
    { slug: 'al-anfal',      name: '\u0627\u0644\u0623\u0646\u0641\u0627\u0644' },
    { slug: 'at-tawbah',     name: '\u0627\u0644\u062a\u0648\u0628\u0629' },
    { slug: 'yunus',         name: '\u064a\u0648\u0646\u0633' },
    { slug: 'hud',           name: '\u0647\u0648\u062f' },
    { slug: 'yusuf',         name: '\u064a\u0648\u0633\u0641' },
    { slug: 'ar-rad',        name: '\u0627\u0644\u0631\u0639\u062f' },
    { slug: 'ibrahim',       name: '\u0625\u0628\u0631\u0627\u0647\u064a\u0645' },
    { slug: 'al-hijr',       name: '\u0627\u0644\u062d\u062c\u0631' },
    { slug: 'an-nahl',       name: '\u0627\u0644\u0646\u062d\u0644' },
    { slug: 'al-isra',       name: '\u0627\u0644\u0625\u0633\u0631\u0627\u0621' },
    { slug: 'al-kahf',       name: '\u0627\u0644\u0643\u0647\u0641' },
    { slug: 'maryam',        name: '\u0645\u0631\u064a\u0645' },
    { slug: 'ta-ha',         name: '\u0637\u0647' },
    { slug: 'al-anbiya',     name: '\u0627\u0644\u0623\u0646\u0628\u064a\u0627\u0621' },
    { slug: 'al-hajj',       name: '\u0627\u0644\u062d\u062c' },
    { slug: 'al-muminun',    name: '\u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646' },
    { slug: 'an-nur',        name: '\u0627\u0644\u0646\u0648\u0631' },
    { slug: 'al-furqan',     name: '\u0627\u0644\u0641\u0631\u0642\u0627\u0646' },
    { slug: 'ash-shuara',    name: '\u0627\u0644\u0634\u0639\u0631\u0627\u0621' },
    { slug: 'an-naml',       name: '\u0627\u0644\u0646\u0645\u0644' },
    { slug: 'al-qasas',      name: '\u0627\u0644\u0642\u0635\u0635' },
    { slug: 'al-ankabut',    name: '\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062a' },
    { slug: 'ar-rum',        name: '\u0627\u0644\u0631\u0648\u0645' },
    { slug: 'luqman',        name: '\u0644\u0642\u0645\u0627\u0646' },
    { slug: 'as-sajdah',     name: '\u0627\u0644\u0633\u062c\u062f\u0629' },
    { slug: 'al-ahzab',      name: '\u0627\u0644\u0623\u062d\u0632\u0627\u0628' },
    { slug: 'saba',          name: '\u0633\u0628\u0623' },
    { slug: 'fatir',         name: '\u0641\u0627\u0637\u0631' },
    { slug: 'ya-sin',        name: '\u064a\u0633' },
    { slug: 'as-saffat',     name: '\u0627\u0644\u0635\u0627\u0641\u0627\u062a' },
    { slug: 'sad',           name: '\u0635' },
    { slug: 'az-zumar',      name: '\u0627\u0644\u0632\u0645\u0631' },
    { slug: 'ghafir',        name: '\u063a\u0627\u0641\u0631' },
    { slug: 'fussilat',      name: '\u0641\u0635\u0644\u062a' },
    { slug: 'ash-shura',     name: '\u0627\u0644\u0634\u0648\u0631\u0649' },
    { slug: 'az-zukhruf',    name: '\u0627\u0644\u0632\u062e\u0631\u0641' },
    { slug: 'ad-dukhan',     name: '\u0627\u0644\u062f\u062e\u0627\u0646' },
    { slug: 'al-jathiyah',   name: '\u0627\u0644\u062c\u0627\u062b\u064a\u0629' },
    { slug: 'al-ahqaf',      name: '\u0627\u0644\u0623\u062d\u0642\u0627\u0641' },
    { slug: 'muhammad',      name: '\u0645\u062d\u0645\u062f' },
    { slug: 'al-fath',       name: '\u0627\u0644\u0641\u062a\u062d' },
    { slug: 'al-hujurat',    name: '\u0627\u0644\u062d\u062c\u0631\u0627\u062a' },
    { slug: 'qaf',           name: '\u0642' },
    { slug: 'adh-dhariyat',  name: '\u0627\u0644\u0630\u0627\u0631\u064a\u0627\u062a' },
    { slug: 'at-tur',        name: '\u0627\u0644\u0637\u0648\u0631' },
    { slug: 'an-najm',       name: '\u0627\u0644\u0646\u062c\u0645' },
    { slug: 'al-qamar',      name: '\u0627\u0644\u0642\u0645\u0631' },
    { slug: 'ar-rahman',     name: '\u0627\u0644\u0631\u062d\u0645\u0646' },
    { slug: 'al-waqiah',     name: '\u0627\u0644\u0648\u0627\u0642\u0639\u0629' },
    { slug: 'al-hadid',      name: '\u0627\u0644\u062d\u062f\u064a\u062f' },
    { slug: 'al-mujadilah',  name: '\u0627\u0644\u0645\u062c\u0627\u062f\u0644\u0629' },
    { slug: 'al-hashr',      name: '\u0627\u0644\u062d\u0634\u0631' },
    { slug: 'al-mumtahanah', name: '\u0627\u0644\u0645\u0645\u062a\u062d\u0646\u0629' },
    { slug: 'as-saff',       name: '\u0627\u0644\u0635\u0641' },
    { slug: 'al-jumuah',     name: '\u0627\u0644\u062c\u0645\u0639\u0629' },
    { slug: 'al-munafiqun',  name: '\u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646' },
    { slug: 'at-taghabun',   name: '\u0627\u0644\u062a\u063a\u0627\u0628\u0646' },
    { slug: 'at-talaq',      name: '\u0627\u0644\u0637\u0644\u0627\u0642' },
    { slug: 'at-tahrim',     name: '\u0627\u0644\u062a\u062d\u0631\u064a\u0645' },
    { slug: 'al-mulk',       name: '\u0627\u0644\u0645\u0644\u0643' },
    { slug: 'al-qalam',      name: '\u0627\u0644\u0642\u0644\u0645' },
    { slug: 'al-haqqah',     name: '\u0627\u0644\u062d\u0627\u0642\u0629' },
    { slug: 'al-maarij',     name: '\u0627\u0644\u0645\u0639\u0627\u0631\u062c' },
    { slug: 'nuh',           name: '\u0646\u0648\u062d' },
    { slug: 'al-jinn',       name: '\u0627\u0644\u062c\u0646' },
    { slug: 'al-muzzammil',  name: '\u0627\u0644\u0645\u0632\u0645\u0644' },
    { slug: 'al-muddathir',  name: '\u0627\u0644\u0645\u062f\u062b\u0631' },
    { slug: 'al-qiyamah',    name: '\u0627\u0644\u0642\u064a\u0627\u0645\u0629' },
    { slug: 'al-insan',      name: '\u0627\u0644\u0625\u0646\u0633\u0627\u0646' },
    { slug: 'al-mursalat',   name: '\u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062a' },
    { slug: 'an-naba',       name: '\u0627\u0644\u0646\u0628\u0623' },
    { slug: 'an-naziat',     name: '\u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062a' },
    { slug: 'abasa',         name: '\u0639\u0628\u0633' },
    { slug: 'at-takwir',     name: '\u0627\u0644\u062a\u0643\u0648\u064a\u0631' },
    { slug: 'al-infitar',    name: '\u0627\u0644\u0627\u0646\u0641\u0637\u0627\u0631' },
    { slug: 'al-mutaffifin', name: '\u0627\u0644\u0645\u0637\u0641\u0641\u064a\u0646' },
    { slug: 'al-inshiqaq',   name: '\u0627\u0644\u0627\u0646\u0634\u0642\u0627\u0642' },
    { slug: 'al-buruj',      name: '\u0627\u0644\u0628\u0631\u0648\u062c' },
    { slug: 'at-tariq',      name: '\u0627\u0644\u0637\u0627\u0631\u0642' },
    { slug: 'al-ala',        name: '\u0627\u0644\u0623\u0639\u0644\u0649' },
    { slug: 'al-ghashiyah',  name: '\u0627\u0644\u063a\u0627\u0634\u064a\u0629' },
    { slug: 'al-fajr',       name: '\u0627\u0644\u0641\u062c\u0631' },
    { slug: 'al-balad',      name: '\u0627\u0644\u0628\u0644\u062f' },
    { slug: 'ash-shams',     name: '\u0627\u0644\u0634\u0645\u0633' },
    { slug: 'al-layl',       name: '\u0627\u0644\u0644\u064a\u0644' },
    { slug: 'ad-duha',       name: '\u0627\u0644\u0636\u062d\u0649' },
    { slug: 'ash-sharh',     name: '\u0627\u0644\u0634\u0631\u062d' },
    { slug: 'at-tin',        name: '\u0627\u0644\u062a\u064a\u0646' },
    { slug: 'al-alaq',       name: '\u0627\u0644\u0639\u0644\u0642' },
    { slug: 'al-qadr',       name: '\u0627\u0644\u0642\u062f\u0631' },
    { slug: 'al-bayyinah',   name: '\u0627\u0644\u0628\u064a\u0646\u0629' },
    { slug: 'az-zalzalah',   name: '\u0627\u0644\u0632\u0644\u0632\u0644\u0629' },
    { slug: 'al-adiyat',     name: '\u0627\u0644\u0639\u0627\u062f\u064a\u0627\u062a' },
    { slug: 'al-qariah',     name: '\u0627\u0644\u0642\u0627\u0631\u0639\u0629' },
    { slug: 'at-takathur',   name: '\u0627\u0644\u062a\u0643\u0627\u062b\u0631' },
    { slug: 'al-asr',        name: '\u0627\u0644\u0639\u0635\u0631' },
    { slug: 'al-humazah',    name: '\u0627\u0644\u0647\u0645\u0632\u0629' },
    { slug: 'al-fil',        name: '\u0627\u0644\u0641\u064a\u0644' },
    { slug: 'quraysh',       name: '\u0642\u0631\u064a\u0634' },
    { slug: 'al-maun',       name: '\u0627\u0644\u0645\u0627\u0639\u0648\u0646' },
    { slug: 'al-kawthar',    name: '\u0627\u0644\u0643\u0648\u062b\u0631' },
    { slug: 'al-kafirun',    name: '\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646' },
    { slug: 'an-nasr',       name: '\u0627\u0644\u0646\u0635\u0631' },
    { slug: 'al-masad',      name: '\u0627\u0644\u0645\u0633\u062f' },
    { slug: 'al-ikhlas',     name: '\u0627\u0644\u0625\u062e\u0644\u0627\u0635' },
    { slug: 'al-falaq',      name: '\u0627\u0644\u0641\u0644\u0642' },
    { slug: 'an-nas',        name: '\u0627\u0644\u0646\u0627\u0633' },
  ];

  /* ══════════════════════════════════════════════════
     ② CACHE & STATE
  ══════════════════════════════════════════════════ */
  const _dataCache  = new Map();
  const _loadingSet = new Set();
  const _failedSet  = new Set();
  let   _bgLoadDone = false;
  let   _bgStarted  = false;
  let   _activeSurahSlug = null;

  /* ══════════════════════════════════════════════════
     ③ NORMALIZE — للبحث فقط، لا للعرض
  ══════════════════════════════════════════════════ */
  function normalize(text) {
    if (!text) return '';
    return text
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '')
      .replace(/[\u0623\u0625\u0622\u0627]/g, '\u0627')
      .replace(/[\u064A\u0649]/g, '\u064A')
      .replace(/\u0629/g, '\u0647')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ══════════════════════════════════════════════════
     ④ LOAD SURAH
  ══════════════════════════════════════════════════ */
  async function loadSurah(slug) {
    if (_dataCache.has(slug) || _loadingSet.has(slug) || _failedSet.has(slug)) return;
    _loadingSet.add(slug);
    try {
      const res = await fetch(BASE_URL + slug + '.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.json();
      const data = Array.isArray(raw) ? raw : [];

      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (!item) continue;
        item._normKeyword = normalize(item.keyword || '');
        item._slug = slug;
        /* توحيد: ayahs (جديد) أو entries (قديم) */
        var ayahs = Array.isArray(item.ayahs) ? item.ayahs
                  : (Array.isArray(item.entries) ? item.entries : []);
        item.ayahs = ayahs;
        for (var j = 0; j < ayahs.length; j++) {
          var e = ayahs[j];
          if (!e) continue;
          e._normText = normalize(e.text || '') + ' ' + normalize(e.normalized || '');
        }
      }

      _dataCache.set(slug, data);
      if (typeof mtLoadSource === 'function') {
        var label = '';
        for (var k = 0; k < SURAH_MAP.length; k++) {
          if (SURAH_MAP[k].slug === slug) { label = SURAH_MAP[k].name; break; }
        }
        mtLoadSource(slug, label || slug, data);
      }
    } catch (err) {
      console.error('[MutashabihatEngine] failed:', slug, err.message);
      _failedSet.add(slug);
    } finally {
      _loadingSet.delete(slug);
    }
  }

  /* ⑤ BACKGROUND PRELOAD — re-renders active query after each batch */
  var _pendingQ = null;

  async function _startBackgroundLoad() {
    if (_bgStarted) return;
    _bgStarted = true;
    var BATCH = 4;
    var slugs = SURAH_MAP.map(function(s) { return s.slug; });
    for (var i = 0; i < slugs.length; i += BATCH) {
      await Promise.allSettled(slugs.slice(i, i + BATCH).map(loadSurah));
      if (_pendingQ) {
        var ci = document.getElementById('mt-engine-q');
        if (ci && ci.value.trim() === _pendingQ) {
          var r = search(_pendingQ);
          if (r.length) {
            renderResults(r, _pendingQ);
            _setStats('<strong>' + r.length + '</strong> \u0646\u062A\u064A\u062C\u0629 \u0644\u0640 "' + _escHtml(_pendingQ) + '"');
          }
        }
      }
    }
    _bgLoadDone = true;
    _updateStatsHint();
  }

  /* ⑥ PRIORITY LOAD */
  async function _priorityLoad(q) {
    var normQ = normalize(q);
    var targets = SURAH_MAP.filter(function(s) {
      return normalize(s.name).includes(normQ);
    });
    if (targets.length) {
      await Promise.allSettled(targets.map(function(s) { return loadSurah(s.slug); }));
    }
  }

  /* ══════════════════════════════════════════════════
     ⑦ SEARCH — scoring-based, synchronous
  ══════════════════════════════════════════════════ */
  function search(q) {
    if (!q) return [];
    var normQ = normalize(q);
    if (!normQ) return [];
    var scored = [];

    for (var [, data] of _dataCache) {
      if (!Array.isArray(data)) continue;
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (!item || !item.keyword) continue;
        var ayahs = item.ayahs;
        if (!Array.isArray(ayahs) || !ayahs.length) continue;

        var sc = 0;
        var normKw = item._normKeyword || normalize(item.keyword);

        if      (normKw === normQ)           sc += 20;
        else if (normKw.startsWith(normQ))   sc += 15;
        else if (normKw.includes(normQ))     sc += 10;

        if (item.surah && normalize(item.surah).includes(normQ)) sc += 5;

        for (var j = 0; j < ayahs.length; j++) {
          var e = ayahs[j];
          if (!e) continue;
          var ns = normalize(e.surah || '');
          var nt = e._normText || normalize((e.text || '') + ' ' + (e.normalized || ''));
          if (ns.includes(normQ)) sc += 5;
          if (nt.includes(normQ)) sc += 4;
        }

        if (sc > 0) scored.push({ item: item, sc: sc });
      }
    }

    scored.sort(function(a, b) {
      return b.sc - a.sc || (a.item.keyword || '').localeCompare(b.item.keyword || '');
    });
    return scored.map(function(s) { return s.item; });
  }

  /* ══════════════════════════════════════════════════
     ⑧ HIGHLIGHT — يعرض النص الأصلي مع تشكيل
        ويحدد الكلمة متجاهلاً التشكيل في البحث
  ══════════════════════════════════════════════════ */
  function _escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* تشكيل اختياري بين كل حرفين */
  var _TK = '[\u064B-\u065F\u0610-\u061A\u0670]*';

  function highlightText(originalText, q) {
    if (!q || !originalText) return _escHtml(originalText);
    var normQ = normalize(q);
    if (!normQ) return _escHtml(originalText);

    /* regex يطابق حروف normalizedQ مع تشكيل اختياري بينها */
    var pattern = normQ.split('').map(function(ch) {
      var safe = ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var v = safe;
      if (ch === '\u0627') v = '[\u0623\u0625\u0622\u0627]';
      else if (ch === '\u064A') v = '[\u064A\u0649]';
      else if (ch === '\u0647') v = '[\u0647\u0629]';
      return v + _TK;
    }).join('');

    try {
      var re = new RegExp(pattern, 'g');
      return _escHtml(originalText).replace(re,
        '<mark>$&</mark>'
      );
    } catch (err) {
      return _escHtml(originalText);
    }
  }

  /* ══════════════════════════════════════════════════
     ⑨ CARD BUILDER — مشترك بين جميع الأقسام
     المفتاح: slug::keyword (بدون item.id)
     الزر: data-slug + data-kw بدلاً من inline string args
     (JSON.stringify في onclick يكسر HTML attribute بسبب double-quotes)
  ══════════════════════════════════════════════════ */
  var _cardSeq = 0; /* عداد لضمان id فريد وصالح كـ HTML */

  function _buildCard(item, q, favs) {
    if (!item || !item.keyword) return '';
    var slug   = item._slug || _getItemSlug(item);

    /* المفتاح دائماً: slug::keyword  — لا نعتمد على item.id */
    var favKey = slug + '::' + item.keyword;
    var isFav  = (favs || []).includes(favKey);
    var ayahs  = Array.isArray(item.ayahs) ? item.ayahs : [];

    /* id رقمي صالح للـ DOM */
    var btnId  = 'mtf-' + (++_cardSeq);

    var ayahsHtml = '';
    for (var i = 0; i < ayahs.length; i++) {
      var e = ayahs[i];
      if (!e) continue;
      /* العرض من e.text (مع تشكيل كامل) */
      var displayText = highlightText(e.text || '', q || '');
      ayahsHtml +=
        '<div style="background:#f8fdfc;border-radius:9px;padding:11px 13px;' +
          'margin-bottom:7px;border-right:3px solid var(--t,#2d8f7b);">' +
          '<div style="font-size:11px;font-weight:800;color:var(--td,#1a6b5a);margin-bottom:5px;">' +
            _escHtml(e.surah || item.surah || '') + ' \u2014 \u0627\u0644\u0622\u064A\u0629 ' + _escHtml(String(e.ayah || '')) +
          '</div>' +
          '<div style="font-family:\'Amiri Quran\',\'Amiri\',serif;font-size:16px;' +
            'color:#1a2e2a;line-height:2.2;direction:rtl;text-align:right;">' +
            displayText +
          '</div>' +
        '</div>';
    }

    return (
      '<div style="background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:14px;' +
        'box-shadow:var(--sh,0 2px 16px rgba(45,143,123,.10));border:1px solid var(--brd,#cde8e1);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;' +
          'margin-bottom:12px;flex-wrap:wrap;gap:8px;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:15px;font-weight:900;color:var(--td,#1a6b5a);' +
              'font-family:\'Amiri\',serif;line-height:1.6;">' +
              highlightText(item.keyword, q || '') +
            '</div>' +
            '<div style="font-size:11px;color:var(--lt,#7a9e98);margin-top:2px;">' +
              ayahs.length + ' \u0622\u064A\u0629 \u0645\u062A\u0634\u0627\u0628\u0647\u0629' +
            '</div>' +
          '</div>' +
          /* data-slug + data-kw بدلاً من string args في onclick
             → يتجنب مشكلة double-quotes داخل HTML attribute */
          '<button id="' + btnId + '"' +
            ' data-slug="' + _escHtml(slug) + '"' +
            ' data-kw="' + _escHtml(item.keyword) + '"' +
            ' onclick="_mtEng.fav(this)"' +
            ' style="border:none;cursor:pointer;font-size:12px;padding:4px 10px;border-radius:8px;' +
              'transition:all .2s;white-space:nowrap;' +
              'background:' + (isFav ? 'rgba(201,162,39,.1)' : 'var(--t2,#e8f8f4)') + ';' +
              'color:' + (isFav ? '#c9a227' : 'var(--lt,#7a9e98)') + ';">' +
            (isFav ? '\u2605 \u0645\u0641\u0636\u0644\u0629' : '\u2606 \u0623\u0636\u0641 \u0644\u0644\u0645\u0641\u0636\u0644\u0629') +
          '</button>' +
        '</div>' +
        ayahsHtml +
      '</div>'
    );
  }

  /* ══════════════════════════════════════════════════
     ⑩ RENDER ENGINE RESULTS
  ══════════════════════════════════════════════════ */
  function renderResults(items, q) {
    var container = document.getElementById('mt-engine-results');
    if (!container) return;
    if (!items || !items.length) {
      container.innerHTML =
        '<div style="text-align:center;padding:32px 16px;color:var(--lt,#7a9e98);">' +
          '<div style="font-size:36px;margin-bottom:10px;">\uD83D\uDD0D</div>' +
          '<div style="font-weight:800;font-size:15px;margin-bottom:6px;">\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C</div>' +
          '<div style="font-size:13px;">\u062C\u0631\u0628\u064A \u0643\u0644\u0645\u0629 \u0623\u062E\u0631\u0649 \u0623\u0648 \u062C\u0632\u0621\u0627\u064B \u0645\u0646 \u0627\u0644\u0622\u064A\u0629</div>' +
        '</div>';
      return;
    }
    var favs = _getFavs();
    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += _buildCard(items[i], q, favs);
    }
    container.innerHTML = html;
  }

  /* ══════════════════════════════════════════════════
     ⑪ SUGGESTIONS
  ══════════════════════════════════════════════════ */
  var _suggBox = null;

  function _ensureSuggBox() {
    if (_suggBox) return;
    var input = document.getElementById('mt-engine-q');
    if (!input) return;
    _suggBox = document.createElement('div');
    _suggBox.id = 'mt-sugg-box';
    _suggBox.style.cssText =
      'position:absolute;top:100%;right:0;left:0;z-index:300;background:#fff;' +
      'border:1.5px solid var(--brd,#cde8e1);border-top:none;' +
      'border-radius:0 0 14px 14px;box-shadow:0 8px 24px rgba(45,143,123,.15);' +
      'max-height:220px;overflow-y:auto;display:none;';
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(_suggBox);
  }

  function _buildSuggestions(q) {
    if (!q) { _hideSugg(); return; }
    _ensureSuggBox();
    if (!_suggBox) return;

    var normQ = normalize(q);
    var seen  = new Set();
    var rows  = [];

    /* أسماء السور */
    for (var i = 0; i < SURAH_MAP.length && rows.length < 3; i++) {
      var s = SURAH_MAP[i];
      if (normalize(s.name).includes(normQ) && !seen.has(s.name)) {
        seen.add(s.name);
        rows.push({ label: '\uD83D\uDCD6 ' + s.name, value: s.name });
      }
    }

    /* كلمات مفتاحية */
    outer: for (var [, data] of _dataCache) {
      if (!Array.isArray(data)) continue;
      for (var j = 0; j < data.length; j++) {
        var item = data[j];
        if (!item || !item.keyword) continue;
        var nk = item._normKeyword || normalize(item.keyword);
        if (nk.includes(normQ) && !seen.has(item.keyword)) {
          seen.add(item.keyword);
          rows.push({ label: '\uD83D\uDD11 ' + item.keyword, value: item.keyword });
          if (rows.length >= 8) break outer;
        }
      }
    }

    if (!rows.length) { _hideSugg(); return; }

    _suggBox.innerHTML = rows.map(function(r) {
      return (
        '<div onmousedown="event.preventDefault();' +
          'document.getElementById(\'mt-engine-q\').value=' + JSON.stringify(r.value) + ';' +
          '_mtEng.run();_mtEng.hideSugg();"' +
          ' style="padding:10px 14px;cursor:pointer;font-size:13px;' +
            'border-bottom:1px solid var(--tp,#e4f5f1);' +
            'display:flex;align-items:center;gap:8px;transition:background .15s;"' +
          ' onmouseover="this.style.background=\'var(--t2,#e8f8f4)\'"' +
          ' onmouseout="this.style.background=\'\'">' +
          _escHtml(r.label) +
        '</div>'
      );
    }).join('');
    _suggBox.style.display = 'block';
  }

  function _hideSugg() { if (_suggBox) _suggBox.style.display = 'none'; }

  /* ══════════════════════════════════════════════════
     ⑫ STATS
  ══════════════════════════════════════════════════ */
  function _setStats(html) {
    var el = document.getElementById('mt-engine-stats');
    if (el) el.innerHTML = html;
  }

  function _updateStatsHint() {
    var n = 0;
    for (var [, d] of _dataCache) if (Array.isArray(d)) n += d.length;
    _setStats('\u064A\u0648\u062C\u062F <strong>' + n + '</strong> \u0643\u0644\u0645\u0629 \u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0645\u0646 ' + _dataCache.size + ' \u0633\u0648\u0631\u0629 \u2014 \u0627\u0643\u062A\u0628\u064A \u0644\u0644\u0628\u062D\u062B');
  }

  /* ══════════════════════════════════════════════════
     ⑬ FAVORITES
  ══════════════════════════════════════════════════ */
  function _getFavs() {
    try { return JSON.parse(localStorage.getItem('mt_favs') || '[]'); } catch (e) { return []; }
  }
  function _setFavs(a) {
    try { localStorage.setItem('mt_favs', JSON.stringify(a)); } catch (e) { /**/ }
  }
  function _toggleFav(slug, keyword) {
    var favs = _getFavs();
    /* المفتاح: slug::keyword */
    var key  = String(slug) + '::' + String(keyword);
    var i    = favs.indexOf(key);
    if (i >= 0) favs.splice(i, 1); else favs.push(key);
    _setFavs(favs);
    return favs.includes(key);
  }

  function _getItemSlug(item) {
    for (var [slug, data] of _dataCache) {
      if (Array.isArray(data) && data.includes(item)) return slug;
    }
    return 'x';
  }

  /* ══════════════════════════════════════════════════
     ⑭ SURAH PANEL — كامل 114 سورة + lazy load
  ══════════════════════════════════════════════════ */
  function _renderSurahGrid() {
    var chips = document.getElementById('mt-surah-chips');
    if (!chips) return;
    chips.innerHTML = SURAH_MAP.map(function(s) {
      return (
        '<button id="mt-sc-' + s.slug + '"' +
          ' onclick="_mtEng.showSurah(\'' + _escHtml(s.slug) + '\',\'' + _escHtml(s.name) + '\')"' +
          ' style="padding:6px 13px;border-radius:20px;border:1.5px solid var(--brd,#cde8e1);' +
            'background:var(--t2,#e8f8f4);color:var(--td,#1a6b5a);font-family:inherit;' +
            'font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;">' +
          _escHtml(s.name) +
        '</button>'
      );
    }).join('');
  }

  async function _showSurahPanel(slug, name) {
    _activeSurahSlug = slug;
    var res = document.getElementById('mt-surah-results');
    if (!res) return;

    /* تفعيل الزر المحدد */
    var buttons = document.querySelectorAll('#mt-surah-chips button');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var on = b.id === 'mt-sc-' + slug;
      b.style.background = on
        ? 'linear-gradient(135deg,var(--t,#2d8f7b),var(--td,#1a6b5a))'
        : 'var(--t2,#e8f8f4)';
      b.style.color = on ? '#fff' : 'var(--td,#1a6b5a)';
    }

    /* Spinner أثناء التحميل */
    if (!_dataCache.has(slug) && !_failedSet.has(slug)) {
      res.innerHTML =
        '<div style="text-align:center;padding:28px;color:var(--lt,#7a9e98);">' +
          '<div style="display:inline-block;width:32px;height:32px;border:3px solid var(--tp,#e4f5f1);' +
            'border-top-color:var(--t,#2d8f7b);border-radius:50%;' +
            'animation:spin .8s linear infinite;margin-bottom:10px;"></div>' +
          '<div>\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 ' + _escHtml(name) + '\u2026</div>' +
        '</div>';
      await loadSurah(slug);
    }

    if (_activeSurahSlug !== slug) return;

    var data = _dataCache.get(slug);
    if (!data || !data.length) {
      res.innerHTML =
        '<div style="text-align:center;padding:32px 16px;color:var(--lt,#7a9e98);">' +
          '<div style="font-size:32px;margin-bottom:10px;">\uD83D\uDCD6</div>' +
          '<div style="font-weight:800;">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062A\u0634\u0627\u0628\u0647\u0627\u062A \u0644\u0647\u0630\u0647 \u0627\u0644\u0633\u0648\u0631\u0629 \u062D\u062A\u0649 \u0627\u0644\u0622\u0646</div>' +
        '</div>';
      return;
    }

    var favs = _getFavs();
    var html =
      '<div style="font-size:13px;font-weight:800;color:var(--td,#1a6b5a);margin-bottom:14px;' +
        'padding:10px 14px;background:var(--t2,#e8f8f4);border-radius:10px;">' +
        '\uD83D\uDD0D \u0645\u062A\u0634\u0627\u0628\u0647\u0627\u062A ' + _escHtml(name) +
        ' \u2014 ' + data.length + ' \u0643\u0644\u0645\u0629 \u0645\u0641\u062A\u0627\u062D\u064A\u0629' +
      '</div>';
    for (var j = 0; j < data.length; j++) {
      html += _buildCard(data[j], '', favs);
    }
    res.innerHTML = html;
  }

  /* ══════════════════════════════════════════════════
     ⑮ FAVORITES PANEL
  ══════════════════════════════════════════════════ */
  function _renderFavorites() {
    var res = document.getElementById('mt-fav-results');
    if (!res) return;
    var favs = _getFavs();

    if (!favs.length) {
      res.innerHTML =
        '<div style="text-align:center;padding:32px 16px;color:var(--lt,#7a9e98);">' +
          '<div style="font-size:36px;margin-bottom:10px;">\u2B50</div>' +
          '<div style="font-weight:800;font-size:15px;margin-bottom:6px;">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0641\u0636\u0644\u0627\u062A \u0628\u0639\u062F</div>' +
          '<div style="font-size:13px;">\u0627\u0636\u063A\u0637\u064A \u2605 \u0639\u0644\u0649 \u0623\u064A \u0646\u062A\u064A\u062C\u0629 \u0644\u0625\u0636\u0627\u0641\u062A\u0647\u0627 \u0647\u0646\u0627</div>' +
        '</div>';
      return;
    }

    var items = [];
    for (var f = 0; f < favs.length; f++) {
      /* المفتاح: slug::keyword */
      var colonIdx = favs[f].indexOf('::');
      if (colonIdx < 0) continue;
      var slug    = favs[f].slice(0, colonIdx);
      var keyword = favs[f].slice(colonIdx + 2);

      /* ابحث في كاش المحرك أولاً */
      var data = _dataCache.get(slug);
      if (data) {
        for (var d = 0; d < data.length; d++) {
          if (data[d] && data[d].keyword === keyword) {
            items.push(data[d]);
            break;
          }
        }
        continue;
      }

      /* احتياطي: MT_SOURCES الموجود في التطبيق */
      if (typeof MT_SOURCES !== 'undefined') {
        for (var m = 0; m < MT_SOURCES.length; m++) {
          if (MT_SOURCES[m].id === slug && Array.isArray(MT_SOURCES[m].data)) {
            for (var n = 0; n < MT_SOURCES[m].data.length; n++) {
              var it = MT_SOURCES[m].data[n];
              if (it && it.keyword === keyword) {
                var clone = {};
                for (var ck in it) clone[ck] = it[ck];
                clone._slug = slug;
                items.push(clone);
                break;
              }
            }
            break;
          }
        }
      }
    }

    if (!items.length) {
      res.innerHTML =
        '<div style="text-align:center;padding:24px;color:var(--lt,#7a9e98);">' +
          '\u2B50 \u0627\u0641\u062A\u062D\u064A \u0633\u0648\u0631\u0629 \u0623\u0648\u0644\u0627\u064B \u0644\u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0641\u0636\u0644\u0627\u062A\u0643\u064A' +
        '</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) html += _buildCard(items[i], '', favs);
    res.innerHTML = html;
  }

  /* ══════════════════════════════════════════════════
     ⑯ MAIN SEARCH
  ══════════════════════════════════════════════════ */
  var _debTimer = null;

  async function _doSearch() {
    var input = document.getElementById('mt-engine-q');
    var q     = (input ? input.value : '').trim();
    var res   = document.getElementById('mt-engine-results');

    if (!q) {
      _pendingQ = null;
      if (res) res.innerHTML = '';
      _updateStatsHint();
      _hideSugg();
      return;
    }

    /* حفظ الـ query الحالي ليُستخدَم في _startBackgroundLoad */
    _pendingQ = q;

    _buildSuggestions(q);

    /* Spinner إذا لم يُحمَّل أي ملف بعد */
    if (_dataCache.size === 0) {
      _setStats('<span style="color:var(--t,#2d8f7b)">\u23F3 \u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A\u2026</span>');
      if (res) res.innerHTML =
        '<div style="text-align:center;padding:28px;color:var(--lt,#7a9e98);">' +
          '<div style="display:inline-block;width:32px;height:32px;border:3px solid var(--tp,#e4f5f1);' +
            'border-top-color:var(--t,#2d8f7b);border-radius:50%;' +
            'animation:spin .8s linear infinite;margin-bottom:10px;"></div>' +
          '<div style="font-size:13px;">\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A\u2026</div>' +
        '</div>';
    }

    /* تحميل السورة ذات الأولوية أولاً، ثم كشف الخلفية */
    await _priorityLoad(q);
    _startBackgroundLoad(); /* لا ينتظر — يعمل في الخلفية ويُحدِّث عبر _pendingQ */

    var results = search(q);
    renderResults(results, q);

    if (!results.length && _loadingSet.size > 0) {
      _setStats('<span style="color:var(--t,#2d8f7b)">\u23F3 \u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0632\u064A\u062F\u2026</span>');
    } else if (results.length) {
      _setStats('<strong>' + results.length + '</strong> \u0646\u062A\u064A\u062C\u0629 \u0644\u0640 "' + _escHtml(q) + '"');
    } else {
      _setStats('\u0644\u0627 \u0646\u062A\u0627\u0626\u062C \u0644\u0640 "' + _escHtml(q) + '"');
    }
  }

  /* ══════════════════════════════════════════════════
     ⑰ OVERRIDE EXISTING FUNCTIONS
  ══════════════════════════════════════════════════ */

  window.mtEngineSearch = function () {
    clearTimeout(_debTimer);
    _debTimer = setTimeout(_doSearch, 300);
  };

  window.mtQuickFilter = function (t) {
    var i = document.getElementById('mt-engine-q');
    if (i) { i.value = t; _doSearch(); }
  };

  window.mtRenderSurahPanel = function () { _renderSurahGrid(); };

  window.mtShowSurah = function (nameOrSlug) {
    for (var i = 0; i < SURAH_MAP.length; i++) {
      if (SURAH_MAP[i].name === nameOrSlug || SURAH_MAP[i].slug === nameOrSlug) {
        _showSurahPanel(SURAH_MAP[i].slug, SURAH_MAP[i].name);
        return;
      }
    }
  };

  window.mtRenderFav = function () { _renderFavorites(); };

  window.mtToggleFav = function (slug, keyword) {
    var isFav = _toggleFav(slug, keyword);
    var fp = document.getElementById('mt-panel-fav');
    if (fp && fp.style.display !== 'none') _renderFavorites();
    return isFav;
  };

  /* mtCard — يُصلح entries→ayahs لكود index.html القديم */
  window.mtCard = function (item, q, favs) {
    if (item && !item.ayahs && Array.isArray(item.entries)) {
      item.ayahs = item.entries;
    }
    return _buildCard(item, q || '', favs || _getFavs());
  };

  /* ══════════════════════════════════════════════════
     ⑱ window.openMutashabihat — ربط عالمي
  ══════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════
     PHASE 3 HELPER — Smart Fallback
     يقسم النص إلى كلمات ويجرب 4→3→2 كلمات
  ══════════════════════════════════════════════════ */
  function _fallbackSearch(normText) {
    var words = normText.split(/\s+/).filter(function(w) { return w.length > 1; });
    /* جرب من 4 كلمات حتى 2 */
    for (var len = Math.min(4, words.length); len >= 2; len--) {
      /* ابدأ من مواضع مختلفة في النص */
      for (var start = 0; start <= words.length - len; start++) {
        var phrase = words.slice(start, start + len).join(' ');
        var results = search(phrase);
        if (results.length) return { results: results, q: phrase };
      }
    }
    /* آخر محاولة: كل كلمة مفردة بطول > 3 */
    for (var w = 0; w < words.length; w++) {
      if (words[w].length > 3) {
        var r = search(words[w]);
        if (r.length) return { results: r, q: words[w] };
      }
    }
    return null;
  }

  /* ══════════════════════════════════════════════════
     PHASE 1 HELPER — Exact Ayah Match
     يبحث في dataCache[slug] عن item يحتوي الآية المحددة
  ══════════════════════════════════════════════════ */
  function _exactMatch(slug, surahNum, ayahNum) {
    var data = _dataCache.get(slug);
    if (!Array.isArray(data)) return null;
    var normName = normalize(SURAH_MAP[surahNum - 1].name);
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (!item || !Array.isArray(item.ayahs)) continue;
      for (var j = 0; j < item.ayahs.length; j++) {
        var e = item.ayahs[j];
        if (!e) continue;
        /* مطابقة رقم الآية + السورة (أول 4 حروف كافية للتمييز) */
        if (parseInt(e.ayah) === ayahNum &&
            normalize(e.surah || '').slice(0, 4) === normName.slice(0, 4)) {
          return item;
        }
      }
    }
    return null;
  }

  /* ══════════════════════════════════════════════════
     ⑱ window.openMutashabihat(text, surahNum, ayahNum)
     نظام هجين 3 مراحل:
       1️⃣ Exact Match   → بحث دقيق بالسورة+رقم الآية
       2️⃣ Global Search → search(normalize(text))
       3️⃣ Smart Fallback → 4→3→2 كلمات
  ══════════════════════════════════════════════════ */
  window.openMutashabihat = function (text, surahNum, ayahNum) {
    var _txt  = String(text || '').trim();
    var _sNum = surahNum ? parseInt(surahNum) : 0;
    var _aNum = ayahNum  ? parseInt(ayahNum)  : 0;
    var _slug = (_sNum >= 1 && _sNum <= 114) ? SURAH_MAP[_sNum - 1].slug : null;

    /* ── 1. الانتقال للقسم ── */
    if (typeof showSec    === 'function') showSec('mutash');
    if (typeof mtSwitchTab === 'function') mtSwitchTab('engine');

    /* ── 2. تحميل السورة ذات الأولوية (مع cache) ── */
    var _loadPromise = _slug ? loadSurah(_slug) : Promise.resolve();

    /* ── 3. retry حتى يصبح input مرئياً في DOM ── */
    var _att = 0;
    function _execute() {
      _loadPromise.then(function () {

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           PHASE 1 — Exact Match
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (_slug && _aNum) {
          var hit = _exactMatch(_slug, _sNum, _aNum);
          if (hit) {
            var input = document.getElementById('mt-engine-q');
            if (input) {
              input.value = hit.keyword;
              input.focus();
            }
            _pendingQ = hit.keyword;
            renderResults([hit], hit.keyword);
            _setStats(
              '\uD83C\uDFAF \u062A\u0637\u0627\u0628\u0642 \u0645\u0628\u0627\u0634\u0631: <strong>' +
              _escHtml(hit.keyword) + '</strong>'
            );
            _startBackgroundLoad();
            return; /* Phase 1 succeeded — stop */
          }
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           PHASE 2 — Global Search
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        var normText = normalize(_txt);
        var results  = _txt ? search(normText) : [];

        if (results.length) {
          var input2 = document.getElementById('mt-engine-q');
          if (input2) { input2.value = normText; input2.focus(); }
          _pendingQ = normText;
          renderResults(results, normText);
          _setStats('<strong>' + results.length + '</strong> \u0646\u062A\u064A\u062C\u0629 \u0644\u0640 "' + _escHtml(normText) + '"');
          _startBackgroundLoad();
          return; /* Phase 2 succeeded */
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           PHASE 3 — Smart Fallback
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        var fb = normText ? _fallbackSearch(normText) : null;
        var input3 = document.getElementById('mt-engine-q');

        if (fb) {
          if (input3) { input3.value = fb.q; input3.focus(); }
          _pendingQ = fb.q;
          renderResults(fb.results, fb.q);
          _setStats('<strong>' + fb.results.length + '</strong> \u0646\u062A\u064A\u062C\u0629 (\u0628\u062D\u062B \u0630\u0643\u064A): "' + _escHtml(fb.q) + '"');
        } else {
          /* لا يوجد شيء بعد — شغّل البحث الكامل في الخلفية */
          if (input3) { input3.value = normText || _txt; input3.focus(); }
          _pendingQ = normText || _txt;
          _doSearch();
        }
        _startBackgroundLoad();
      });
    }

    function _tryDOM() {
      _att++;
      var input = document.getElementById('mt-engine-q');
      if (input && input.offsetParent !== null) {
        _execute();
      } else if (_att < 25) {
        setTimeout(_tryDOM, 80);
      }
    }
    setTimeout(_tryDOM, 100);
  };

  /* ══════════════════════════════════════════════════
     qrSendToMutash — يقرأ نص الآية من الـ DOM ويستدعي openMutashabihat
  ══════════════════════════════════════════════════ */
  window.qrSendToMutash = function (surahNum, ayahNum) {
    /* استخرج نص الآية من الـ span الموجود في قارئ القرآن */
    var span = document.getElementById('qr-a-' + ayahNum);
    var text = span ? (span.textContent || span.innerText || '') : '';
    /* نظّف التشكيل والأرقام من النص المستخرج */
    text = text.replace(/[\u064B-\u065F\u0610-\u061A\u0670\uFE70-\uFEFF]/g, '').trim();
    window.openMutashabihat(text, surahNum, ayahNum);
  };

  /* ══════════════════════════════════════════════════
     ⑲ STYLES
  ══════════════════════════════════════════════════ */
  (function () {
    var s = document.createElement('style');
    s.textContent =
      '@keyframes spin{to{transform:rotate(360deg)}}' +
      '#mt-sugg-box::-webkit-scrollbar{width:4px}' +
      '#mt-sugg-box::-webkit-scrollbar-thumb{background:var(--tl,#4ab5a0);border-radius:4px}' +
      '#mt-engine-results mark,#mt-surah-results mark,#mt-fav-results mark{' +
        'background:#fff3b0;border-radius:3px;padding:0 2px;font-style:normal}' +
      '#mt-surah-chips{' +
        'display:flex;flex-wrap:wrap;gap:7px;max-height:180px;overflow-y:auto;' +
        'padding:4px 2px;scrollbar-width:thin;' +
        'scrollbar-color:var(--tl,#4ab5a0) transparent;margin-bottom:16px}' +
      '#mt-surah-chips::-webkit-scrollbar{width:4px;height:4px}' +
      '#mt-surah-chips::-webkit-scrollbar-thumb{background:var(--tl,#4ab5a0);border-radius:4px}';
    document.head.appendChild(s);
  })();

  /* ══════════════════════════════════════════════════
     ⑳ PUBLIC API — window._mtEng
  ══════════════════════════════════════════════════ */
  window._mtEng = {
    run:      function ()   { _doSearch(); },
    hideSugg: function ()   { _hideSugg(); },
    fav: function (btnEl) {
      /* btnEl هو عنصر الزر نفسه (this) — يقرأ البيانات من data-attributes */
      var slug    = btnEl.dataset.slug;
      var keyword = btnEl.dataset.kw;
      var isFav   = _toggleFav(slug, keyword);
      btnEl.textContent = isFav
        ? '\u2605 \u0645\u0641\u0636\u0644\u0629'
        : '\u2606 \u0623\u0636\u0641 \u0644\u0644\u0645\u0641\u0636\u0644\u0629';
      btnEl.style.color      = isFav ? '#c9a227' : 'var(--lt)';
      btnEl.style.background = isFav ? 'rgba(201,162,39,.1)' : 'var(--t2)';
      var fp = document.getElementById('mt-panel-fav');
      if (fp && fp.style.display !== 'none') _renderFavorites();
      return isFav;
    },
    showSurah: function (slug, name) { _showSurahPanel(slug, name); },
    loadSurah: loadSurah,
    search:    search,
    renderResults: renderResults,
    highlightText: highlightText,
  };

  /* ══════════════════════════════════════════════════
     ㉑ INIT
  ══════════════════════════════════════════════════ */
  function _init() {
    var input = document.getElementById('mt-engine-q');
    if (!input) { setTimeout(_init, 500); return; }

    _updateStatsHint();

    document.addEventListener('click', function (e) {
      if (_suggBox && !_suggBox.contains(e.target) && e.target !== input) _hideSugg();
    });

    input.addEventListener('focus', function () {
      if (!_bgStarted) _startBackgroundLoad();
    }, { once: true });

    /* بناء شبكة السور إذا كان التبويب مفتوحاً */
    var chips = document.getElementById('mt-surah-chips');
    if (chips && !chips.children.length) _renderSurahGrid();

    /* مراقبة تبديل التبويبات */
    var origSwitch = window.mtSwitchTab;
    if (typeof origSwitch === 'function') {
      window.mtSwitchTab = function (tab) {
        origSwitch(tab);
        if (tab === 'surah') {
          var c = document.getElementById('mt-surah-chips');
          if (c && !c.children.length) _renderSurahGrid();
        }
        if (tab === 'fav') _renderFavorites();
      };
    }

    console.log('[MutashabihatEngine] v4.0 Ready — ' + SURAH_MAP.length + ' surahs');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    setTimeout(_init, 0);
  }

})();
