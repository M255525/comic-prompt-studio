/* 漫畫分鏡提示詞工坊 — 靜態資料（風格、選項、人物預設、範例） */
window.CPS = (function () {
  'use strict';

  // 漫畫風格：zh 顯示名、en 英文描述（給 Midjourney／通用版）、zhDesc 中文描述（給 Gemini／ChatGPT）、niji 是否適用 --niji
  var STYLES = [
    { id: 'shonen',   zh: '日式少年漫畫', zhDesc: '日式少年漫畫風格，俐落墨線、速度線、強烈明暗對比、誇張動作張力', en: 'Japanese shonen manga style, bold ink lines, speed lines, dramatic contrast, dynamic action', niji: true },
    { id: 'shojo',    zh: '日式少女漫畫', zhDesc: '日式少女漫畫風格，纖細線條、大眼睛、花朵與光點背景、柔和網點', en: 'Japanese shojo manga style, delicate lines, sparkling big eyes, floral and bokeh backgrounds, soft screentones', niji: true },
    { id: 'american', zh: '美式英雄漫畫', zhDesc: '美式超級英雄漫畫風格，粗黑輪廓、肌理陰影、飽和色塊、強烈透視', en: 'American superhero comic book style, heavy black outlines, cross-hatching, saturated flat colors, strong perspective', niji: false },
    { id: 'bd',       zh: '歐風漫畫（BD）', zhDesc: '歐洲漫畫（Bande Dessinée）清線風格，乾淨均勻線條、平塗色彩、細緻場景', en: 'European bande dessinee ligne claire style, clean uniform lines, flat colors, detailed backgrounds', niji: false },
    { id: 'chibi',    zh: 'Q 版可愛',     zhDesc: 'Q 版可愛風格，二到三頭身、圓潤造型、誇張表情符號、粉嫩配色', en: 'cute chibi style, 2-3 head-tall characters, rounded shapes, exaggerated emoji-like expressions, pastel palette', niji: true },
    { id: 'yonkoma',  zh: '四格報紙漫畫', zhDesc: '報紙四格漫畫風格，簡潔線條、留白多、角色表情鮮明、節奏起承轉合', en: 'newspaper comic strip style, simple clean linework, generous white space, clear expressions, setup-punchline rhythm', niji: false },
    { id: 'watercolor', zh: '水彩繪本',   zhDesc: '水彩繪本風格，柔和暈染、紙張紋理、溫暖色調、手繪感', en: 'watercolor picture book illustration, soft washes, paper texture, warm tones, hand-painted feel', niji: false },
    { id: 'minimal',  zh: '線條極簡',     zhDesc: '極簡線條插畫風格，單一線寬、大量留白、少量點綴色', en: 'minimalist line art comic, single line weight, lots of negative space, one accent color', niji: false },
    { id: 'webtoon',  zh: '韓式條漫',     zhDesc: '韓國網路條漫（Webtoon）風格，數位上色、柔光、乾淨膚色、適合手機直式閱讀', en: 'Korean webtoon style, clean digital coloring, soft glow lighting, smooth skin shading, vertical scroll layout', niji: true },
    { id: 'popart',   zh: '復古普普風',   zhDesc: '復古美式普普藝術漫畫風格，班戴點網、高彩度原色、粗輪廓', en: 'retro pop art comic style, Ben-Day dots, bold primary colors, thick outlines', niji: false },
    { id: 'ink',      zh: '中國水墨',     zhDesc: '水墨漫畫風格，毛筆筆觸、墨色濃淡、留白意境、少量朱紅點綴', en: 'Chinese ink wash comic style, brush strokes, ink gradients, poetic negative space, touches of vermilion', niji: false },
    { id: 'cartoon3d', zh: '3D 卡通渲染', zhDesc: '3D 動畫電影卡通渲染風格，圓潤立體、柔和打光、細緻材質', en: '3D animated movie cartoon render, rounded stylized characters, soft cinematic lighting, detailed materials', niji: false }
  ];

  var PANEL_COUNTS = [2, 3, 4, 6, 8];

  var LAYOUTS = [
    { id: 'grid',     zh: '網格排列',       zhDesc: '多格以網格排列在同一頁', en: 'panels arranged in a grid on one page' },
    { id: 'vertical', zh: '直式條漫',       zhDesc: '多格由上到下直向排列，像手機條漫', en: 'panels stacked vertically like a vertical scroll comic' },
    { id: 'strip',    zh: '單列直排四格',   zhDesc: '多格由上到下單列直排，像報紙四格漫畫', en: 'single column of panels top to bottom like a yonkoma strip' },
    { id: 'row',      zh: '橫向一列',       zhDesc: '多格由左到右排成一列', en: 'panels in a single horizontal row' }
  ];

  var RATIOS = ['1:1', '3:4', '4:3', '2:3', '9:16', '16:9'];

  var COLORS = [
    { id: 'full',  zh: '全彩',        zhDesc: '全彩上色', en: 'full color' },
    { id: 'bw',    zh: '黑白網點',    zhDesc: '黑白漫畫，搭配網點與排線', en: 'black and white with screentones' },
    { id: 'duo',   zh: '雙色',        zhDesc: '黑色加一種強調色的雙色印刷', en: 'two-tone, black plus one accent color' },
    { id: 'sepia', zh: '復古褐色',    zhDesc: '復古褐色調', en: 'vintage sepia tones' }
  ];

  var LANGS = [
    { id: 'zh-TW', zh: '繁體中文', en: 'Traditional Chinese' },
    { id: 'en',    zh: '英文',     en: 'English' },
    { id: 'ja',    zh: '日文',     en: 'Japanese' },
    { id: 'none',  zh: '無對白（純畫面）', en: 'none' }
  ];

  var BUBBLES = [
    { id: 'round',  zh: '圓形對白框',   zhDesc: '白底黑框圓形對白框', en: 'round white speech balloons' },
    { id: 'rect',   zh: '方形旁白框',   zhDesc: '方形旁白框搭配對白框', en: 'rectangular caption boxes with speech balloons' },
    { id: 'hand',   zh: '手寫風泡泡',   zhDesc: '手繪感不規則對白泡泡', en: 'hand-drawn wobbly speech bubbles' },
    { id: 'minimal', zh: '簡約無框字',  zhDesc: '不畫框，文字直接放在角色旁', en: 'borderless floating dialogue text' }
  ];

  var MOODS = [
    { id: 'warm',     zh: '溫馨',  zhDesc: '溫馨療癒', en: 'heartwarming, cozy' },
    { id: 'funny',    zh: '搞笑',  zhDesc: '輕鬆搞笑、反差笑點', en: 'funny, comedic timing' },
    { id: 'hot',      zh: '熱血',  zhDesc: '熱血激昂', en: 'energetic, passionate' },
    { id: 'suspense', zh: '懸疑',  zhDesc: '懸疑緊張', en: 'suspenseful, tense' },
    { id: 'touching', zh: '感人',  zhDesc: '感人溫柔', en: 'touching, emotional' },
    { id: 'edu',      zh: '知識教學', zhDesc: '清楚易懂的知識教學', en: 'clear and educational' }
  ];

  var DIRECTIONS = [
    { id: 'ltr', zh: '左→右（橫書）', zhDesc: '閱讀順序由左到右、由上到下', en: 'reading order left to right, top to bottom' },
    { id: 'rtl', zh: '右→左（日漫）', zhDesc: '閱讀順序由右到左、由上到下（日式漫畫）', en: 'reading order right to left, top to bottom (manga)' }
  ];

  // 鏡頭：自動分配時依格數位置挑選
  var SHOTS = [
    { id: 'wide',   zh: '遠景',     zhDesc: '遠景建立場景', en: 'wide establishing shot' },
    { id: 'medium', zh: '中景',     zhDesc: '中景半身', en: 'medium shot' },
    { id: 'close',  zh: '特寫',     zhDesc: '臉部特寫', en: 'close-up on face' },
    { id: 'over',   zh: '過肩',     zhDesc: '過肩鏡頭', en: 'over-the-shoulder shot' },
    { id: 'low',    zh: '仰角',     zhDesc: '低角度仰拍', en: 'low angle shot' },
    { id: 'high',   zh: '俯角',     zhDesc: '高角度俯拍', en: 'high angle shot' },
    { id: 'extreme', zh: '大特寫',  zhDesc: '眼睛或物件大特寫', en: 'extreme close-up' }
  ];

  var EXPRESSIONS = [
    { id: 'smile',    zh: '微笑',   en: 'smiling' },
    { id: 'laugh',    zh: '大笑',   en: 'laughing' },
    { id: 'surprise', zh: '驚訝',   en: 'surprised' },
    { id: 'worry',    zh: '煩惱',   en: 'worried' },
    { id: 'angry',    zh: '生氣',   en: 'angry' },
    { id: 'sad',      zh: '難過',   en: 'sad' },
    { id: 'think',    zh: '思考',   en: 'thinking' },
    { id: 'determined', zh: '下定決心', en: 'determined' },
    { id: 'shy',      zh: '害羞',   en: 'shy, blushing' },
    { id: 'tired',    zh: '疲累',   en: 'exhausted' },
    { id: 'proud',    zh: '得意',   en: 'proud, confident' },
    { id: 'calm',     zh: '平靜',   en: 'calm' }
  ];

  // 規則式表情偵測關鍵字
  var EXPR_KEYWORDS = [
    ['laugh', /哈哈|笑死|爆笑|大笑|好好笑/],
    ['surprise', /什麼|竟然|居然|嚇|驚|！？|\?!|天啊|哇/],
    ['angry', /生氣|氣死|怒|不爽|火大/],
    ['sad', /哭|難過|傷心|失落|眼淚|遺憾|垂頭喪氣/],
    ['worry', /擔心|煩|糟|怎麼辦|緊張|焦慮|完了|慌|打不開|一個客人都沒有/],
    ['tired', /累|加班|熬夜|好睏|疲/],
    ['think', /想|思考|為什麼|或許|如果|嗯/],
    ['determined', /決定|一定要|加油|努力|拚|鼓起勇氣|握緊/],
    ['shy', /害羞|臉紅|不好意思/],
    ['proud', /成功|做到了|得意|太棒|完成|贏/],
    ['smile', /開心|謝謝|喜歡|好棒|溫暖|笑/]
  ];

  // 8 組原創人物預設值
  var CHARACTER_PRESETS = [
    { id: 'qing', name: '小晴', age: '26 歲女性', look: '黑色及肩短髮、齊瀏海、圓臉、大眼睛、臉頰淡淡紅暈', outfit: '米白色針織衫、淺藍牛仔褲、斜背帆布包、工作識別證', personality: '認真但容易緊張的小資上班族，心地善良', catchphrase: '「欸欸欸？真的假的！」', colors: '米白、淺藍、珊瑚粉',
      en: '26-year-old office woman, shoulder-length black bob with straight bangs, round face, big eyes, light blush, cream knit sweater, light blue jeans, canvas crossbody bag, employee ID badge' },
    { id: 'kai', name: '阿凱', age: '24 歲男性', look: '刺刺的短黑髮、濃眉、笑起來有虎牙、皮膚曬得黝黑', outfit: '深藍西裝外套、白襯衫、紅色領帶微歪、公事包', personality: '熱血衝動的新人業務，永遠充滿幹勁', catchphrase: '「交給我，包在我身上！」', colors: '深藍、白、紅',
      en: '24-year-old young salesman, spiky short black hair, thick eyebrows, snaggletooth grin, tanned skin, navy blazer, white shirt, slightly crooked red tie, briefcase' },
    { id: 'lin', name: '林姐', age: '42 歲女性', look: '俐落盤髮、細框眼鏡、眼神銳利、嘴角帶淺笑', outfit: '灰色套裝、珍珠耳環、手持平板電腦', personality: '嚴格但其實很照顧部屬的部門主管', catchphrase: '「重點是什麼？三句話講完。」', colors: '炭灰、珍珠白、酒紅',
      en: '42-year-old female manager, neat hair bun, thin-framed glasses, sharp eyes with a subtle smile, charcoal grey suit, pearl earrings, holding a tablet' },
    { id: 'david', name: '大衛', age: '35 歲男性', look: '微捲棕色短髮、短鬍渣、粗框眼鏡、身材精瘦', outfit: '黑色連帽 T、卡其工作褲、白色球鞋、手拿咖啡杯', personality: '樂觀的新創老闆，點子多但常忘記吃飯', catchphrase: '「這個點子可以做成產品！」', colors: '黑、卡其、橘',
      en: '35-year-old startup founder, short wavy brown hair, light stubble, thick-rimmed glasses, lean build, black hoodie, khaki work pants, white sneakers, holding a coffee cup' },
    { id: 'mi', name: '小米', age: '16 歲女學生', look: '高馬尾、髮夾、圓圓杏眼、元氣笑容', outfit: '藍白高中制服、運動外套綁在腰上、雙肩書包', personality: '好奇心旺盛、愛發問的高中生', catchphrase: '「老師，那為什麼會這樣？」', colors: '天藍、白、黃',
      en: '16-year-old high school girl, high ponytail with hair clip, round almond eyes, energetic smile, blue and white school uniform, track jacket tied around waist, backpack' },
    { id: 'grandma', name: '秀蘭阿嬤', age: '72 歲女性', look: '花白捲短髮、笑起來眼睛瞇成一條線、圓圓身材', outfit: '碎花上衣、深色寬褲、藍白拖、提著菜籃', personality: '慈祥又幽默的阿嬤，最愛餵飽大家', catchphrase: '「憨孫，有吃飽嘸？」', colors: '花紅、深褐、藍白',
      en: '72-year-old Taiwanese grandmother, short curly grey-white hair, eyes squinting when smiling, plump figure, floral blouse, dark loose pants, blue-white slippers, carrying a vegetable basket' },
    { id: 'doupi', name: '豆皮', age: '柴犬（吉祥物）', look: '赤柴色毛、白色眉毛點、捲尾巴、圓滾滾', outfit: '紅色項圈掛著金色鈴鐺', personality: '貪吃又愛撒嬌，常常做出人類表情', catchphrase: '「汪！（給我零食）」', colors: '赤褐、奶白、紅',
      en: 'chubby red Shiba Inu mascot dog, white eyebrow dots, curled tail, red collar with a golden bell, expressive human-like faces' },
    { id: 'pico', name: 'Pico', age: 'AI 小助理機器人', look: '圓頭圓身的白色小機器人、臉部是藍色螢幕顯示表情、頭頂一根天線', outfit: '胸前有橘色指示燈、會漂浮', personality: '聰明貼心但偶爾當機出錯的 AI 助理', catchphrase: '「資料分析完畢，嗶嗶！」', colors: '白、電光藍、橘',
      en: 'small round white floating robot assistant, blue screen face showing emoji expressions, single antenna on head, orange indicator light on chest' }
  ];

  var EXAMPLES = [
    { id: 'office', title: '職場小故事', mood: 'funny', chars: ['qing', 'lin'], text:
      '星期一早上，小晴抱著咖啡衝進辦公室，發現簡報檔案打不開。\n她慌張地大喊：「完了完了，下午就要報告了！」\n林姐走過來，淡定地說：「雲端上有自動備份，冷靜。」\n小晴鬆了一口氣，卻發現備份檔案的名稱是「最終版_真的最終版_v8」。' },
    { id: 'startup', title: '創業日常', mood: 'hot', chars: ['david', 'kai'], text:
      '大衛在凌晨三點還在改商業計畫書。\n阿凱傳訊息：「老闆，客戶說明天想先看樣品！」\n大衛盯著空蕩蕩的工作室，深吸一口氣：「好，今晚就做出來。」\n隔天早上，客戶拿著樣品笑著說：「這就是我們要的。」' },
    { id: 'lesson', title: '課程重點教學', mood: 'edu', chars: ['mi', 'pico'], text:
      '小米問 Pico：「寫 AI 提示詞到底要寫什麼？」\nPico 說：「先講角色，再講任務，最後講格式。」\n小米照著寫了一段提示詞，AI 給出很清楚的答案。\n小米開心地說：「原來重點是把話講清楚！」' },
    { id: 'family', title: '親子溫馨', mood: 'warm', chars: ['grandma', 'mi'], text:
      '放學後，小米垂頭喪氣地回到阿嬤家，考試考差了。\n阿嬤沒有罵她，只端出一碗熱騰騰的湯圓。\n「憨孫，失敗一次沒關係，吃飽再來拚。」\n小米邊吃邊笑，眼角還掛著眼淚。' },
    { id: 'pet', title: '寵物搞笑', mood: 'funny', chars: ['doupi', 'qing'], text:
      '小晴買了一包新零食放在桌上，轉身去倒水。\n豆皮盯著零食，假裝若無其事地趴下。\n小晴回來時，零食袋已經空了，豆皮嘴邊沾滿碎屑。\n豆皮歪著頭：「汪？」一臉無辜。' },
    { id: 'sales', title: '業務提案翻轉', mood: 'hot', chars: ['kai', 'lin'], text:
      '阿凱第一次單獨去見大客戶，在電梯裡緊張得一直深呼吸。\n會議室裡，客戶冷冷地說：「你們的價格比別人貴兩成。」\n阿凱想起林姐教的話，打開平板秀出售後服務的數據。\n客戶沉默了三秒，終於點頭：「好，先簽一年看看。」' },
    { id: 'ai-bug', title: 'AI 助理當機', mood: 'funny', chars: ['pico', 'david'], text:
      '大衛請 Pico 幫忙寫一封給投資人的感謝信。\nPico 自信地說：「交給我，三秒完成，嗶嗶！」\n大衛打開信件，發現整封信都是「謝謝謝謝謝謝謝謝」。\nPico 的螢幕跳出一個冒汗的表情：「系統……需要喝杯咖啡。」' },
    { id: 'night-market', title: '夜市擺攤創業', mood: 'warm', chars: ['grandma', 'david'], text:
      '傍晚，大衛在夜市擺出第一天的攤位，卻一個客人都沒有。\n隔壁攤的秀蘭阿嬤遞給他一杯熱茶：「少年仔，要大聲喊才會有人來。」\n大衛鼓起勇氣大喊：「手作果醬，試吃免費！」\n晚上收攤時，攤位前排了一條長長的隊伍。' },
    { id: 'study', title: '期末考前夕', mood: 'touching', chars: ['mi', 'qing'], text:
      '半夜，小米在書桌前對著數學題目快要哭出來。\n住在隔壁的表姐小晴敲門，端來一杯熱可可。\n小晴陪著她一題一題算，還在筆記本上畫了一個加油的笑臉。\n隔天早上，小米看著筆記本上的笑臉，握緊鉛筆走進考場。' },
    { id: 'meeting', title: '線上會議災難', mood: 'funny', chars: ['qing', 'lin', 'doupi'], text:
      '小晴在家開線上會議，正在向林姐報告這季業績。\n她說得正起勁：「我們的成長率是——」\n豆皮突然跳上桌，整個大屁股擋住了鏡頭。\n林姐忍著笑說：「看來豆皮也想加薪。」' }
  ];

  return {
    STYLES: STYLES, PANEL_COUNTS: PANEL_COUNTS, LAYOUTS: LAYOUTS, RATIOS: RATIOS, COLORS: COLORS,
    LANGS: LANGS, BUBBLES: BUBBLES, MOODS: MOODS, DIRECTIONS: DIRECTIONS, SHOTS: SHOTS,
    EXPRESSIONS: EXPRESSIONS, EXPR_KEYWORDS: EXPR_KEYWORDS, CHARACTER_PRESETS: CHARACTER_PRESETS, EXAMPLES: EXAMPLES
  };
})();
