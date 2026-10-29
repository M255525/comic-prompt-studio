/* 漫畫分鏡提示詞工坊 — 介面與提示詞組裝 */
(function () {
  'use strict';
  var D = window.CPS;
  var $ = function (id) { return document.getElementById(id); };
  var MAX_CHARS = 4;
  var LS = { prefs: 'comicPromptPrefs', draft: 'comicPromptDraft', myChars: 'comicPromptMyChars', history: 'comicPromptHistory', warn: 'comicPromptWarnSeen' };

  function lsGet(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var PREF_DEFAULTS = { platform: 'gemini', style: 'shonen', panels: 4, ratio: '3:4', lang: 'zh-TW', layout: 'grid', color: 'full', theme: 'system', aiProvider: 'gemini', aiModel: '', aiModelCustom: '', aiBase: '', aiKey: '' };
  var prefs = Object.assign({}, PREF_DEFAULTS, lsGet(LS.prefs, {}));

  function defaultSettings() {
    return { style: prefs.style, panels: +prefs.panels, layout: prefs.layout, ratio: prefs.ratio, color: prefs.color, lang: prefs.lang,
      bubble: 'round', mood: 'funny', dir: 'ltr', shotMode: 'auto', sfx: true, genMode: 'page' };
  }

  function defaultTopic() { return { tab: 'text', text: '', type: 'knowledge', ctx: '', a: '', b: '' }; }
  var state = { text: '', settings: defaultSettings(), chars: [], panels: [], platform: prefs.platform, edited: false, topic: defaultTopic() };

  /* ================= 人物 ================= */
  function presetToChar(p) {
    var c = { name: p.name, age: p.age, look: p.look, outfit: p.outfit, personality: p.personality, catchphrase: p.catchphrase, colors: p.colors, en: p.en || '' };
    if (p.famous) c.famous = true;
    return c;
  }
  function blankChar() { return { name: '', age: '', look: '', outfit: '', personality: '', catchphrase: '', colors: '', en: '' }; }
  function myChars() { return lsGet(LS.myChars, []); }
  function activeChars() { return state.chars.filter(function (c) { return c.name.trim(); }); }
  function aliases(c) {
    var n = c.name.trim(), a = [n];
    if (n.length >= 3 && /[一-鿿]/.test(n)) a.push(n.slice(-2));
    return a;
  }
  function charDescZh(c) {
    var parts = [];
    if (c.famous) parts.push('知名卡通角色，請維持原作的經典造型');
    if (c.age) parts.push(c.age);
    if (c.look) parts.push('外型：' + c.look);
    if (c.outfit && c.outfit !== '無') parts.push('服裝：' + c.outfit);
    if (c.personality) parts.push('個性：' + c.personality);
    if (c.colors) parts.push('代表配色：' + c.colors);
    return c.name + (parts.length ? '（' + parts.join('；') + '）' : '');
  }
  function charDescEn(c) {
    if (c.en) return c.name + ': ' + c.en;
    return c.name + ': ' + [c.age, c.look, c.outfit, c.colors && ('colors ' + c.colors)].filter(Boolean).join(', ');
  }

  /* ================= 規則式分鏡 ================= */
  var PLACES = [
    ['會議室', 'meeting room'], ['辦公室', 'office'], ['教室', 'classroom'], ['學校', 'school'], ['工作室', 'small studio workshop'],
    ['咖啡', 'cafe'], ['廚房', 'kitchen'], ['餐廳', 'restaurant'], ['客廳', 'living room'], ['房間', 'bedroom'], ['阿嬤家', "grandma's home"],
    ['家', 'home'], ['夜市', 'night market'], ['公園', 'park'], ['捷運', 'metro train'], ['街', 'city street'], ['海邊', 'beach'], ['店', 'shop'], ['車上', 'inside a car']
  ];
  var TIMES = [['凌晨', 'late night before dawn'], ['早上', 'morning'], ['中午', 'noon'], ['下午', 'afternoon'], ['傍晚', 'dusk'], ['放學後', 'after school'], ['晚上', 'evening'], ['半夜', 'midnight'], ['隔天', 'the next day']];
  var SFX_RULES = [[/衝|跑|飛奔/, '咻——'], [/大喊|尖叫|喊/, '！！'], [/嗶/, '嗶嗶'], [/汪/, '汪！'], [/門|推開/, '喀啦'], [/倒|摔/, '碰！'], [/嘆|鬆了一口氣/, '呼～'], [/吃|咬/, '嚼嚼'], [/哭|眼淚/, '嗚…'], [/笑/, '哈哈']];

  function splitOutside(str, re) {
    // 只在引號外的標點切開
    var out = [], buf = '', depth = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if ('「『“'.indexOf(ch) >= 0) depth++;
      if ('」』”'.indexOf(ch) >= 0) depth = Math.max(0, depth - 1);
      buf += ch;
      if (depth === 0 && re.test(ch)) {
        var nx = str[i + 1];
        if (nx && '」』”'.indexOf(nx) >= 0) continue;
        out.push(buf.trim()); buf = '';
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out.filter(Boolean);
  }

  function groupUnits(text, n) {
    var units = text.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (units.length < n) units = [].concat.apply([], units.map(function (u) { return splitOutside(u, /[。！？!?]/); }));
    var groups;
    if (units.length >= n) {
      groups = [];
      for (var i = 0; i < n; i++) groups.push(units.slice(Math.floor(i * units.length / n), Math.floor((i + 1) * units.length / n)).join(''));
    } else {
      groups = units.slice();
      var guard = 0;
      while (groups.length < n && guard++ < 50) {
        var best = -1, bestLen = 0;
        groups.forEach(function (g, idx) {
          if (g.indexOf('〈反應〉') === 0) return;
          var segs = splitOutside(g, /[，,；;]/);
          if (segs.length >= 2 && g.length > bestLen) { best = idx; bestLen = g.length; }
        });
        if (best < 0) break;
        var segs = splitOutside(groups[best], /[，,；;]/), half = Math.ceil(segs.length / 2);
        groups.splice(best, 1, segs.slice(0, half).join(''), segs.slice(half).join(''));
      }
      while (groups.length < n) groups.push('〈反應〉');
    }
    return groups;
  }

  function detect(list, str) { for (var i = 0; i < list.length; i++) if (str.indexOf(list[i][0]) >= 0) return list[i]; return null; }
  function detectExpr(str) { for (var i = 0; i < D.EXPR_KEYWORDS.length; i++) if (D.EXPR_KEYWORDS[i][1].test(str)) return D.EXPR_KEYWORDS[i][0]; return 'calm'; }
  function autoShot(i, n, expr, isReaction) {
    if (isReaction) return 'close';
    if (i === 0) return 'wide';
    if (expr === 'surprise' && i < n - 1) return 'close';
    if (expr === 'determined' || expr === 'proud') return 'low';
    if (i === n - 1) return n >= 4 ? 'medium' : 'close';
    return ['medium', 'over', 'close', 'high'][(i - 1) % 4];
  }

  function ruleStoryboard() {
    var n = state.settings.panels, text = state.text.trim();
    var chars = activeChars();
    if (!text) return [];
    var groups = groupUnits(text, n);
    var lastScene = '', lastSceneEn = '', lastChars = chars.slice(0, 2).map(function (c) { return c.name; });
    return groups.map(function (g, i) {
      var isReaction = g === '〈反應〉';
      var src = isReaction ? (groups[i - 1] || '') : g;
      // 只有前面接「：」或說／喊／問等動詞的引號才算對白，其餘（檔名、標語）留在畫面描述裡
      var quotes = [], firstQ = -1, m, re = /[「“"]([^」”"]+)[」”"]/g, action = '', last = 0;
      while ((m = re.exec(g))) {
        var before = g.slice(Math.max(0, m.index - 3), m.index);
        if (/[：:]\s*$|[說喊問道叫答]$/.test(before)) {
          quotes.push(m[1]); if (firstQ < 0) firstQ = m.index;
          action += g.slice(last, m.index).replace(/[：:]\s*$/, '，');
        } else action += g.slice(last, m.index + m[0].length);
        last = m.index + m[0].length;
      }
      action += g.slice(last);
      action = action.replace(/，([。！？])/g, '$1').replace(/[：:，,]\s*$/, '').trim();
      var plain = isReaction ? '' : action;
      // 出場角色：依出現位置排序
      var present = chars.map(function (c) {
        var pos = -1;
        aliases(c).forEach(function (a) { var p = src.indexOf(a); if (p >= 0 && (pos < 0 || p < pos)) pos = p; });
        return { c: c, pos: pos };
      }).filter(function (x) { return x.pos >= 0; }).sort(function (a, b) { return a.pos - b.pos; });
      var names = present.length ? present.map(function (x) { return x.c.name; }) : lastChars;
      lastChars = names;
      // 說話者：第一句對白所在子句裡最先出現的角色（「小米問 Pico：」→ 小米）
      var speaker = '';
      if (quotes.length) {
        var head = g.slice(0, firstQ), cut = Math.max(head.lastIndexOf('。'), head.lastIndexOf('！'), head.lastIndexOf('？'));
        var clause = head.slice(cut + 1), bestPos = -1;
        present.forEach(function (x) {
          aliases(x.c).forEach(function (a) { var p = clause.indexOf(a); if (p >= 0 && (bestPos < 0 || p < bestPos)) { bestPos = p; speaker = x.c.name; } });
        });
        // 子句裡沒有已知角色（例如「客戶冷冷地說」）就留空，不硬套成在場角色
        if (!speaker && /^(她|他|牠|它)/.test(clause.trim())) speaker = names[0] || '';
      }
      var place = detect(PLACES, plain || src), time = detect(TIMES, plain || src);
      if (place || time) {
        lastScene = [time && time[0], place && place[0]].filter(Boolean).join('的') || lastScene;
        lastSceneEn = [place && place[1], time && time[1]].filter(Boolean).join(', ') || lastSceneEn;
      }
      var expr = detectExpr(src);
      var sfx = '';
      if (state.settings.sfx) { for (var k = 0; k < SFX_RULES.length; k++) if (SFX_RULES[k][0].test(g)) { sfx = SFX_RULES[k][1]; break; } }
      if (isReaction) action = '承接上一格，' + (names[0] || '角色') + '的表情反應特寫，無對白';
      if (!action) action = (speaker || names[0] || '角色') + '說話';
      return {
        scene: lastScene || '同一場景', sceneEn: lastSceneEn, action: action, actionEn: '',
        chars: names.join('、'), expr: expr, speaker: speaker, dialogue: quotes.join(' '),
        shot: autoShot(i, n, expr, isReaction), sfx: isReaction ? '' : sfx
      };
    });
  }

  function blankPanel(i, n) { return { scene: '', sceneEn: '', action: '', actionEn: '', chars: '', expr: 'calm', speaker: '', dialogue: '', shot: autoShot(i, n, 'calm', false), sfx: '' }; }

  function storyboard(force) {
    var n = state.settings.panels;
    if (state.text.trim()) state.panels = ruleStoryboard();
    else if (force || state.panels.length !== n) {
      var old = state.panels; state.panels = [];
      for (var i = 0; i < n; i++) state.panels.push(old[i] || blankPanel(i, n));
    }
    state.edited = false;
    renderPanels(); renderOutput(); saveDraft();
  }

  /* ================= 提示詞組裝 ================= */
  function opt() {
    var s = state.settings;
    return { s: s, style: byId(D.STYLES, s.style), layout: byId(D.LAYOUTS, s.layout), color: byId(D.COLORS, s.color), lang: byId(D.LANGS, s.lang),
      bubble: byId(D.BUBBLES, s.bubble), mood: byId(D.MOODS, s.mood), dir: byId(D.DIRECTIONS, s.dir), chars: activeChars(), panels: state.panels };
  }
  function panelChars(p, chars) {
    var names = (p.chars || '').split(/[、,，\s]+/).filter(Boolean);
    return chars.filter(function (c) { return names.indexOf(c.name) >= 0; });
  }
  function dialogueZh(p, o) {
    if (o.s.lang === 'none' || !p.dialogue) return '';
    var who = p.speaker ? p.speaker + '說' : '對白';
    if (o.s.lang === 'zh-TW') return who + '（' + o.bubble.zhDesc + '）：「' + p.dialogue + '」';
    return who + '（' + o.bubble.zhDesc + '，請把「' + p.dialogue + '」翻譯成' + o.lang.zh + '後放入對白框）';
  }
  function exprZh(id) { return byId(D.EXPRESSIONS, id).zh; }
  function exprEn(id) { return byId(D.EXPRESSIONS, id).en; }
  function shotObj(id) { return byId(D.SHOTS, id); }
  function textRule(o) {
    if (o.s.lang === 'none') return '畫面中不要出現任何對白、文字、浮水印或簽名，純粹用畫面說故事。';
    return '對白一律使用' + o.lang.zh + '，字體清楚好讀，不可出現錯字、亂碼或假文字；除了對白' + (o.s.sfx ? '與音效字' : '') + '之外不要加其他文字、浮水印或簽名。';
  }
  function charBlockZh(o) {
    if (!o.chars.length) return '';
    return '【角色設定（每一格都必須維持相同的臉型、髮型、服裝與配色）】\n' + o.chars.map(function (c) { return '- ' + charDescZh(c); }).join('\n') + '\n';
  }
  function panelLineZh(p, i, o) {
    var pcs = panelChars(p, o.chars);
    var bits = ['場景：' + (p.scene || '同一場景'), '畫面：' + p.action];
    if (pcs.length) bits.push('角色表情：' + pcs.map(function (c) { return c.name; }).join('、') + '（' + exprZh(p.expr) + '）');
    var d = dialogueZh(p, o); if (d) bits.push(d);
    if (o.s.sfx && p.sfx && o.s.lang !== 'none') bits.push('音效字：「' + p.sfx + '」');
    return '第 ' + (i + 1) + ' 格（' + shotObj(p.shot).zhDesc + '）｜' + bits.join('；');
  }

  function buildGemini(o) {
    var n = o.panels.length;
    var head = '【整體風格】' + o.style.zhDesc + '；' + o.color.zhDesc + '；情緒基調：' + o.mood.zhDesc + '。\n';
    if (o.s.genMode === 'each') {
      var intro = '（逐格生成：請依序送出以下 ' + n + ' 段提示詞，每段生成一張；從第 2 格起可把第 1 格成品一起上傳當作角色參考圖，維持角色一致。）\n\n';
      return intro + o.panels.map(function (p, i) {
        return '===== 第 ' + (i + 1) + ' / ' + n + ' 格 =====\n請畫一格單張漫畫分鏡，圖片比例 ' + o.s.ratio + '。\n' + head + charBlockZh(o) +
          '【這一格】' + panelLineZh(p, i, o).replace(/^第 \d+ 格/, '鏡頭') + '\n【文字要求】' + textRule(o);
      }).join('\n\n');
    }
    return '請畫一頁 ' + n + ' 格的短篇漫畫，圖片比例 ' + o.s.ratio + '。\n' + head +
      '【版面】' + o.layout.zhDesc + '，' + o.dir.zhDesc + '，格與格之間用清楚的白色格線分隔。\n' +
      charBlockZh(o) + '【分鏡】\n' + o.panels.map(function (p, i) { return panelLineZh(p, i, o); }).join('\n') + '\n' +
      '【文字要求】' + textRule(o);
  }

  function buildChatGPT(o) {
    var n = o.panels.length;
    function styleSec() {
      return '## 風格\n- 畫風：' + o.style.zhDesc + '\n- 色彩：' + o.color.zhDesc + '\n- 情緒基調：' + o.mood.zhDesc + '\n';
    }
    function charSec() {
      if (!o.chars.length) return '';
      return '## 角色（所有格子保持一致的長相、髮型、服裝與配色）\n' + o.chars.map(function (c, i) {
        return (i + 1) + '. ' + charDescZh(c) + (c.catchphrase ? '；招牌台詞 ' + c.catchphrase : '');
      }).join('\n') + '\n';
    }
    function panelSec(p, i) {
      var pcs = panelChars(p, o.chars), lines = ['### Panel ' + (i + 1) + '｜' + shotObj(p.shot).zh];
      lines.push('- 場景：' + (p.scene || '同一場景'));
      lines.push('- 畫面：' + p.action);
      if (pcs.length) lines.push('- 角色與表情：' + pcs.map(function (c) { return c.name + '（' + exprZh(p.expr) + '）'; }).join('、'));
      if (o.s.lang !== 'none' && p.dialogue) lines.push('- 對白' + (p.speaker ? '（' + p.speaker + '）' : '') + '：「' + p.dialogue + '」' + (o.s.lang !== 'zh-TW' ? '→ 請翻譯成' + o.lang.zh : ''));
      if (o.s.sfx && p.sfx && o.s.lang !== 'none') lines.push('- 音效字：「' + p.sfx + '」');
      return lines.join('\n');
    }
    var rules = '## 注意事項\n- ' + textRule(o) + '\n- 對白框樣式：' + o.bubble.zhDesc + '\n- 每一格的角色外觀必須與角色設定一致';
    if (o.s.genMode === 'each') {
      return '（逐格生成：在同一個對話中依序送出以下 ' + n + ' 段，ChatGPT 會記得前面的角色長相。）\n\n' + o.panels.map(function (p, i) {
        return '===== 第 ' + (i + 1) + ' / ' + n + ' 格 =====\n請生成一張單格漫畫圖片，比例 ' + o.s.ratio + '。\n\n' + styleSec() + '\n' + charSec() + '\n## 分鏡\n' + panelSec(p, i) + '\n\n' + rules;
      }).join('\n\n');
    }
    return '請生成一張圖片：' + n + ' 格短篇漫畫，比例 ' + o.s.ratio + '。\n\n' + styleSec() +
      '- 版面：' + o.layout.zhDesc + '，格線清楚\n- 閱讀方向：' + o.dir.zhDesc + '\n\n' + charSec() + '\n## 分鏡\n' +
      o.panels.map(panelSec).join('\n\n') + '\n\n' + rules;
  }

  function mjParams(o) {
    var p = ' --ar ' + o.s.ratio + (o.style.niji ? ' --niji 6' : ' --v 7') + ' --no text, letters, watermark';
    return p;
  }
  function panelEn(p, o, namesOnly) {
    // 整頁模式已在 Characters 區列出外型，每格只寫名字避免重複；逐格模式每段都要帶完整外型
    var pcs = panelChars(p, o.chars);
    var who = pcs.map(function (c) { return !namesOnly && c.en ? c.en : c.name; }).join(' and ');
    return [shotObj(p.shot).en, who, p.actionEn || ('scene: ' + p.action), exprEn(p.expr) + ' expression', p.sceneEn].filter(Boolean).join(', ');
  }
  function buildMJ(o) {
    var n = o.panels.length, params = mjParams(o);
    var tail = '\n\n— 對白（Midjourney 不擅長畫文字，建議生成後自行加上）—\n' + o.panels.map(function (p, i) {
      return '第 ' + (i + 1) + ' 格：' + (p.dialogue ? (p.speaker ? p.speaker + '：' : '') + '「' + p.dialogue + '」' : '（無對白）') + (p.sfx && o.s.sfx ? ' 音效「' + p.sfx + '」' : '');
    }).join('\n');
    if (o.s.genMode === 'each') {
      return o.panels.map(function (p, i) {
        return '/imagine prompt: single comic panel, ' + o.style.en + ', ' + o.color.en + ', ' + o.mood.en + ' mood, ' + panelEn(p, o) + params;
      }).join('\n\n') + tail;
    }
    var chars = o.chars.length ? ' Characters: ' + o.chars.map(charDescEn).join('; ') + '.' : '';
    return '/imagine prompt: ' + n + '-panel comic page, ' + o.layout.en + ', clear white gutters, ' + o.style.en + ', ' + o.color.en + ', ' + o.mood.en + ' mood.' + chars + ' ' +
      o.panels.map(function (p, i) { return 'Panel ' + (i + 1) + ': ' + panelEn(p, o, true); }).join('. ') + '.' + params + tail;
  }

  function buildGeneric(o) {
    var n = o.panels.length;
    var out = '請根據以下規格生成' + (o.s.genMode === 'each' ? '一系列單格' : '一頁 ' + n + ' 格') + '短篇漫畫圖片。\nGenerate ' + (o.s.genMode === 'each' ? 'a series of single comic panels' : 'a ' + n + '-panel comic page') + ' with the following spec.\n\n';
    out += '【風格 Style】' + o.style.zhDesc + '\n  ' + o.style.en + '\n';
    out += '【色彩 Color】' + o.color.zhDesc + '／' + o.color.en + '\n';
    out += '【基調 Mood】' + o.mood.zhDesc + '／' + o.mood.en + '\n';
    out += '【版面 Layout】' + o.layout.zhDesc + '，比例 ' + o.s.ratio + '，' + o.dir.zhDesc + '\n  ' + o.layout.en + ', aspect ratio ' + o.s.ratio + ', ' + o.dir.en + '\n';
    if (o.chars.length) out += '\n【角色 Characters — keep consistent in every panel】\n' + o.chars.map(function (c) { return '- ' + charDescZh(c) + '\n  ' + charDescEn(c); }).join('\n') + '\n';
    out += '\n【分鏡 Panels】\n' + o.panels.map(function (p, i) {
      var en = '  Panel ' + (i + 1) + ': ' + panelEn(p, o, true);
      return panelLineZh(p, i, o) + '\n' + en;
    }).join('\n') + '\n\n';
    out += '【文字 Text】' + textRule(o) + '\n  ' + (o.s.lang === 'none' ? 'No text, no speech bubbles, no watermark.' : 'Dialogue in ' + o.lang.en + ', legible and correctly spelled; no other text or watermark.');
    return out;
  }

  var PLATFORMS = [
    { id: 'gemini', label: 'Gemini', tip: '適用 Gemini（Nano Banana／Imagen）。自然語言段落，繁中對白可直接寫進畫面；逐格模式可把第 1 格成品上傳當角色參考。', build: buildGemini },
    { id: 'chatgpt', label: 'ChatGPT', tip: '適用 ChatGPT 生圖（GPT-Image）。結構化條列，在同一個對話裡追加「把第 3 格改成…」即可局部修正。', build: buildChatGPT },
    { id: 'mj', label: 'Midjourney', tip: 'Midjourney 用英文標籤＋參數（--ar／--niji）。中文動作描述可在分鏡表的「英文動作」欄改寫成英文，效果更好；對白另列，生成後再自行加上。', build: buildMJ },
    { id: 'generic', label: '通用／其他', tip: '中英對照完整版，可貼到 Copilot、Grok、Leonardo、豆包或任何支援生圖的 AI，也可以先貼給文字 LLM 請它再潤飾。', build: buildGeneric }
  ];

  function buildPrompt(platform) {
    if (!state.panels.length) return '（請先在左側輸入故事文字，再按「規則式分鏡」或「AI 分鏡」）';
    return byId(PLATFORMS, platform || state.platform).build(opt());
  }

  /* ================= 繪製 ================= */
  function fillSelect(sel, list, val, labelFn) {
    sel.innerHTML = list.map(function (x) {
      var id = typeof x === 'object' ? x.id : x, lb = labelFn ? labelFn(x) : (typeof x === 'object' ? x.zh : x);
      return '<option value="' + esc(id) + '"' + (String(id) === String(val) ? ' selected' : '') + '>' + esc(lb) + '</option>';
    }).join('');
  }

  function renderSettings() {
    var s = state.settings;
    fillSelect($('optStyle'), D.STYLES, s.style);
    fillSelect($('optPanels'), D.PANEL_COUNTS, s.panels, function (x) { return x + ' 格'; });
    fillSelect($('optLayout'), D.LAYOUTS, s.layout);
    fillSelect($('optRatio'), D.RATIOS, s.ratio);
    fillSelect($('optColor'), D.COLORS, s.color);
    fillSelect($('optLang'), D.LANGS, s.lang);
    fillSelect($('optBubble'), D.BUBBLES, s.bubble);
    fillSelect($('optMood'), D.MOODS, s.mood);
    fillSelect($('optDir'), D.DIRECTIONS, s.dir);
    $('optSfx').checked = !!s.sfx;
    $('topicPanels').textContent = s.panels;
    document.querySelectorAll('input[name="genMode"]').forEach(function (r) { r.checked = r.value === s.genMode; });
  }

  function presetOptions(selected) {
    var mine = myChars();
    var h = '<option value="">— 套用人物預設 —</option>' + D.PRESET_GROUPS.map(function (g) {
      return '<optgroup label="' + g + '">' + D.CHARACTER_PRESETS.filter(function (p) { return p.group === g; })
        .map(function (p) { return '<option value="p:' + p.id + '">' + esc(p.name + '｜' + p.age) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
    if (mine.length) h += '<optgroup label="我的人物">' + mine.map(function (c, i) { return '<option value="m:' + i + '">' + esc(c.name + (c.age ? '｜' + c.age : '')) + '</option>'; }).join('') + '</optgroup>';
    return h;
  }

  var CHAR_FIELDS = [
    ['name', '名稱', '例：小晴'], ['age', '年齡／性別', '例：26 歲女性'], ['look', '外型（髮型、髮色、臉部特徵）', '例：黑色及肩短髮、齊瀏海、大眼睛'],
    ['outfit', '服裝與配件', '例：米白針織衫、牛仔褲'], ['personality', '個性', '例：認真但容易緊張'], ['catchphrase', '口頭禪／招牌表情', '例：「真的假的！」'],
    ['colors', '代表配色', '例：米白、淺藍'], ['en', '英文外型描述（選填，Midjourney 用）', 'e.g. short black bob, cream sweater']
  ];

  function renderChars() {
    var list = $('charList');
    list.innerHTML = state.chars.map(function (c, i) {
      return '<div class="char-card" data-ci="' + i + '"><div class="char-head"><span class="char-no">' + (i + 1) + '</span>' +
        '<select class="char-preset" data-ci="' + i + '" aria-label="套用人物預設">' + presetOptions() + '</select>' +
        '<button type="button" class="mini" data-act="saveChar" data-ci="' + i + '" title="存成我的人物">💾 存為我的人物</button>' +
        '<button type="button" class="mini danger" data-act="delChar" data-ci="' + i + '" aria-label="移除人物">✕</button></div>' +
        '<div class="char-grid">' + CHAR_FIELDS.map(function (f) {
          var wide = (f[0] === 'look' || f[0] === 'outfit' || f[0] === 'en') ? ' wide' : '';
          return '<label class="fld' + wide + '"><span>' + f[1] + '</span><input type="text" data-ci="' + i + '" data-ck="' + f[0] + '" value="' + esc(c[f[0]]) + '" placeholder="' + esc(f[2]) + '"></label>';
        }).join('') + '</div></div>';
    }).join('') || '<p class="empty">還沒有登場人物。按下方「＋ 新增人物」，或從預設人物挑一位。</p>';
    $('btnAddChar').disabled = state.chars.length >= MAX_CHARS;
    $('charCount').textContent = state.chars.length + ' / ' + MAX_CHARS;
    renderTopicChars();
  }

  function renderPanels() {
    var n = state.panels.length;
    $('panelList').innerHTML = state.panels.map(function (p, i) {
      function inp(k, label, ph, wide) {
        return '<label class="fld' + (wide === 'half' ? ' half' : wide ? ' wide' : '') + '"><span>' + label + '</span><input type="text" data-pi="' + i + '" data-pk="' + k + '" value="' + esc(p[k]) + '" placeholder="' + esc(ph || '') + '"></label>';
      }
      function sel(k, label, list) {
        return '<label class="fld"><span>' + label + '</span><select data-pi="' + i + '" data-pk="' + k + '">' + list.map(function (x) {
          return '<option value="' + x.id + '"' + (x.id === p[k] ? ' selected' : '') + '>' + x.zh + '</option>'; }).join('') + '</select></label>';
      }
      return '<div class="panel-card"><div class="panel-no">' + (i + 1) + '<small>/' + n + '</small></div><div class="panel-body">' +
        '<label class="fld wide"><span>畫面動作</span><textarea rows="1" data-pi="' + i + '" data-pk="action">' + esc(p.action) + '</textarea></label>' +
        inp('scene', '場景', '例：辦公室') + inp('chars', '登場角色（用、分隔）', '例：小晴、林姐') +
        sel('expr', '表情', D.EXPRESSIONS) + sel('shot', '鏡頭', D.SHOTS) +
        inp('speaker', '說話者', '') + inp('sfx', '音效字', '例：碰！') +
        inp('dialogue', '對白', '沒有就留空', 'half') +
        '<details class="wide en-more"><summary>英文欄位（Midjourney／通用版用，選填）</summary><div class="char-grid">' +
        inp('actionEn', '英文動作', 'e.g. she rushes into the office holding coffee', true) + inp('sceneEn', '英文場景', 'e.g. office, morning', true) + '</div></details>' +
        '</div></div>';
    }).join('') || '<p class="empty">分鏡會出現在這裡。</p>';
  }

  function renderTabs() {
    $('platformTabs').innerHTML = PLATFORMS.map(function (p) {
      return '<button type="button" role="tab" class="tab' + (p.id === state.platform ? ' on' : '') + '" aria-selected="' + (p.id === state.platform) + '" data-platform="' + p.id + '">' + p.label + '</button>';
    }).join('');
    $('platformTip').textContent = byId(PLATFORMS, state.platform).tip;
  }

  function renderOutput() {
    var txt = buildPrompt();
    $('promptOut').textContent = txt;
    $('promptLen').textContent = txt.length + ' 字';
  }

  function renderAll() { renderSettings(); renderChars(); renderPanels(); renderTabs(); renderOutput(); $('srcText').value = state.text; updateTextCount(); renderTopic(); }
  function updateTextCount() { $('textCount').textContent = state.text.length + ' 字'; }

  /* ================= 儲存 ================= */
  var draftTimer = null;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () { lsSet(LS.draft, snapshot()); }, 300);
  }
  function snapshot() { return { app: 'comic-prompt-studio', version: 1, text: state.text, settings: state.settings, chars: state.chars, panels: state.panels, platform: state.platform, topic: state.topic }; }
  function applySnapshot(d) {
    if (!d || typeof d !== 'object') throw new Error('格式不正確');
    state.text = String(d.text || '');
    state.settings = Object.assign(defaultSettings(), d.settings || {});
    state.chars = Array.isArray(d.chars) ? d.chars.slice(0, MAX_CHARS).map(function (c) { return Object.assign(blankChar(), c); }) : [];
    state.panels = Array.isArray(d.panels) ? d.panels.map(function (p) { return Object.assign(blankPanel(0, 1), p); }) : [];
    if (d.platform) state.platform = d.platform;
    state.topic = Object.assign(defaultTopic(), d.topic || {});
    renderAll(); saveDraft();
  }
  function pushHistory() {
    if (!state.panels.length) return;
    var h = lsGet(LS.history, []);
    var title = (state.text.trim().split(/\n/)[0] || '（未命名）').slice(0, 24);
    var snap = snapshot(), key = JSON.stringify(snap);
    if (h.length && JSON.stringify(h[0].data) === key) return;
    h.unshift({ time: new Date().toISOString(), title: title, data: snap });
    lsSet(LS.history, h.slice(0, 20));
  }
  function download(name, content, type) {
    var blob = new Blob([content], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function stamp() { var d = new Date(), p = function (x) { return String(x).padStart(2, '0'); }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); }

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* ================= 範例 ================= */
  function loadExample(id) {
    var ex = byId(D.EXAMPLES, id);
    state.text = ex.text;
    state.settings.mood = ex.mood;
    state.chars = ex.chars.map(function (cid) { return presetToChar(byId(D.CHARACTER_PRESETS, cid)); });
    renderSettings(); renderChars(); $('srcText').value = state.text; updateTextCount();
    storyboard(true);
    toast('已載入範例「' + ex.title + '」');
  }

  /* ================= 主題生腳本 ================= */
  var REQUEST_RE = /請|幫我|麻煩|可以|能不能|用漫畫|畫成漫畫|做成漫畫|漫畫|解釋一下|解釋|說明一下|說明|介紹一下|介紹|教我|告訴我|講解|(甚|什)麼是|是(甚|什)麼|的意思|怎麼用|如何使用|[？?！!。，,\s]/g;
  // 「請解釋甚麼是 swot 分析？」→「swot 分析」
  function cleanTopic(text) {
    var core = text.replace(REQUEST_RE, ' ').replace(/\s+/g, ' ').trim();
    return core || text.trim();
  }
  // 輸入故事框裡只有一句「請解釋…」這類請求時，視為主題而不是故事
  function looksLikeTopicRequest(text) {
    var t = text.trim();
    return t.length > 0 && t.length <= 40 && t.indexOf('\n') < 0 && !/[「“"]/.test(t) &&
      (/解釋|說明|介紹|教我|講解|(甚|什)麼是|是(甚|什)麼|的意思|怎麼用/.test(t) || !!findTopic(t));
  }
  function findTopic(text) {
    var k = text.toLowerCase().replace(/\s+/g, '');
    for (var i = 0; i < D.TOPICS.length; i++) {
      var t = D.TOPICS[i];
      if (t.keys.some(function (key) { return k.indexOf(key) >= 0; })) return t;
    }
    return null;
  }
  // 講解者／提問者不足兩位時，自動補原創人物 Pico（講解）與小米（提問）
  function ensureTopicChars() {
    var added = [];
    ['pico', 'mi'].forEach(function (id) {
      if (activeChars().length >= 2 || state.chars.length >= MAX_CHARS) return;
      var p = byId(D.CHARACTER_PRESETS, id);
      if (activeChars().some(function (c) { return c.name === p.name; })) return;
      state.chars.push(presetToChar(p)); added.push(p.name);
    });
    if (added.length) { renderChars(); toast('已自動加入登場人物：' + added.join('、')); }
  }
  function topicRoles() {
    ensureTopicChars();
    var names = activeChars().map(function (c) { return c.name; });
    var a = names.indexOf(state.topic.a) >= 0 ? state.topic.a : names[0] || '老師';
    var b = names.indexOf(state.topic.b) >= 0 && state.topic.b !== a ? state.topic.b : (names.filter(function (n) { return n !== a; })[0] || a);
    return { a: a, b: b };
  }

  function ruleScript() {
    var raw = state.topic.text.trim(), n = state.settings.panels;
    var tp = findTopic(raw), custom = !!state.topic.ctx.trim();
    var t = tp || D.GENERIC_TOPIC, T = tp ? tp.title : cleanTopic(raw);
    var ctx = state.topic.ctx.trim() || t.ctx;
    function fill(s) { return s.replace(/\{ctx\}/g, ctx).replace(/\{T\}/g, T); }
    var pts = t.points.map(function (p) { return { label: p[0], ex: fill(custom || !tp ? p[2] : p[1]) }; });
    var r = topicRoles(), A = r.a, B = r.b, type = state.topic.type;
    var goal = fill(t.goal), one = fill(t.one), end = fill(t.end);
    // 內建框架說「用 SWOT 分析」；不認得的主題（例如區塊鏈）改說「先搞懂區塊鏈」
    var useT = tp ? '用' + T : '先搞懂' + T, tryT = tp ? '試試' + T : '先搞懂' + T;
    function ptsText(g) {
      return g.length <= 2 ? g.map(function (p) { return p.label + '：' + p.ex; }).join('；') : g.map(function (p) { return p.label; }).join('、') + '，一項一項來';
    }
    var L = {
      knowledge: { hook: '在教室裡，' + B + '抱著頭煩惱：「' + goal + '？」', intro: A + '拿出白板說：「' + useT + '！' + one + '。」',
        mid: function (g) { return A + '指著白板說：「' + ptsText(g) + '。」'; }, end: B + '恍然大悟地說：「原來' + end + '！」',
        ask: '在教室裡，' + B + '問' + A + '：「' + goal + '？」' },
      story: { hook: B + '在' + ctx + '前面嘆氣：「' + goal + '……」', intro: A + '走過來說：「' + tryT + '吧，' + one + '。」',
        mid: function (g) { return B + '照著做，在筆記本寫下：「' + ptsText(g) + '。」'; }, end: '最後，' + B + '開心地對' + A + '說：「' + end + '，真的有用！」',
        ask: B + '向' + A + '求救：「' + goal + '？」' },
      qa: { hook: '在教室裡，' + B + '舉手問：「' + T + '是什麼？」', intro: A + '回答：「' + one + '。」',
        mid: function (g) { return A + '回答' + B + '的追問：「' + ptsText(g) + '。」'; }, end: B + '點點頭說：「懂了，' + end + '！」',
        ask: '在教室裡，' + B + '舉手問：「' + T + '是什麼？」' },
      contrast: { hook: '在辦公室裡，' + B + '什麼都沒想就直接開做，結果一團亂：「怎麼會這樣！」', intro: A + '搖搖頭說：「' + (tp ? '先用' + T + '想一遍' : '先搞懂' + T) + '：' + one + '。」',
        mid: function (g) { return B + '重新來過，先想清楚：「' + ptsText(g) + '。」'; }, end: '這次' + B + '順利成功，比出勝利手勢：「早知道就' + (tp ? '先用' + T : '先搞懂' + T) + '！」',
        ask: '在辦公室裡，' + B + '搞砸了來問' + A + '：「我哪裡做錯了？」' }
    }[type] || null;
    var lines = [];
    if (n <= 2) {
      lines.push(L.ask);
      lines.push(A + '笑著說：「' + useT + '：' + pts.map(function (p) { return p.label; }).join('、') + '！」' + B + '恍然大悟。');
      return lines.join('\n');
    }
    var mids;
    if (n === 3) { lines.push(L.ask); mids = 1; }
    else { lines.push(L.hook); lines.push(L.intro); mids = n - 3; }
    // 通用主題的標籤本身沒內容，格數不夠時只挑前兩個重點並寫出說明
    if (!tp) pts = pts.slice(0, Math.max(2, mids * 2));
    var groups = [], used = Math.min(mids, pts.length);
    for (var i = 0; i < used; i++) groups.push(pts.slice(Math.floor(i * pts.length / used), Math.floor((i + 1) * pts.length / used)));
    groups.forEach(function (g) { lines.push(n === 3 ? A + '說：「' + useT + '！' + ptsText(g) + '。」' : L.mid(g)); });
    for (var k = used; k < mids; k++) lines.push(k === used ? B + '拿起筆，把學到的套到' + ctx + '上試試看。' : A + '在一旁比讚，' + B + '越做越順手。');
    lines.push(L.end);
    return lines.join('\n');
  }

  function aiScriptPrompt() {
    var n = state.settings.panels, r = topicRoles();
    var ca = activeChars().filter(function (c) { return c.name === r.a; })[0] || {}, cb = activeChars().filter(function (c) { return c.name === r.b; })[0] || {};
    var type = byId(D.SCRIPT_TYPES, state.topic.type).zh;
    return '你是擅長把知識畫成漫畫的編劇。請用剛好 ' + n + ' 格的短篇漫畫，向一般大眾解釋「' + cleanTopic(state.topic.text) + '」。\n' + '（使用者原始需求：' + state.topic.text.trim() + '）\n' +
      '腳本類型：' + type + '\n講解者：' + r.a + (ca.personality ? '（' + ca.personality + '）' : '') + '\n提問者／主角：' + r.b + (cb.personality ? '（' + cb.personality + '）' : '') + '\n' +
      (state.topic.ctx.trim() ? '舉例情境：' + state.topic.ctx.trim() + '\n' : '') +
      '規則：\n- 剛好 ' + n + ' 行，每行是一格\n- 每行格式：角色名稱＋動作描述：「對白」（每行都要寫出角色名稱，不要用他／她代替）\n- 對白用繁體中文口語，每句 25 字以內\n- 內容要正確，重點講清楚，不要杜撰數據\n- 第一格提出問題或情境，最後一格要有總結或小笑點\n- 只輸出 ' + n + ' 行腳本，不要編號、標題或任何說明';
  }

  function applyScript(script, how) {
    var mood = byId(D.SCRIPT_TYPES, state.topic.type).mood;
    state.settings.mood = mood;
    state.text = script; $('srcText').value = script; updateTextCount();
    renderSettings(); setSrcTab('text'); storyboard(true);
    toast(how + '腳本已產生，可在文字框修改後按「規則式分鏡」重新拆格');
  }

  function ruleTopic() {
    if (!state.topic.text.trim()) { toast('請先輸入主題，例如：SWOT 分析'); $('topicText').focus(); return; }
    var hit = findTopic(state.topic.text);
    applyScript(ruleScript(), '規則式');
    $('topicStatus').textContent = hit ? '✓ 使用內建主題「' + hit.title + '」的重點' : '⚠ 這個主題不在內建清單，已用通用講解結構；想要更具體的內容請用「🤖 AI 生腳本」。';
  }

  async function aiTopic() {
    if (!state.topic.text.trim()) { toast('請先輸入主題，例如：SWOT 分析'); $('topicText').focus(); return; }
    if (!aiReady()) { toast('請先在 ⚙ 常用設定填入 AI 金鑰（自訂端點需填網址與模型）'); openSettings(); return; }
    var btn = $('btnTopicAi'); btn.disabled = true; $('topicStatus').textContent = 'AI 撰寫腳本中…';
    try {
      var model = aiModel();
      var txt = await callLLM(prefs.aiProvider, model, prefs.aiKey, aiScriptPrompt());
      var lines = txt.replace(/```[a-z]*/g, '').split(/\n+/).map(function (s) { return s.replace(/^\s*(第?\s*\d+\s*格?\s*[.、:：)）]\s*|[-*•]\s*)/, '').trim(); }).filter(Boolean);
      if (!lines.length) throw new Error('AI 沒有回傳腳本');
      applyScript(lines.slice(0, state.settings.panels).join('\n'), 'AI ');
      $('topicStatus').textContent = '✓ AI 腳本完成（' + model + '）';
    } catch (err) {
      applyScript(ruleScript(), '規則式');
      $('topicStatus').textContent = '⚠ AI 失敗，已改用規則式腳本：' + err.message;
    } finally { btn.disabled = false; }
  }

  function setSrcTab(tab) {
    state.topic.tab = tab;
    document.querySelectorAll('#srcTabs [data-src]').forEach(function (b) { var on = b.dataset.src === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('paneText').hidden = tab !== 'text'; $('paneTopic').hidden = tab !== 'topic';
    saveDraft();
  }
  function renderTopicChars() {
    var names = activeChars().map(function (c) { return c.name; });
    var opts = '<option value="">（自動）</option>' + names.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('');
    $('topicA').innerHTML = opts; $('topicB').innerHTML = opts;
    $('topicA').value = names.indexOf(state.topic.a) >= 0 ? state.topic.a : '';
    $('topicB').value = names.indexOf(state.topic.b) >= 0 ? state.topic.b : '';
  }
  function renderTopic() {
    fillSelect($('topicType'), D.SCRIPT_TYPES, state.topic.type);
    $('topicText').value = state.topic.text; $('topicCtx').value = state.topic.ctx;
    var tp = findTopic(state.topic.text);
    $('topicCtx').placeholder = '留空用預設' + (tp ? '：' + tp.ctx : '，例：咖啡店');
    $('topicPanels').textContent = state.settings.panels;
    renderTopicChars(); setSrcTab(state.topic.tab);
  }

  /* ================= BYOK AI 分鏡 ================= */
  var PROVIDERS = {
    gemini: { label: 'Gemini（Google AI Studio）', models: [['gemini-3.5-flash', 'Gemini 3.5 Flash（均衡，推薦）'], ['gemini-3.5-pro', 'Gemini 3.5 Pro（最強）'], ['gemini-2.5-flash', 'Gemini 2.5 Flash（快速省錢）']] },
    openai: { label: 'OpenAI', models: [['gpt-5-mini', 'GPT-5 mini（均衡，推薦）'], ['gpt-5', 'GPT-5（最強）'], ['gpt-4o-mini', 'GPT-4o mini（快速省錢）']] },
    claude: { label: 'Claude（Anthropic）', models: [['claude-sonnet-5-5', 'Claude Sonnet 5.5（均衡，推薦）'], ['claude-opus-5-5', 'Claude Opus 5.5（最強）'], ['claude-haiku-5-5', 'Claude Haiku 5.5（快速省錢）']] },
    openrouter: { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', models: [['openai/gpt-4o-mini', 'OpenAI GPT-4o mini（推薦）'], ['google/gemini-2.5-flash', 'Google Gemini 2.5 Flash'], ['anthropic/claude-sonnet-4.5', 'Anthropic Claude Sonnet 4.5']] },
    deepseek: { label: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', models: [['deepseek-chat', 'DeepSeek Chat（推薦）'], ['deepseek-reasoner', 'DeepSeek Reasoner（推理）']] },
    xai: { label: 'xAI Grok', url: 'https://api.x.ai/v1/chat/completions', models: [['grok-4', 'Grok 4'], ['grok-3-mini', 'Grok 3 mini（快速省錢）']] },
    custom: { label: '自訂（OpenAI 相容端點，例如 Ollama、LM Studio）', models: [] }
  };
  PROVIDERS.openai.url = 'https://api.openai.com/v1/chat/completions';
  function aiModel() { return (prefs.aiModelCustom || '').trim() || prefs.aiModel || ((PROVIDERS[prefs.aiProvider] || PROVIDERS.gemini).models[0] || [''])[0]; }
  // 自訂端點可只填到 /v1，自動補上 /chat/completions；本機服務（Ollama 等）可以不填金鑰
  function customUrl(base) { base = (base || '').trim().replace(/\/+$/, ''); return /\/chat\/completions$/.test(base) ? base : base + '/chat/completions'; }
  function aiReady() {
    if (prefs.aiProvider === 'custom') return !!(prefs.aiBase || '').trim() && !!aiModel();
    return !!prefs.aiKey;
  }

  async function callLLM(provider, model, apiKey, prompt) {
    var url, headers, body, extract;
    if (provider === 'claude') {
      url = 'https://api.anthropic.com/v1/messages';
      headers = { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
      body = { model: model, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] };
      extract = function (d) { return (d.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join(''); };
    } else if (provider !== 'gemini') {
      // OpenAI 相容格式：OpenAI、OpenRouter、DeepSeek、xAI、自訂端點
      url = provider === 'custom' ? customUrl(prefs.aiBase) : PROVIDERS[provider].url;
      headers = { 'content-type': 'application/json' };
      if (apiKey) headers.authorization = 'Bearer ' + apiKey;
      body = { model: model, messages: [{ role: 'user', content: prompt }] };
      extract = function (d) { return d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content; };
    } else {
      url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
      headers = { 'content-type': 'application/json', 'x-goog-api-key': apiKey };
      body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } };
      extract = function (d) { var parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []; return parts.map(function (p) { return p.text || ''; }).join(''); };
    }
    for (var attempt = 1; attempt <= 3; attempt++) {
      var resp = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
      var raw = await resp.text();
      if (resp.ok) { var t = extract(JSON.parse(raw)); if (!t) throw new Error('回應中沒有文字內容'); return t; }
      var msg = raw.slice(0, 200);
      try { var e = JSON.parse(raw); msg = (e.error && e.error.message) || e.message || msg; } catch (x) {}
      if ({ 429: 1, 500: 1, 503: 1, 529: 1 }[resp.status] && attempt < 3) { $('aiStatus').textContent = '服務忙碌（' + resp.status + '），' + attempt * 6 + ' 秒後重試…'; await new Promise(function (r) { setTimeout(r, attempt * 6000); }); continue; }
      throw new Error('HTTP ' + resp.status + '：' + msg);
    }
  }

  function aiPrompt() {
    var n = state.settings.panels, chars = activeChars();
    return '你是專業漫畫分鏡師。請把下面的故事改編成剛好 ' + n + ' 格的短篇漫畫分鏡，情緒基調：' + byId(D.MOODS, state.settings.mood).zhDesc + '，要有起承轉合與最後一格的笑點或收尾。\n' +
      '登場角色：' + (chars.length ? chars.map(function (c) { return c.name + (c.personality ? '（' + c.personality + '）' : ''); }).join('、') : '依故事自行判斷') + '\n' +
      '只輸出 JSON 陣列（不要 Markdown、不要說明），長度剛好 ' + n + '，每個元素格式：\n' +
      '{"scene":"中文場景（含時間地點）","scene_en":"English scene","action":"中文畫面動作描述，一到兩句，具體可畫","action_en":"English visual action description",' +
      '"characters":["出場角色名稱"],"expression":"' + D.EXPRESSIONS.map(function (x) { return x.id; }).join('|') + '","speaker":"說話者名稱或空字串",' +
      '"dialogue":"繁體中文對白，20 字以內，沒有就空字串","shot":"' + D.SHOTS.map(function (x) { return x.id; }).join('|') + '","sfx":"音效字或空字串"}\n\n故事：\n"""\n' + state.text.trim() + '\n"""';
  }

  function parseAiPanels(txt) {
    var s = txt.indexOf('['), e = txt.lastIndexOf(']');
    if (s < 0 || e < s) throw new Error('AI 回傳的不是 JSON 陣列');
    var arr = JSON.parse(txt.slice(s, e + 1));
    if (!Array.isArray(arr) || !arr.length) throw new Error('AI 回傳空的分鏡');
    var exprIds = D.EXPRESSIONS.map(function (x) { return x.id; }), shotIds = D.SHOTS.map(function (x) { return x.id; });
    return arr.slice(0, state.settings.panels).map(function (p, i) {
      return { scene: p.scene || '', sceneEn: p.scene_en || '', action: p.action || '', actionEn: p.action_en || '',
        chars: (Array.isArray(p.characters) ? p.characters : []).join('、'), expr: exprIds.indexOf(p.expression) >= 0 ? p.expression : 'calm',
        speaker: p.speaker || '', dialogue: p.dialogue || '', shot: shotIds.indexOf(p.shot) >= 0 ? p.shot : autoShot(i, arr.length, 'calm'), sfx: state.settings.sfx ? (p.sfx || '') : '' };
    });
  }

  async function aiStoryboard() {
    if (!state.text.trim()) { toast('請先輸入故事文字'); return; }
    if (!aiReady()) { toast('請先在 ⚙ 常用設定填入 AI 金鑰（自訂端點需填網址與模型）'); openSettings(); return; }
    var btn = $('btnAiStoryboard'); btn.disabled = true; $('aiStatus').textContent = 'AI 分鏡中…';
    try {
      var model = aiModel();
      var txt = await callLLM(prefs.aiProvider, model, prefs.aiKey, aiPrompt());
      var panels = parseAiPanels(txt);
      var n = state.settings.panels;
      while (panels.length < n) panels.push(blankPanel(panels.length, n));
      state.panels = panels;
      renderPanels(); renderOutput(); saveDraft();
      $('aiStatus').textContent = '✓ AI 分鏡完成（' + model + '）';
    } catch (err) {
      state.panels = ruleStoryboard(); renderPanels(); renderOutput(); saveDraft();
      $('aiStatus').textContent = '⚠ AI 失敗，已改用規則式分鏡：' + err.message;
    } finally { btn.disabled = false; }
  }

  /* ================= 設定面板 ================= */
  function applyTheme() {
    var r = document.documentElement;
    if (prefs.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', prefs.theme);
  }
  function renderProviderModels() {
    var pv = PROVIDERS[$('setAiProvider').value] || PROVIDERS.gemini;
    var cur = prefs.aiProvider === $('setAiProvider').value ? prefs.aiModel : '';
    $('setAiModel').innerHTML = pv.models.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === cur ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') || '<option value="">（請在下方填模型名稱）</option>';
    $('aiBaseWrap').hidden = $('setAiProvider').value !== 'custom';
  }
  function openSettings() {
    fillSelect($('setPlatform'), PLATFORMS, prefs.platform, function (p) { return p.label; });
    fillSelect($('setStyle'), D.STYLES, prefs.style);
    fillSelect($('setPanels'), D.PANEL_COUNTS, prefs.panels, function (x) { return x + ' 格'; });
    fillSelect($('setRatio'), D.RATIOS, prefs.ratio);
    fillSelect($('setLayout'), D.LAYOUTS, prefs.layout);
    fillSelect($('setColor'), D.COLORS, prefs.color);
    fillSelect($('setLang'), D.LANGS, prefs.lang);
    $('setTheme').value = prefs.theme;
    $('setAiProvider').innerHTML = Object.keys(PROVIDERS).map(function (k) { return '<option value="' + k + '"' + (k === prefs.aiProvider ? ' selected' : '') + '>' + PROVIDERS[k].label + '</option>'; }).join('');
    renderProviderModels();
    $('setAiKey').value = prefs.aiKey || '';
    $('setAiModelCustom').value = prefs.aiModelCustom || ''; $('setAiBase').value = prefs.aiBase || ''; $('aiTestStatus').textContent = '';
    openModal('settings');
  }
  function saveSettings() {
    prefs.platform = $('setPlatform').value; prefs.style = $('setStyle').value; prefs.panels = +$('setPanels').value;
    prefs.ratio = $('setRatio').value; prefs.layout = $('setLayout').value; prefs.color = $('setColor').value; prefs.lang = $('setLang').value;
    prefs.theme = $('setTheme').value; prefs.aiProvider = $('setAiProvider').value; prefs.aiModel = $('setAiModel').value; prefs.aiKey = $('setAiKey').value.trim();
    prefs.aiModelCustom = $('setAiModelCustom').value.trim(); prefs.aiBase = $('setAiBase').value.trim();
    lsSet(LS.prefs, prefs); applyTheme();
  }

  /* ================= 彈窗 ================= */
  var lastFocus = null;
  function openModal(id) { lastFocus = document.activeElement; var m = $(id); m.classList.add('show'); var f = m.querySelector('button, select, input'); if (f) f.focus(); }
  function closeModal(id) { $(id).classList.remove('show'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function openAbout(focusCreator) {
    openModal('about');
    if (focusCreator) $('creatorBox').scrollIntoView({ block: 'center' });
  }
  function closeAbout() { lsSet(LS.warn, 1); closeModal('about'); }

  function renderHistory() {
    var h = lsGet(LS.history, []);
    $('historyList').innerHTML = h.length ? h.map(function (x, i) {
      var d = new Date(x.time);
      return '<li><button type="button" class="hist-item" data-hi="' + i + '"><b>' + esc(x.title) + '</b><small>' + d.toLocaleString('zh-TW') + '｜' + (x.data.panels || []).length + ' 格｜' + esc(byId(D.STYLES, x.data.settings && x.data.settings.style).zh) + '</small></button>' +
        '<button type="button" class="mini danger" data-hdel="' + i + '" aria-label="刪除這筆">✕</button></li>';
    }).join('') : '<li class="empty">還沒有紀錄。複製或下載提示詞時會自動存一筆。</li>';
  }

  /* ================= 事件 ================= */
  function bind() {
    $('exampleChips').innerHTML = D.EXAMPLES.map(function (e) { return '<button type="button" class="chip" data-ex="' + e.id + '">' + e.title + '</button>'; }).join('');
    $('exampleChips').addEventListener('click', function (e) { var b = e.target.closest('[data-ex]'); if (b) loadExample(b.dataset.ex); });

    $('srcText').addEventListener('input', function () { state.text = this.value; updateTextCount(); saveDraft(); });

    // 主題生腳本
    $('srcTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-src]'); if (b) setSrcTab(b.dataset.src); });
    $('topicChips').innerHTML = D.TOPICS.map(function (t) { return '<button type="button" class="chip" data-topic="' + t.id + '">' + t.title + '</button>'; }).join('');
    $('topicChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-topic]'); if (!b) return;
      state.topic.text = byId(D.TOPICS, b.dataset.topic).title; renderTopic(); saveDraft();
    });
    $('topicText').addEventListener('input', function () {
      state.topic.text = this.value; var tp = findTopic(this.value);
      $('topicCtx').placeholder = '留空用預設' + (tp ? '：' + tp.ctx : '，例：咖啡店'); saveDraft();
    });
    $('topicText').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ruleTopic(); } });
    $('topicCtx').addEventListener('input', function () { state.topic.ctx = this.value; saveDraft(); });
    $('topicType').addEventListener('change', function () { state.topic.type = this.value; saveDraft(); });
    $('topicA').addEventListener('change', function () { state.topic.a = this.value; saveDraft(); });
    $('topicB').addEventListener('change', function () { state.topic.b = this.value; saveDraft(); });
    $('btnTopicRule').addEventListener('click', ruleTopic);
    $('btnTopicAi').addEventListener('click', aiTopic);
    // 故事框裡只打了「請解釋什麼是 SWOT 分析」這類一句話時，自動改走主題生腳本
    function routeTopic(useAi) {
      if (!looksLikeTopicRequest(state.text)) return false;
      state.topic.text = state.text.trim(); renderTopic();
      if (useAi) aiTopic(); else ruleTopic();
      return true;
    }
    $('btnStoryboard').addEventListener('click', function () {
      if (!state.text.trim()) { toast('請先輸入故事文字'); return; }
      if (routeTopic(false)) return;
      storyboard(true); toast('已依文字拆成 ' + state.panels.length + ' 格');
    });
    $('btnAiStoryboard').addEventListener('click', function () { if (!routeTopic(true)) aiStoryboard(); });
    $('btnClear').addEventListener('click', function () { state.text = ''; $('srcText').value = ''; updateTextCount(); saveDraft(); $('srcText').focus(); });

    var map = { optStyle: 'style', optLayout: 'layout', optRatio: 'ratio', optColor: 'color', optLang: 'lang', optBubble: 'bubble', optMood: 'mood', optDir: 'dir' };
    Object.keys(map).forEach(function (id) { $(id).addEventListener('change', function () { state.settings[map[id]] = this.value; renderOutput(); saveDraft(); }); });
    $('optPanels').addEventListener('change', function () { state.settings.panels = +this.value; storyboard(true); });
    $('optSfx').addEventListener('change', function () { state.settings.sfx = this.checked; if (state.text.trim() && !state.edited) storyboard(true); else { renderOutput(); saveDraft(); } });
    document.querySelectorAll('input[name="genMode"]').forEach(function (r) { r.addEventListener('change', function () { state.settings.genMode = this.value; renderOutput(); saveDraft(); }); });

    // 人物
    $('btnAddChar').addEventListener('click', function () { if (state.chars.length >= MAX_CHARS) return; state.chars.push(blankChar()); renderChars(); renderOutput(); saveDraft(); });
    $('charList').addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset.ck) return;
      state.chars[+t.dataset.ci][t.dataset.ck] = t.value; renderOutput(); saveDraft();
      if (t.dataset.ck === 'name') renderTopicChars();
    });
    $('charList').addEventListener('change', function (e) {
      var t = e.target; if (!t.classList.contains('char-preset') || !t.value) return;
      var i = +t.dataset.ci, v = t.value, c;
      if (v.indexOf('p:') === 0) c = presetToChar(byId(D.CHARACTER_PRESETS, v.slice(2)));
      else c = Object.assign(blankChar(), myChars()[+v.slice(2)]);
      state.chars[i] = c; renderChars(); renderOutput(); saveDraft(); toast('已套用「' + c.name + '」');
    });
    $('charList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var i = +b.dataset.ci;
      if (b.dataset.act === 'delChar') { state.chars.splice(i, 1); renderChars(); renderOutput(); saveDraft(); }
      if (b.dataset.act === 'saveChar') {
        var c = state.chars[i]; if (!c.name.trim()) { toast('請先填人物名稱'); return; }
        var mine = myChars(), idx = mine.findIndex(function (x) { return x.name === c.name; });
        if (idx >= 0) mine[idx] = clone(c); else mine.push(clone(c));
        lsSet(LS.myChars, mine); renderChars(); toast('已存到「我的人物」：' + c.name);
      }
    });
    $('btnManageChars').addEventListener('click', function () { renderMyChars(); openModal('myCharsModal'); });
    $('myCharsList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mdel]'); if (!b) return;
      var mine = myChars(); mine.splice(+b.dataset.mdel, 1); lsSet(LS.myChars, mine); renderMyChars(); renderChars();
    });

    // 分鏡
    function onPanel(e) {
      var t = e.target; if (!t.dataset.pk) return;
      state.panels[+t.dataset.pi][t.dataset.pk] = t.value; state.edited = true; renderOutput(); saveDraft();
    }
    $('panelList').addEventListener('input', onPanel);
    $('panelList').addEventListener('change', onPanel);

    // 輸出
    $('platformTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-platform]'); if (!b) return; state.platform = b.dataset.platform; renderTabs(); renderOutput(); saveDraft(); });
    $('btnCopy').addEventListener('click', function () {
      var txt = $('promptOut').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('已複製 ' + byId(PLATFORMS, state.platform).label + ' 提示詞'); })
        .catch(function () { var r = document.createRange(); r.selectNodeContents($('promptOut')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('請按 Ctrl+C 複製已選取的文字'); });
      pushHistory();
    });
    $('btnDownload').addEventListener('click', function () { download('漫畫提示詞-' + state.platform + '-' + stamp() + '.txt', $('promptOut').textContent, 'text/plain;charset=utf-8'); pushHistory(); });
    $('btnDownloadAll').addEventListener('click', function () {
      var all = PLATFORMS.map(function (p) { return '########## ' + p.label + ' ##########\n' + buildPrompt(p.id); }).join('\n\n\n');
      download('漫畫提示詞-四平台-' + stamp() + '.txt', all, 'text/plain;charset=utf-8'); pushHistory();
    });
    $('btnSaveJson').addEventListener('click', function () { download('漫畫分鏡專案-' + stamp() + '.json', JSON.stringify(snapshot(), null, 2), 'application/json'); pushHistory(); toast('已下載專案檔'); });
    $('btnOpenJson').addEventListener('click', function () { $('fileJson').click(); });
    $('fileJson').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { try { applySnapshot(JSON.parse(rd.result)); toast('已開啟專案：' + f.name); } catch (err) { toast('無法開啟：' + err.message); } };
      rd.readAsText(f, 'utf-8'); this.value = '';
    });
    $('btnHistory').addEventListener('click', function () { renderHistory(); openModal('historyModal'); });
    $('historyList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-hi]'), d = e.target.closest('[data-hdel]'), h = lsGet(LS.history, []);
      if (d) { h.splice(+d.dataset.hdel, 1); lsSet(LS.history, h); renderHistory(); return; }
      if (b) { applySnapshot(h[+b.dataset.hi].data); closeModal('historyModal'); toast('已載入歷史紀錄'); }
    });

    // 設定
    $('settingsBtn').addEventListener('click', openSettings);
    $('setAiProvider').addEventListener('change', renderProviderModels);
    $('testAi').addEventListener('click', async function () {
      saveSettings();
      var st = $('aiTestStatus'), b = this;
      if (!aiReady()) { st.textContent = '⚠ 請先填金鑰（自訂端點需填網址與模型名稱）'; return; }
      b.disabled = true; st.textContent = '連線中…';
      try {
        var t = await callLLM(prefs.aiProvider, aiModel(), prefs.aiKey, '請只回覆兩個字：OK');
        st.textContent = '✓ 連線成功（' + aiModel() + '）：' + String(t).trim().slice(0, 30);
      } catch (err) {
        st.textContent = '✕ 連線失敗：' + err.message + (/Failed to fetch|NetworkError/i.test(err.message) ? '（可能是網址錯誤，或該服務不允許瀏覽器直接呼叫 CORS）' : '');
      } finally { b.disabled = false; }
    });
    $('settingsSave').addEventListener('click', function () { saveSettings(); closeModal('settings'); toast('已儲存常用設定（新專案會套用）'); });
    $('settingsApply').addEventListener('click', function () {
      saveSettings();
      Object.assign(state.settings, { style: prefs.style, panels: +prefs.panels, ratio: prefs.ratio, layout: prefs.layout, color: prefs.color, lang: prefs.lang });
      state.platform = prefs.platform; renderSettings(); renderTabs(); storyboard(true); closeModal('settings'); toast('已儲存並套用到目前專案');
    });
    $('settingsReset').addEventListener('click', function () { prefs = Object.assign({}, PREF_DEFAULTS, { aiKey: prefs.aiKey, aiProvider: prefs.aiProvider, aiModel: prefs.aiModel, aiModelCustom: prefs.aiModelCustom, aiBase: prefs.aiBase }); lsSet(LS.prefs, prefs); applyTheme(); openSettings(); toast('已恢復預設（AI 連線設定保留）'); });
    $('clearKey').addEventListener('click', function () { $('setAiKey').value = ''; prefs.aiKey = ''; lsSet(LS.prefs, prefs); toast('已清除金鑰'); });

    // 關於／彈窗
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-open-about]');
      if (a) { if (a.closest('#settings')) closeModal('settings'); openAbout(a.dataset.openAbout === 'creator'); }
      var ins = e.target.closest('[data-install]'); if (ins) $('installBtn').click();
      var x = e.target.closest('[data-close]'); if (x) closeModal(x.dataset.close);
      if (e.target.classList.contains('modal')) { if (e.target.id === 'about') closeAbout(); else closeModal(e.target.id); }
    });
    $('aboutBtn').addEventListener('click', function () { openAbout(false); });
    $('aboutClose').addEventListener('click', closeAbout);
    $('aboutOk').addEventListener('click', closeAbout);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.querySelector('.modal.show'); if (!open) return;
      if (open.id === 'about') closeAbout(); else closeModal(open.id);
    });
  }

  function renderMyChars() {
    var mine = myChars();
    $('myCharsList').innerHTML = mine.length ? mine.map(function (c, i) {
      return '<li><span><b>' + esc(c.name) + '</b>' + (c.age ? '｜' + esc(c.age) : '') + '<small>' + esc(c.look || '') + '</small></span><button type="button" class="mini danger" data-mdel="' + i + '">刪除</button></li>';
    }).join('') : '<li class="empty">還沒有存過人物。在人物卡按「💾 存為我的人物」就會出現在這裡。</li>';
  }

  /* ================= 啟動 ================= */
  function init() {
    applyTheme();
    bind();
    var draft = lsGet(LS.draft, null);
    if (draft && (draft.text || (draft.panels && draft.panels.length))) {
      try { applySnapshot(draft); } catch (e) { loadExample('office'); }
    } else {
      renderAll(); loadExample('office');
    }
    if (!lsGet(LS.warn, 0)) setTimeout(function () { openAbout(false); }, 400);
  }

  window.__comicPrompt = {
    state: state, prefs: function () { return prefs; }, loadExample: loadExample, storyboard: storyboard, buildPrompt: buildPrompt,
    setPlatform: function (p) { state.platform = p; renderTabs(); renderOutput(); },
    set: function (k, v) { state.settings[k] = v; renderSettings(); if (k === 'panels') storyboard(true); else renderOutput(); },
    openSettings: openSettings, parseAiPanels: parseAiPanels, aiPrompt: aiPrompt,
    setTopic: function (o) { Object.assign(state.topic, o); renderTopic(); }, ruleScript: ruleScript, ruleTopic: ruleTopic, aiScriptPrompt: aiScriptPrompt
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
