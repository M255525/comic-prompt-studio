# CLAUDE.md — comic-prompt-studio（漫畫分鏡提示詞工坊）

輸入一段文字 → 拆成 2／3／4／6／8 格短篇漫畫分鏡 → 依平台組成生圖提示詞（Gemini、ChatGPT、Midjourney、通用中英對照），可選「整頁一張圖」或「逐格分開生成」。另有「💡 主題生腳本」分頁：輸入「請解釋什麼是 SWOT 分析」→ 產生多格講解腳本 → 走同一條分鏡／提示詞管線。無框架、無建置、無序號授權。2026-10-29 建立。

## 檔案
- `data.js`：`window.CPS`。12 種風格（`zhDesc` 給 Gemini／ChatGPT、`en` 給 MJ、`niji` 決定 `--niji 6`／`--v 7`）、版面／比例／色彩／對白語言／對白框／基調／閱讀方向／鏡頭／表情、`EXPR_KEYWORDS`（規則式表情偵測）、人物預設＝`FAMOUS_PRESETS` **12 位知名卡通人物**（加菲貓、歐弟、史努比、查理布朗、米老鼠、唐老鴨、小熊維尼、哆啦A夢、皮卡丘、海綿寶寶、凱蒂貓、蠟筆小新；`famous:true` 會在提示詞加註「維持原作經典造型」）＋`ORIGINAL_PRESETS` 8 位原創人物（範例故事使用），`PRESET_GROUPS` 決定選單分組順序、**10 組範例**。
- `app.js`：規則式分鏡 `ruleStoryboard()`（換行→句號→引號外逗號拆分、不足補「反應」格、過多平均合併；只有前接「：」或說／喊／問的引號才算對白，其餘留在畫面描述；說話者取對白所在子句最先出現的角色，找不到就留空）、四個 `build*` 提示詞產生器、人物卡、BYOK AI 分鏡（Gemini／OpenAI／Claude／OpenRouter，回傳 JSON 陣列，失敗退回規則式）、歷史、專案 .json。測試 hook `window.__comicPrompt`（`state/loadExample/storyboard/buildPrompt/setPlatform/set/openSettings/parseAiPanels/aiPrompt`）。
- 主題生腳本：`data.js` 的 `SCRIPT_TYPES`（4 種，各帶預設情緒基調）、`TOPICS`（14 個框架，points＝[標籤, 預設情境例子, 自訂情境通用說法]）、`GENERIC_TOPIC`；`app.js` 的 `cleanTopic()` 去掉「請解釋／什麼是」等請求語、`looksLikeTopicRequest()` 讓故事框裡的一句請求自動改走主題流程、`ruleScript()` 一格一行輸出（每行含角色名與「：「」」，讓 `ruleStoryboard()` 一對一拆格）、`aiScriptPrompt()`。
- 內容風格：`data.js` 的 `TONES`（8 種，和管畫面氛圍的 `MOODS` 分開）；`v` 是規則式腳本的動作用語、`pre`/`tail` 包住收尾台詞、`vzh`/`ven` 寫進四平台提示詞（standard 為空＝不加字）、`desc` 給三個 AI 指令。`state.settings.tone`，⚙ 可設預設。
- AI 潤飾：`aiPolish()` 把目前平台的 `buildPrompt()` 交給 LLM 改寫（`POLISH_FORMAT` 依平台指定格式；鎖格數／角色／對白），結果存 `state.polish[平台]={src,text}`，`src` 與目前原始版不同就失效；複製／下載走 `finalPrompt()`；會比對原始版每個「」是否還在並提醒。
- AI 連線：`PROVIDERS` 含 gemini／openai／claude／openrouter／deepseek／xai／custom（OpenAI 相容，`aiBase` 只填到 /v1 會自動補 /chat/completions，本機服務可不填金鑰）；`aiModelCustom` 優先於下拉模型；⚙ 設定有「🔌 測試連線」。網站公開，**金鑰一律 BYOK 存使用者瀏覽器，不可寫進程式碼**。
- localStorage：`comicPromptPrefs`（常用設定含金鑰）、`comicPromptDraft`（自動暫存）、`comicPromptMyChars`、`comicPromptHistory`（20 筆）、`comicPromptWarnSeen`、`comicPromptMarquee`。

## 配套
- ✅ 標準五件套：📖 `manual.html`、⚠ 使用警語（頁面頂部警語列＋「ℹ 關於」彈窗首訪自動跳出）、👤 創作者資訊、📲 加入主畫面（PWA，`service-worker.js` network-first，改 js 記得 `CACHE_NAME` +1；`icons/` PIL 自畫）、訪客計數器 `page_id=m255525.comicpromptstudio`
- ✅ 頂部跑馬燈（共用 Apps Script 端點、滑鼠移入暫停）＋ ⚙ 常用設定（底部「關於本工具」集中入口）
- ✅ RWD（≤980px 單欄、≤560px 精簡；375px 無橫向捲動）、亮／暗色
- ❌ 序號授權（不需要）
- ✅ GitHub Pages（2026-10-29 上線）：公開 repo <https://github.com/M255525/comic-prompt-studio>，網址 <https://m255525.github.io/comic-prompt-studio/>，`master`＋`.github/workflows/deploy-pages.yml`；程式牆與 github-dashboard 的 REPO_META 已登記（已從程式牆 LOCAL_APPS 移除）

## 注意
- 知名卡通人物是**使用者 2026-10-29 明確要求**放進預設人物；外型描述須自寫簡短特徵，不可抄官方文案或附官方圖。警語（頁面頂部、關於彈窗、manual）寫明著作權屬原權利人、僅限個人學習／課堂練習／非營利、不可商用、部分平台會拒絕生成。範例故事維持用原創人物。不可加入真實人物。

## Port／測試
- port **8838**（`.claude/launch.json` 的 `comic-prompt-studio`）
- 驗證：Playwright 開 `http://127.0.0.1:8838/`，對 `CPS.EXAMPLES` 逐一 `loadExample` 檢查格數／說話者／場景；`set('panels',6)`；`buildPrompt('mj')` 參數隨比例與風格變化；375px `scrollWidth===clientWidth`。
