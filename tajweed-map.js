/* ═══════════════════════════════════════════════════════════════════
   tajweed-map.js  v5.0  —  محرك التجويد — أثر الروح | Bazary_plus
   ─────────────────────────────────────────────────────────────────
   3-Layer Architecture:
     LAYER 1 │ TOKENIZER      — splits text into grapheme-aware word tokens
     LAYER 2 │ RULE ENGINE    — one focused analyzer per rule family
              │ CONTEXT ANALYZER — word-boundary, hamza, shadda awareness
     LAYER 3 │ PRIORITY RESOLVER — deterministic, numeric, no ambiguity
   ─────────────────────────────────────────────────────────────────
   Public API:   window.applyTajweed(rawText)  →  HTML string
   Each span:    class="tj-*"  data-rule="Arabic label"  data-exp="explanation"
   ─────────────────────────────────────────────────────────────────
   Colors: Dar Al-Maʿrifah Mushaf, Riwāyat Hafs ʿan ʿĀsim (exact)
   Injected by §CSS — single source of truth, uses !important
   ─────────────────────────────────────────────────────────────────
   v5.0 fixes:
     • آ (ALEF_MAD) now uses context-based maddRank (was always madd6)
     • isMaddExtension now excludes shadda (SH) — doubled consonants
       like يَّ / وَّ are NOT extension letters
     • bare-alef detection uses isMaddExtension (handles rare maddah marks)
     • Priority order enforced: Madd(1-5) > Ghunna(10-15) > Idgham(20-24)
       > Qalqala(30) > Tafkhim(40) > Lam(50-51)
     • Lam shadda skip prevents false lam-qamar inside shaddated-lam sequences
═══════════════════════════════════════════════════════════════════ */

(function (win) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     § 1. UNICODE CONSTANTS
  ═══════════════════════════════════════════════════════════════ */

  /* ── Diacritic marks ── */
  var SK = '\u0652'; /* ْ  sukun             */
  var SH = '\u0651'; /* ّ  shadda            */
  var FA = '\u064E'; /* َ  fatha             */
  var DA = '\u064F'; /* ُ  damma             */
  var KA = '\u0650'; /* ِ  kasra             */
  var DG = '\u0670'; /* ٰ  dagger alef       */
  var MK = '\u0653'; /* ٓ  maddah above      */
  var TF = '\u064B'; /* ً  tanwin fath       */
  var TD = '\u064C'; /* ٌ  tanwin damm       */
  var TK = '\u064D'; /* ٍ  tanwin kasr       */

  /* ── Base letters ── */
  var NOON     = '\u0646'; /* ن */
  var MEEM     = '\u0645'; /* م */
  var RA       = '\u0631'; /* ر */
  var ALEF     = '\u0627'; /* ا */
  var LAM      = '\u0644'; /* ل */
  var WAW      = '\u0648'; /* و */
  var YA       = '\u064A'; /* ي */
  var ALEF_MAD = '\u0622'; /* آ alef maddah    */
  var ALEF_WSL = '\u0671'; /* ٱ alef wasla     */

  /* ── Letter sets (used with String.indexOf) ── */
  var S_HAMZA    = '\u0621\u0623\u0624\u0625\u0626'; /* ء أ ؤ إ ئ */
  var S_IQLAB    = '\u0628';                          /* ب           */
  var S_IDGHAM_G = '\u064A\u0646\u0645\u0648';        /* ي ن م و     */
  var S_IDGHAM_NG= '\u0631\u0644';                    /* ر ل         */
  var S_IZHAR    = '\u0621\u0647\u062D\u062E\u0639\u063A'; /* ء ه ح خ ع غ */
  var S_IKHFA    = '\u062A\u062B\u062C\u062F\u0630\u0632'  /* ت ث ج د ذ ز */
                 + '\u0633\u0634\u0635\u0636\u0637\u0638'  /* س ش ص ض ط ظ */
                 + '\u0641\u0642\u0643';                   /* ف ق ك       */
  var S_QALQALA  = '\u0642\u0637\u0628\u062C\u062F'; /* ق ط ب ج د   */
  var S_SOLAR    = '\u062A\u062B\u062F\u0630\u0631\u0632'  /* ت ث د ذ ر ز */
                 + '\u0633\u0634\u0635\u0636\u0637\u0638'  /* س ش ص ض ط ظ */
                 + '\u0644\u0646';                         /* ل ن         */

  /* ═══════════════════════════════════════════════════════════════
     § 2. RULE METADATA
     Each rule: { c: cssClass, l: Arabic label, e: explanation, p: priority }
     PRIORITY: lower integer = wins in conflict.
       Madd (1-5) > Ghunna/Ikhfa (10-15) > Idgham/Izhar (20-24)
       > Qalqalah (25) > TafkhimRa (30) > Lam (40-41)
  ═══════════════════════════════════════════════════════════════ */

  var RM = {
    /* ── Madd family ── */
    madd6:      { c:'tj-madd-6',              l:'مد لازم',
                  e:'المد اللازم — يُمد 6 حركات لزوماً (مشدد أو مسكّن بعد حرف المد)',       p:1  },
    madd4:      { c:'tj-madd-4',              l:'مد واجب متصل',
                  e:'المد الواجب المتصل — يُمد 4 أو 5 حركات (الهمزة في نفس الكلمة)',        p:2  },
    maddFlex:   { c:'tj-madd-flex',           l:'مد جائز منفصل',
                  e:'المد الجائز المنفصل — يُمد 2 أو 4 أو 6 حركات (الهمزة في كلمة تالية)', p:3  },
    madd2:      { c:'tj-madd-2',              l:'مد طبيعي',
                  e:'المد الطبيعي — يُمد حركتين، لا همزة ولا سكون بعده',                    p:4  },
    maddLin:    { c:'tj-madd-2',              l:'مد لين',
                  e:'مد اللين — واو أو ياء ساكنة بعد فتحة، يُمد حركتين',                   p:5  },

    /* ── Ghunna / Ikhfa / Iqlab (nasal — GREEN) ── */
    iqlab:      { c:'tj-iqlab',               l:'إقلاب',
                  e:'النون الساكنة أو التنوين تُقلب ميماً خفيفة عند الباء مع غنة',          p:10 },
    ikhfa:      { c:'tj-ikhfa',               l:'إخفاء',
                  e:'النون الساكنة أو التنوين تُخفى عند 15 حرف إخفاء مع غنة حركتين',       p:11 },
    ikhfaShaf:  { c:'tj-ikhfa',               l:'إخفاء شفوي',
                  e:'الميم الساكنة تُخفى عند الباء مع غنة حركتين',                          p:12 },
    ghunna:     { c:'tj-ghunna',              l:'غنة',
                  e:'نون أو ميم مشددة — الغنة حركتان',                                      p:13 },

    /* ── Idgham / Izhar (non-pronounced — GRAY) ── */
    idgham:     { c:'tj-idgham',              l:'إدغام بغنة',
                  e:'النون الساكنة أو التنوين تندمج في حروف (ي ن م و) في الكلمة التالية',  p:20 },
    idghamNG:   { c:'tj-idgham-bila-ghunna',  l:'إدغام بلا غنة',
                  e:'النون الساكنة أو التنوين تندمج في الراء أو اللام بلا غنة',             p:21 },
    idghamShaf: { c:'tj-idgham',              l:'إدغام شفوي',
                  e:'الميم الساكنة تندمج في الميم التالية',                                  p:22 },
    izhar:      { c:'tj-izhar',               l:'إظهار حلقي',
                  e:'النون الساكنة أو التنوين تُظهر بوضوح قبل حروف الحلق',                 p:23 },

    /* ── Qalqalah ── */
    qalqala:    { c:'tj-qalqala',             l:'قلقلة',
                  e:'أحد حروف قطب جد الساكن — ينطق بنبرة بعد النطق به',                    p:30 },

    /* ── Tafkhim Ra ── */
    tafkhimRa:  { c:'tj-tafkhim-ra',          l:'تفخيم الراء',
                  e:'الراء المفخمة — تُنطق بصوت مفخم عند الفتح أو الضم',                   p:40 },

    /* ── Lam ── */
    lamShams:   { c:'tj-lam-shams',           l:'لام شمسية',
                  e:'لام التعريف تندمج في الحرف الشمسي — لا تُلفظ',                        p:50 },
    lamQamar:   { c:'tj-lam-qamar',           l:'لام قمرية',
                  e:'لام التعريف تُنطق ظاهرة قبل الحرف القمري',                             p:51 },
  };

  /* ═══════════════════════════════════════════════════════════════
     § 3. HELPERS
  ═══════════════════════════════════════════════════════════════ */

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Build a <span> — data-rule for label, data-exp for explanation tooltip */
  function mkSpan(inner, rule) {
    return '<span class="' + rule.c
      + '" data-rule="' + rule.l
      + '" data-exp="'  + rule.e + '">'
      + inner + '</span>';
  }

  /* Is ch an Arabic diacritic? */
  function isDiac(ch) {
    var c = ch.charCodeAt(0);
    return (c >= 0x064B && c <= 0x065F)
        || (c >= 0x0610 && c <= 0x061A)
        || (c >= 0x06D6 && c <= 0x06DC)
        || (c >= 0x06DF && c <= 0x06ED)
        || c === 0x0670;
  }

  /* Is ch an Arabic base letter (excluding digits/punctuation)? */
  function isBase(ch) {
    var c = ch.charCodeAt(0);
    return (c >= 0x0621 && c <= 0x063A)
        || (c >= 0x0641 && c <= 0x064A)
        || c === 0x0671; /* alef wasla */
  }

  /* ═══════════════════════════════════════════════════════════════
     § LAYER 1 — TOKENIZER
     ─────────────────────────────────────────────────────────────
     tokenizeWords(text)
       → [{ text, start, end }]  (non-space tokens only, absolute positions)

     graphemes(word)
       → [{ base, marks, s, e }]  (base letter + all its diacritics)
       s/e are ABSOLUTE positions in the full text string.
  ═══════════════════════════════════════════════════════════════ */

  function tokenizeWords(text) {
    var words = [];
    var re = /[^\s]+/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
    }
    return words;
  }

  /* Split a word token into grapheme objects.
     Each grapheme = { base: char, marks: string, s: absStart, e: absEnd } */
  function graphemes(word) {
    var gs = [];
    var t   = word.text;
    var abs = word.start;
    var i   = 0;
    while (i < t.length) {
      var ch = t[i];
      if (!isBase(ch)) { i++; continue; }
      var g = { base: ch, marks: '', s: abs + i, e: abs + i + 1 };
      i++;
      while (i < t.length && isDiac(t[i])) {
        g.marks += t[i];
        g.e++;
        i++;
      }
      gs.push(g);
    }
    return gs;
  }

  /* Return first base letter of a word (used for cross-word lookahead) */
  function firstBase(word) {
    if (!word) return null;
    var gs = graphemes(word);
    return gs.length ? gs[0].base : null;
  }

  /* ═══════════════════════════════════════════════════════════════
     § LAYER 2 — RULE ENGINE + CONTEXT ANALYZER
     ─────────────────────────────────────────────────────────────
     Each analyzer receives:
       gs        — grapheme array for current word
       nextWord  — next word token (for cross-word analysis), may be null
       hits      — array to push results into

     A Hit = { s, e, m: ruleMetaRef, len }
     Spans only cover the TRIGGERING letter (not the destination letter).
     This matches how Dar Al-Maʿrifah marks text.
  ═══════════════════════════════════════════════════════════════ */

  /* ── NOON SAKINAH + TANWIN ─────────────────────────────────── */

  function analyzeNoon(gs, nextWord, hits) {
    var nfb = firstBase(nextWord); /* next-word first base */

    for (var i = 0; i < gs.length; i++) {
      var g = gs[i];

      /* ① Noon sakinah: نْ */
      if (g.base === NOON && g.marks.indexOf(SK) >= 0) {
        /* Next letter: within same word → cross-word=false, else use next word */
        var nb = (i + 1 < gs.length) ? gs[i + 1].base : nfb;
        var xw = (i + 1 >= gs.length); /* true = cross-word */
        if (!nb) continue;
        var r = noonClassify(nb, xw);
        if (r) hits.push({ s: g.s, e: g.e, m: RM[r], len: g.e - g.s });
        continue;
      }

      /* ② Tanwin (ً ٌ ٍ) — always cross-word */
      var hasTW = g.marks.indexOf(TF) >= 0
               || g.marks.indexOf(TD) >= 0
               || g.marks.indexOf(TK) >= 0;
      if (hasTW && nfb) {
        var r2 = noonClassify(nfb, true);
        if (r2) hits.push({ s: g.s, e: g.e, m: RM[r2], len: g.e - g.s });
      }
    }
  }

  function noonClassify(nb, crossWord) {
    if (S_IQLAB.indexOf(nb)    >= 0)               return 'iqlab';
    if (S_IDGHAM_G.indexOf(nb) >= 0 && crossWord)  return 'idgham';
    if (S_IDGHAM_NG.indexOf(nb)>= 0 && crossWord)  return 'idghamNG';
    if (S_IKHFA.indexOf(nb)    >= 0)               return 'ikhfa';
    if (S_IZHAR.indexOf(nb)    >= 0)               return 'izhar';
    return null;
  }

  /* ── MEEM SAKINAH ──────────────────────────────────────────── */

  function analyzeMeem(gs, nextWord, hits) {
    var nfb = firstBase(nextWord);
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i];
      if (g.base !== MEEM || g.marks.indexOf(SK) < 0) continue;
      var nb = (i + 1 < gs.length) ? gs[i + 1].base : nfb;
      if (!nb) continue;
      if (nb === '\u0628')  /* ب */ { hits.push({ s:g.s, e:g.e, m:RM.ikhfaShaf,  len:g.e-g.s }); }
      else if (nb === MEEM)          { hits.push({ s:g.s, e:g.e, m:RM.idghamShaf, len:g.e-g.s }); }
      /* izhar shafawi (other consonants) — no color in Dar Al-Maʿrifah */
    }
  }

  /* ── QALQALAH ──────────────────────────────────────────────── */

  function analyzeQalqala(gs, hits) {
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i];
      if (S_QALQALA.indexOf(g.base) >= 0 && g.marks.indexOf(SK) >= 0) {
        hits.push({ s:g.s, e:g.e, m:RM.qalqala, len:g.e-g.s });
      }
    }
  }

  /* ── GHUNNA (noon/meem with shadda) ───────────────────────── */

  function analyzeGhunna(gs, hits) {
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i];
      if ((g.base === NOON || g.base === MEEM) && g.marks.indexOf(SH) >= 0) {
        hits.push({ s:g.s, e:g.e, m:RM.ghunna, len:g.e-g.s });
      }
    }
  }

  /* ── TAFKHIM RA ────────────────────────────────────────────── */
  /*
   * Ra is MUFAKHKHAM (heavy) when:
   *   Case 1 — Ra has fatha or damma (رَ رُ)
   *   Case 2 — Ra has shadda + fatha/damma (رَّ رُّ)
   *   Case 3 — Ra with sukun, PRECEDING letter has fatha or damma (ـَرْ ـُرْ)
   *   Case 4 — Ra with sukun, preceded by kasra that is itself preceded by
   *             alef (e.g., مِرْصَادَ — tarqiq by some scholars; skip for safety)
   * Ra is MURAQQA (light) when it has kasra — NOT colored.
   */
  function analyzeTafkhimRa(gs, hits) {
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i];
      if (g.base !== RA) continue;

      var hasFD = g.marks.indexOf(FA) >= 0 || g.marks.indexOf(DA) >= 0;
      var hasK  = g.marks.indexOf(KA) >= 0;
      var hasSK = g.marks.indexOf(SK) >= 0;

      if (hasK) continue; /* tarqiq — skip */

      if (hasFD) {
        /* Case 1 + 2: ra with fatha or damma */
        hits.push({ s:g.s, e:g.e, m:RM.tafkhimRa, len:g.e-g.s });
      } else if (hasSK && i > 0) {
        /* Case 3: ra with sukun — check preceding vowel */
        var prev = gs[i - 1];
        if (prev.marks.indexOf(FA) >= 0 || prev.marks.indexOf(DA) >= 0) {
          hits.push({ s:g.s, e:g.e, m:RM.tafkhimRa, len:g.e-g.s });
        }
      }
    }
  }

  /* ── MADD ──────────────────────────────────────────────────── */
  /*
   * Context-Analyzer — classifies every madd occurrence into its rank:
   *
   * ① آ  (alef maddah U+0622)              → madd6 (lazim, always 6)
   * ② Any letter + dagger alef ٰ (U+0670)  → madd2 (tabi'i, hidden alef)
   * ③ Waw/ya + maddah above ٓ (U+0653)     → madd2 (explicit prolongation mark)
   * ④ فَ + bare alef ا  (fatha + alef)     → rank based on what follows alef
   * ⑤ فُ + sakin-waw  (damma + waw)       → rank based on what follows waw
   * ⑥ فِ + sakin-ya   (kasra + ya)        → rank based on what follows ya
   * ⑦ فَوْ / فَيْ   (fatha + waw/ya + sukun) → madd lin (madd2)
   * ⑧ ٱ  (alef wasla U+0671)              → madd2 (connection vowel)
   *
   * Rank after madd extension letter:
   *   • Next grapheme (same word) has SHADDA or SUKUN → madd6 (lazim)
   *   • Next grapheme (same word) is HAMZA            → madd4 (muttasil)
   *   • End of word + next word starts with HAMZA     → maddFlex (munfasil)
   *   • Otherwise                                     → madd2 (tabi'i)
   */
  function analyzeMadd(gs, nextWord, hits) {
    var nfb = firstBase(nextWord);

    for (var i = 0; i < gs.length; i++) {
      var g = gs[i];

      /* ① آ  alef maddah (U+0622)
       * Rank is NOT always lazim — check what follows:
       *   آمَنَ  → next=م(FA)   → no shadda/hamza → madd2 (tabi'i)
       *   قُرْآنُ → next=ن(DA)  → no shadda/hamza → madd2
       *   hypothetical آّ/آْ    → next has shadda/sukun → madd6 (lazim)
       * The maddah diacritic indicates the alef IS an extension letter;
       * its RANK is determined by what comes after it, identical to case ④.
       */
      if (g.base === ALEF_MAD) {
        var rankAlefMad = maddRank(gs, i + 1, nfb);
        hits.push({ s:g.s, e:g.e, m:RM[rankAlefMad], len:g.e-g.s });
        continue;
      }

      /* ⑧ ٱ  alef wasla — madd2 */
      if (g.base === ALEF_WSL) {
        hits.push({ s:g.s, e:g.e, m:RM.madd2, len:g.e-g.s });
        continue;
      }

      /* ② Dagger alef on any letter */
      if (g.marks.indexOf(DG) >= 0) {
        hits.push({ s:g.s, e:g.e, m:RM.madd2, len:g.e-g.s });
        continue;
      }

      /* ③ Maddah above on waw or ya */
      if ((g.base === WAW || g.base === YA) && g.marks.indexOf(MK) >= 0) {
        hits.push({ s:g.s, e:g.e, m:RM.madd2, len:g.e-g.s });
        continue;
      }

      /* ④ Fatha + following bare alef (U+0627, no vowel marks) */
      if (g.marks.indexOf(FA) >= 0 && (i + 1) < gs.length) {
        var n1 = gs[i + 1];
        if (n1.base === ALEF && isMaddExtension(n1.marks)) {
          /* bare alef = madd alef */
          var rank = maddRank(gs, i + 2, nfb);
          hits.push({ s:g.s, e:n1.e, m:RM[rank], len:n1.e - g.s });
          i++; /* skip the alef grapheme */
          continue;
        }
        /* ⑦ Madd Lin: fatha + waw/ya + sukun */
        if (n1 && (n1.base === WAW || n1.base === YA) && n1.marks.indexOf(SK) >= 0) {
          hits.push({ s:g.s, e:n1.e, m:RM.maddLin, len:n1.e - g.s });
          i++;
          continue;
        }
      }

      /* ⑤ Damma + following sakin-waw */
      if (g.marks.indexOf(DA) >= 0 && (i + 1) < gs.length) {
        var n2 = gs[i + 1];
        if (n2.base === WAW && isMaddExtension(n2.marks)) {
          var rank2 = maddRank(gs, i + 2, nfb);
          hits.push({ s:g.s, e:n2.e, m:RM[rank2], len:n2.e - g.s });
          i++;
          continue;
        }
      }

      /* ⑥ Kasra + following sakin-ya */
      if (g.marks.indexOf(KA) >= 0 && (i + 1) < gs.length) {
        var n3 = gs[i + 1];
        if (n3.base === YA && isMaddExtension(n3.marks)) {
          var rank3 = maddRank(gs, i + 2, nfb);
          hits.push({ s:g.s, e:n3.e, m:RM[rank3], len:n3.e - g.s });
          i++;
          continue;
        }
      }
    }
  }

  /*
   * A waw or ya is a "madd extension" letter when it carries NO vowel
   * and NO shadda.  Letters with FA/DA/KA/tanwin are consonantal.
   * Letters with SH (shadda) are doubled consonants (e.g. يَّ in تُؤَدِّي),
   * NEVER a prolongation extension.
   */
  function isMaddExtension(marks) {
    return marks.indexOf(FA) < 0
        && marks.indexOf(DA) < 0
        && marks.indexOf(KA) < 0
        && marks.indexOf(SH) < 0   /* shadda = doubled consonant, not extension */
        && marks.indexOf(TF) < 0
        && marks.indexOf(TD) < 0
        && marks.indexOf(TK) < 0;
  }

  /*
   * Classify madd rank based on what comes AFTER the extension letter.
   * afterIdx = index in gs of the grapheme AFTER the extension letter
   *            (may equal gs.length if the extension letter is word-final)
   * nfb      = first base letter of the next word (null if none)
   */
  function maddRank(gs, afterIdx, nfb) {
    if (afterIdx < gs.length) {
      var next = gs[afterIdx];
      /* Shadda or sukun on next letter → Madd Lazim */
      if (next.marks.indexOf(SH) >= 0 || next.marks.indexOf(SK) >= 0) {
        return 'madd6';
      }
      /* Hamza form → Madd Wajib Muttasil */
      if (S_HAMZA.indexOf(next.base) >= 0) {
        return 'madd4';
      }
      /* Otherwise → Tabi'i */
      return 'madd2';
    }
    /* Extension letter is last grapheme in word */
    if (nfb && S_HAMZA.indexOf(nfb) >= 0) {
      return 'maddFlex'; /* Hamza starts next word → Munfasil */
    }
    return 'madd2'; /* Tabi'i */
  }

  /* ── LAM (shamsiyyah / qamariyyah) ─────────────────────────── */
  /*
   * Pattern: (alef | alef-wasla) + lam  [+ next-letter for classification]
   *
   * IMPORTANT: the span covers ONLY alef + lam (ending at g1.e).
   * The following solar/lunar letter is NOT included in the span.
   * This prevents the lam span from blocking madd or other rules
   * that may apply to the letter immediately after the lam.
   * (e.g., الضَّالِّينَ: "ال" is gray, but "ضَّا" still gets madd6.)
   *
   * g2 is looked at only to CLASSIFY the lam — it is not colored here.
   */
  function analyzeLam(gs, hits) {
    for (var i = 0; i + 2 < gs.length; i++) {
      var g0 = gs[i];
      if (g0.base !== ALEF && g0.base !== ALEF_WSL) continue;
      var g1 = gs[i + 1];
      if (g1.base !== LAM) continue;
      var g2  = gs[i + 2];
      var end = g1.e; /* span ends at END OF LAM, not g2 */

      if (S_SOLAR.indexOf(g2.base) >= 0) {
        hits.push({ s:g0.s, e:end, m:RM.lamShams, len:end - g0.s });
        i++; /* advance past lam only; g2 is free for other rules */
      } else if (/[\u0621-\u063A\u0641-\u064A]/.test(g2.base)) {
        hits.push({ s:g0.s, e:end, m:RM.lamQamar, len:end - g0.s });
        i++;
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     § LAYER 3 — PRIORITY RESOLVER
     ─────────────────────────────────────────────────────────────
     Sort hits by:
       1. Position (earlier first)
       2. Priority (lower p = higher priority wins at same position)
       3. Length   (longer match wins when position + priority tie)
     Then prune: keep only non-overlapping hits in a single forward pass.
  ═══════════════════════════════════════════════════════════════ */

  function resolveHits(hits) {
    hits.sort(function (a, b) {
      if (a.s   !== b.s)     return a.s   - b.s;
      if (a.m.p !== b.m.p)   return a.m.p - b.m.p;
      return b.len - a.len;
    });

    var clean = [];
    var pos   = 0;
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      if (h.s >= pos) { clean.push(h); pos = h.e; }
    }
    return clean;
  }

  /* ═══════════════════════════════════════════════════════════════
     § RENDERER — single forward pass over text
  ═══════════════════════════════════════════════════════════════ */

  function renderSpans(text, hits) {
    if (!hits.length) return text;
    var out = '';
    var cur = 0;
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      if (h.s > cur) out += text.slice(cur, h.s);
      out += mkSpan(text.slice(h.s, h.e), h.m);
      cur = h.e;
    }
    if (cur < text.length) out += text.slice(cur);
    return out;
  }

  /* ═══════════════════════════════════════════════════════════════
     § PUBLIC API
  ═══════════════════════════════════════════════════════════════ */

  function applyTajweed(rawText) {
    if (!rawText) return '';
    var text  = esc(rawText);
    var words = tokenizeWords(text);
    var hits  = []; /* local — safe for re-entrant / concurrent use */

    for (var wi = 0; wi < words.length; wi++) {
      var word = words[wi];
      var nw   = wi + 1 < words.length ? words[wi + 1] : null;
      var gs   = graphemes(word);

      analyzeNoon(gs, nw, hits);
      analyzeMeem(gs, nw, hits);
      analyzeQalqala(gs, hits);
      analyzeGhunna(gs, hits);
      analyzeTafkhimRa(gs, hits);
      analyzeMadd(gs, nw, hits);
      analyzeLam(gs, hits);
    }

    return renderSpans(text, resolveHits(hits));
  }

  win.applyTajweed = applyTajweed;

  /* ═══════════════════════════════════════════════════════════════
     § CSS INJECTOR — Dar Al-Maʿrifah, Hafs ʿan ʿĀsim
     ─────────────────────────────────────────────────────────────
     Single source of truth for ALL tajweed colors.
     Destroys and recreates the style tag on each script evaluation
     so Netlify cache-busts + hot-reloads always get fresh values.
     All rules use !important to override any prior stylesheet.

     COLOR LEGEND (matches the reference Mushaf image exactly):

     ■ MADD — red/pink family (darkest = longest):
         tj-madd-6    #9b002a  — 6 harakat   مد لازم
         tj-madd-4    #e91e63  — 4-5 harakat  مد واجب متصل
         tj-madd-flex #ff5722  — 2/4/6 jaiz   مد جائز منفصل
         tj-madd-2    #a52a2a  — 2 harakat    مد طبيعي / لين

     ■ IKHFA / GHUNNA / IQLAB — green (إخفاء ومواقع الغنة):
         tj-ghunna    #2e7d32
         tj-ikhfa     #2e7d32
         tj-iqlab     #2e7d32

     ■ IDGHAM / IZHAR / LAM SHAMS — gray (إدغام ومالا يُلفظ):
         tj-idgham              #9e9e9e
         tj-idgham-bila-ghunna  #9e9e9e
         tj-izhar               #9e9e9e
         tj-lam-shams           #9e9e9e

     ■ QALQALAH — light blue:
         tj-qalqala   #42a5f5

     ■ TAFKHIM RA — dark blue:
         tj-tafkhim-ra #0d47a1

     ■ LAM QAMARIYYAH — subtle green (pronounced lam):
         tj-lam-qamar #43a047
  ═══════════════════════════════════════════════════════════════ */

  (function injectCSS() {
    var ID  = 'tajweed-map-css';
    var old = document.getElementById(ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var css = [

      /* ── MADD (red family, 4 distinct shades) ─────────────── */
      '.tj-madd-6      { color:#9b002a !important; font-weight:700; }',
      '.tj-madd-4      { color:#e91e63 !important; font-weight:700; }',
      '.tj-madd-flex   { color:#ff5722 !important; font-weight:700; }',
      '.tj-madd-2      { color:#a52a2a !important; font-weight:700; }',
      '.tj-madd        { color:#a52a2a !important; }', /* legacy fallback */

      /* ── IKHFA / GHUNNA / IQLAB (green) ───────────────────── */
      '.tj-ghunna      { color:#2e7d32 !important; font-weight:700; }',
      '.tj-ikhfa       { color:#2e7d32 !important; font-weight:700; }',
      '.tj-iqlab       { color:#2e7d32 !important; font-weight:700; }',

      /* ── IDGHAM / IZHAR / LAM SHAMS (gray) ────────────────── */
      '.tj-idgham              { color:#9e9e9e !important; }',
      '.tj-idgham-bila-ghunna  { color:#9e9e9e !important; }',
      '.tj-izhar               { color:#9e9e9e !important; }',
      '.tj-lam-shams           { color:#9e9e9e !important; }',

      /* ── QALQALAH (light blue) ─────────────────────────────── */
      '.tj-qalqala     { color:#42a5f5 !important; font-weight:700; }',

      /* ── TAFKHIM RA (dark blue) ────────────────────────────── */
      '.tj-tafkhim-ra  { color:#0d47a1 !important; font-weight:700; }',

      /* ── LAM QAMARIYYAH (subtle green) ────────────────────── */
      '.tj-lam-qamar   { color:#43a047 !important; }',

      /* ── TOOLTIP (hover shows Arabic rule label) ───────────── */
      '[data-rule] { cursor:help; position:relative; }',
      '[data-rule]:hover::after {',
      '  content: attr(data-rule);',
      '  position:absolute; z-index:9999; top:-28px; right:0;',
      '  background:rgba(7,26,21,.93); color:#e8c84a;',
      '  font-family:"Tajawal",sans-serif; font-size:11px; font-weight:700;',
      '  padding:3px 9px; border-radius:6px; white-space:nowrap;',
      '  pointer-events:none; box-shadow:0 2px 8px rgba(0,0,0,.3);',
      '}',

      /* ── Explanation popup (shown by JS on click — future) ── */
      '.tj-popup {',
      '  position:fixed; z-index:99999; padding:10px 14px; max-width:260px;',
      '  background:rgba(7,26,21,.97); color:#e2f4ef;',
      '  font-family:"Tajawal",sans-serif; font-size:13px; line-height:1.7;',
      '  border-radius:10px; box-shadow:0 6px 24px rgba(0,0,0,.45);',
      '  direction:rtl; text-align:right; pointer-events:none;',
      '}',
      '.tj-popup .tj-popup-rule { color:#e8c84a; font-weight:900; font-size:15px; }',

      /* ── Container must be relative for tooltip positioning ── */
      '.qr-mushaf-body { position:relative !important; }',

    ].join('\n');

    var el = document.createElement('style');
    el.id  = ID;
    el.textContent = css;
    document.head.appendChild(el);
  })();

  /* ═══════════════════════════════════════════════════════════════
     § BONUS: Tooltip click handler
     Attaches once to document; shows a rich popup with the rule
     explanation stored in data-exp when a tajweed span is clicked.
     The popup dismisses on the next tap/click anywhere.
  ═══════════════════════════════════════════════════════════════ */

  (function attachTooltipHandler() {
    function ready(fn) {
      if (document.readyState !== 'loading') fn();
      else document.addEventListener('DOMContentLoaded', fn);
    }
    ready(function () {
      var popup = null;

      function dismiss() {
        if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
        popup = null;
      }

      document.addEventListener('click', function (e) {
        /* Dismiss any open popup first */
        dismiss();

        var el = e.target;
        /* Walk up to find a tajweed span */
        while (el && el !== document.body) {
          if (el.dataset && el.dataset.rule && el.dataset.exp) break;
          el = el.parentNode;
        }
        if (!el || !el.dataset || !el.dataset.rule) return;

        e.stopPropagation();

        /* Build popup */
        popup = document.createElement('div');
        popup.className = 'tj-popup';
        popup.innerHTML =
          '<div class="tj-popup-rule">' + el.dataset.rule + '</div>' +
          '<div style="margin-top:4px;font-size:12px;opacity:.85;">' + (el.dataset.exp || '') + '</div>';

        /* Position near the clicked element */
        var rect = el.getBoundingClientRect();
        popup.style.top  = Math.max(8, rect.top - 90) + 'px';
        popup.style.right = Math.max(8, window.innerWidth - rect.right - 10) + 'px';
        popup.style.left  = 'auto';

        document.body.appendChild(popup);

        /* Auto-dismiss after 3 s */
        setTimeout(dismiss, 3000);
      }, false);
    });
  })();

})(window);
