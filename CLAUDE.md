# CLAUDE.md — comic-prompt-studio（漫畫分鏡提示詞工坊）

輸入一段文字 → 拆成 2／3／4／6／8 格短篇漫畫分鏡 → 依平台組成生圖提示詞（Gemini、ChatGPT、Midjourney、通用中英對照），可選「整頁一張圖」或「逐格分開生成」。無框架、無建置、無序號授權。2026-10-29 建立。

## 檔案
- `data.js`：`window.CPS`。12 種風格（`zhDesc` 給 Gemini／ChatGPT、`en` 給 MJ、`niji` 決定 `--niji 6`／`--v 7`）、版面／比例／色彩／對白語言／對白框／基調／閱讀方向／鏡頭／表情、`EXPR_KEYWORDS`（規則式表情偵測）、**8 位原創人物預設**（含 `en` 英文外型）、**10 組範例**。
- `app.js`：規則式分鏡 `ruleStoryboard()`（換行→句號→引號外逗號拆分、不足補「反應」格、過多平均合併；只有前接「：」或說／喊／問的引號才算對白，其餘留在畫面描述；說話者取對白所在子句最先出現的角色，找不到就留空）、四個 `build*` 提示詞產生器、人物卡、BYOK AI 分鏡（Gemini／OpenAI／Claude／OpenRouter，回傳 JSON 陣列，失敗退回規則式）、歷史、專案 .json。測試 hook `window.__comicPrompt`（`state/loadExample/storyboard/buildPrompt/setPlatform/set/openSettings/parseAiPanels/aiPrompt`）。
- localStorage：`comicPromptPrefs`（常用設定含金鑰）、`comicPromptDraft`（自動暫存）、`comicPromptMyChars`、`comicPromptHistory`（20 筆）、`comicPromptWarnSeen`、`comicPromptMarquee`。

## 配套
- ✅ 標準五件套：📖 `manual.html`、⚠ 使用警語（頁面頂部警語列＋「ℹ 關於」彈窗首訪自動跳出）、👤 創作者資訊、📲 加入主畫面（PWA，`service-worker.js` network-first，改 js 記得 `CACHE_NAME` +1；`icons/` PIL 自畫）、訪客計數器 `page_id=m255525.comicpromptstudio`
- ✅ 頂部跑馬燈（共用 Apps Script 端點、滑鼠移入暫停）＋ ⚙ 常用設定（底部「關於本工具」集中入口）
- ✅ RWD（≤980px 單欄、≤560px 精簡；375px 無橫向捲動）、亮／暗色
- ❌ 序號授權（不需要）
- ⏳ GitHub Pages：尚未部署（實驗性新工具，部署前先問使用者）

## 注意
- 人物預設與範例皆原創，**不可加入既有 IP 角色或真實人物**；警語也要求使用者不要生成真實人物肖像。

## Port／測試
- port **8838**（`.claude/launch.json` 的 `comic-prompt-studio`）
- 驗證：Playwright 開 `http://127.0.0.1:8838/`，對 `CPS.EXAMPLES` 逐一 `loadExample` 檢查格數／說話者／場景；`set('panels',6)`；`buildPrompt('mj')` 參數隨比例與風格變化；375px `scrollWidth===clientWidth`。
