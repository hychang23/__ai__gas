import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Languages, 
  ListChecks, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  AlertCircle, 
  Clock, 
  MessageSquare, 
  HelpCircle,
  FileDown,
  ChevronRight,
  Maximize2,
  Minimize2
} from "lucide-react";
import MarkdownRenderer from "./components/MarkdownRenderer";

// 歷史記錄介面定義
interface HistoryItem {
  id: string;
  timestamp: string;
  title: string;
  transcriptPreview: string;
  result: string;
  mode: string;
  targetLanguage: string;
}

const DEFAULT_TRANSCRIPT_SAMPLE = `主席（王經理）：好，大家早。今天我們臨時開這個會，主要是討論下個月新產品 “AI 祕書 1.0” 的功能，還有行銷研發這邊的進度。我們預計 6 月 15 要上線。RD 這邊，阿明，進度怎麼樣？

軟體研發（阿明）：經理，目前核心 API 串接跟資料庫都好了，主要是在 debug。比較卡的是前端 UI 這邊，因為設計改了幾次，所以有些功能可能要延遲到 6 月 10 號才能完成封測。但我保證 6 月 15 上線沒問題。

主席（王經理）：研發辛苦了。但 6 月 10 封測有點緊，有沒有可能提前到 6 月 8 號？不然後續行銷推廣如果發現 bug，會沒時間修。

軟體研發（阿明）：那我這禮拜跟小美對一下設計，減少一些不必要的微細動畫，我們盡力在 6 月 8 號完成封測版本的打包。

產品設計（小美）：對不起，因為使用者回饋說版面有點亂，我才調整的。之後我不會再改版面了，這週我會全力協助阿明完成前後端 UI 串接。這週五前我們會把所有 assets 給阿明。

主席（王經理）：沒關係，小美出發點也是為了產品好。行銷這邊，雅婷，你們的推廣計畫呢？

行銷主管（雅婷）：我們目前在寫新聞稿跟預熱頁。新聞稿預計 6 月 1 號要發送，媒體名單已經名列出 30 家了。另外下週二（5 月 27）我們會先跟 KOL 談置入合作。但我需要小美在 5 月 25 號前提供我 3 張宣傳海報的初稿。

產品設計（小美）：沒問題，雅婷，5 月 24 號（本週五）下班前，我會把這 3 張初稿給妳。

主席（王經理）：很好。那行銷的預算控制在 10 萬以內，沒問題吧？

行銷主管（雅婷）：是的，目前預估合共 8 萬 5，還在預算內。

主席（王經理）：好，那我們來總結一下：
第一，阿明這週五要跟小美確認 UI 細節，全力拼 6 月 8 號封測版上線。
第二，小美最晚這週五下班前，要給雅婷 3 張海報初稿。
第三，雅婷下週二開始與 KOL 洽談，6 月 1 號發媒體新聞稿。
下次會議訂在下週五（5 月 31）早上 10 點。謝謝大家，散會。`;

export default function App() {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState("full");
  const [targetLanguage, setTargetLanguage] = useState("default");
  const [customLanguage, setCustomLanguage] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  
  // 狀態管理
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 歷史記錄
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // 初始化時加載 LocalStorage 中的歷史項目
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ai_meeting_notes_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load local history", e);
    }
  }, []);

  // 儲存歷史記錄至 LocalStorage
  const saveToHistory = (newResult: string, rawContent: string) => {
    try {
      const titleMatch = rawContent.trim().match(/[^\n]+/);
      const firstLine = titleMatch ? titleMatch[0].substring(0, 20) : "未命名會議";
      const displayTitle = firstLine.startsWith("主席") 
        ? "AI 會議整理 - 新會議" 
        : `會議：${firstLine}...`;
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString("zh-TW", { hour12: false }),
        title: displayTitle,
        transcriptPreview: rawContent.substring(0, 80) + "...",
        result: newResult,
        mode: mode,
        targetLanguage: targetLanguage,
      };

      const updatedHistory = [newHistoryItem, ...history].slice(0, 15); // 最多保留 15 筆
      setHistory(updatedHistory);
      localStorage.setItem("ai_meeting_notes_history", JSON.stringify(updatedHistory));
      setActiveHistoryId(newHistoryItem.id);
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("ai_meeting_notes_history", JSON.stringify(updated));
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      setResult("");
    }
  };

  const clearAllHistory = () => {
    if (window.confirm("您確定要清除所有歷史會議記錄嗎？此步驟無法復原。")) {
      setHistory([]);
      localStorage.removeItem("ai_meeting_notes_history");
      setActiveHistoryId(null);
      setResult("");
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.result);
    setContent(""); // 載入歷史時，清空輸入框以便專注
    setActiveHistoryId(item.id);
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    try {
      const blob = new Blob([result], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // 嘗試解析會議紀錄標題
      const titleMatch = result.trim().match(/會議主題[：:\s]+([^\n]+)/);
      let filename = "會議記錄.md";
      if (titleMatch && titleMatch[1]) {
        filename = `${titleMatch[1].trim().replace(/[\\/:*?"<>|]/g, "")}_會議記錄.md`;
      } else {
        const firstLineMatch = result.trim().match(/[^\n]+/);
        if (firstLineMatch) {
          filename = `${firstLineMatch[0].trim().substring(0, 20).replace(/[\\/:*?"<>|]/g, "")}_會議記錄.md`;
        }
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      setErrorMsg("請輸入一二行或貼上會議逐字稿內容。");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setResult("");
    setActiveHistoryId(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          mode,
          targetLanguage,
          customLanguage: targetLanguage === "custom" ? customLanguage : "",
          customInstructions,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "生成失敗，請稍候重試。");
      }

      const data = await response.json();
      setResult(data.result);
      saveToHistory(data.result, content);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "與伺服器連線、或呼叫 AI 整理時發生錯誤。請確認您的 GEMINI_API_KEY 已正確設定。");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setContent(DEFAULT_TRANSCRIPT_SAMPLE.trim());
    setErrorMsg("");
  };

  const getModeLabel = (m: string) => {
    switch (m) {
      case "full": return "完整會議記錄";
      case "summary_only": return "僅核心摘要";
      case "action_items": return "待辦與行動指南";
      case "translate_only": return "純文字翻譯";
      default: return m;
    }
  };

  const getLanguageLabel = (l: string) => {
    const map: Record<string, string> = {
      default: "繁體中文",
      en: "英文 (English)",
      ja: "日文 (日本語)",
      ko: "韓文 (한국어)",
      zh_cn: "簡體中文 (简体中文)",
      vi: "越南文 (Tiếng Việt)",
      th: "泰文 (ไทย)",
      custom: "自訂語系"
    };
    return map[l] || l;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-neutral-200 font-sans selection:bg-indigo-950/60 selection:text-indigo-200 flex flex-col antialiased">
      {/* 頂部導航 */}
      <header className="bg-[#0A0A0B]/80 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-950/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">AI 會議記錄生成與翻譯工具</h1>
              <p className="text-xs text-neutral-400 font-normal">使用 Gemini 3.5 高效能模型，秒速提煉決議與跨國翻譯</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
              服務運作中 (Gemini Node)
            </span>
          </div>
        </div>
      </header>

      {/* 主體區 */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col lg:flex-row gap-6">
        
        {/* 左側面板：輸入與設定 */}
        <div className="w-full lg:w-5/12 flex flex-col space-y-5">
          
          {/* 逐字稿輸入卡片 */}
          <div className="bg-[#141417] rounded-2xl border border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="transcript-input" className="flex items-center space-x-2 text-base font-bold text-neutral-250">
                <FileText className="h-5 w-5 text-indigo-400" />
                <span>貼上會議內容</span>
              </label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors border border-indigo-500/20 cursor-pointer"
              >
                💡 載入範例逐字稿
              </button>
            </div>

            <div className="relative">
              <textarea
                id="transcript-input"
                rows={10}
                placeholder="在此處貼上 Zoom、Teams、Meet 音訊轉出的會議逐字稿、混亂的討論對詰紀錄，或者手動隨手記錄的重點筆記..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                className="w-full text-sm text-neutral-300 placeholder-neutral-600 bg-[#0d0d0f]/50 hover:bg-[#0d0d0f]/80 border border-neutral-800 focus:border-indigo-500/50 focus:bg-[#141417] focus:outline-hidden focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-4 transition-all duration-150 resize-y leading-relaxed font-sans"
              />
              {content && (
                <div className="absolute bottom-3 right-3 text-xs text-neutral-500 font-mono">
                  {content.length} 字
                </div>
              )}
            </div>
          </div>

          {/* AI 輸出設置卡片 */}
          <div className="bg-[#141417] rounded-2xl border border-neutral-800 p-5 space-y-4">
            <h2 className="flex items-center space-x-2 text-base font-bold text-neutral-250">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span>AI 行為與格式設定</span>
            </h2>

            {/* 整理模式選擇 */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-neutral-500 tracking-wider uppercase">整理模式</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "full", label: "完整會議記錄", desc: "資訊、核心決議與行動表" },
                  { id: "summary_only", label: "僅核心摘要", desc: "提煉核心結論，簡潔有力" },
                  { id: "action_items", label: "待辦指南", desc: "聚焦人、事、時程" },
                  { id: "translate_only", label: "純文字翻譯", desc: "不添加額外格式，僅翻譯" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`flex flex-col text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      mode === item.id
                        ? "border-indigo-600 bg-indigo-500/10 text-white shadow-xs"
                        : "border-neutral-800 hover:border-neutral-700 bg-neutral-900/30 text-neutral-400"
                    }`}
                  >
                    <span className="text-sm font-bold">{item.label}</span>
                    <span className="text-xs text-neutral-500 mt-0.5 font-normal leading-tight">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 翻譯語系選擇 */}
            <div className="space-y-1.5">
              <label htmlFor="language-select" className="text-xs font-bold text-neutral-500 tracking-wider uppercase block">翻譯目標語言</label>
              <div className="relative">
                <select
                  id="language-select"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full text-sm text-neutral-300 bg-[#0d0d0f]/50 border border-neutral-800 hover:border-neutral-750 focus:border-indigo-500/60 focus:outline-hidden rounded-xl p-3 transition-colors appearance-none cursor-pointer"
                >
                  <option value="default">🌐 不翻譯 (維持繁體中文 zh-TW)</option>
                  <option value="en">🇺🇸 英文 (English)</option>
                  <option value="ja">🇯🇵 日文 (日本語)</option>
                  <option value="ko">🇰🇷 韓文 (한국어)</option>
                  <option value="zh_cn">🇨🇳 簡體中文 (简体中文)</option>
                  <option value="vi">🇻🇳 越南文 (Tiếng Việt)</option>
                  <option value="th">🇹🇭 泰文 (ไทย)</option>
                  <option value="custom">✍️ 自訂多國語言...</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-neutral-500">
                  <Languages className="h-4 w-4" />
                </div>
              </div>

              {/* 自訂語系輸入 */}
              {targetLanguage === "custom" && (
                <div className="mt-2 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="例如：西班牙文、德文、法文..."
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    className="w-full text-sm text-neutral-300 bg-neutral-900 border border-neutral-800 focus:border-indigo-500/50 focus:outline-hidden rounded-xl p-3 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* 客製化指令 */}
            <div className="space-y-1.5">
              <label htmlFor="custom-instruction-input" className="text-xs font-bold text-neutral-500 tracking-wider uppercase block">額外特別要求 (選填)</label>
              <textarea
                id="custom-instruction-input"
                rows={2}
                placeholder="例如：「請聚焦在行銷與時程上」、「以條列式大綱呈現」、「用幽默擬人的語氣」、「多加強阿明的研發描述」..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="w-full text-sm text-neutral-300 bg-[#0d0d0f]/50 hover:bg-[#0d0d0f]/80 border border-neutral-800 focus:border-indigo-500 focus:bg-[#141417] focus:outline-hidden rounded-xl p-3 transition-colors leading-relaxed"
              />
            </div>
          </div>

          {/* 送出與錯誤提示 */}
          <div className="space-y-3">
            {errorMsg && (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex items-start space-x-3 text-rose-200 text-sm animate-fadeIn">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-100">整理失敗</h4>
                  <p className="mt-1 leading-relaxed text-rose-250/90">{errorMsg}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={loading || !content.trim()}
              onClick={handleGenerate}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 shadow-lg transition-all duration-200 cursor-pointer select-none ${
                loading
                  ? "bg-indigo-800/80 text-indigo-200 cursor-not-allowed shadow-none"
                  : !content.trim()
                  ? "bg-neutral-800 text-neutral-500 shadow-none cursor-default"
                  : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-950/30 hover:-translate-y-0.5 active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-300" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>AI 秘書正飛速整理中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>開始生成會議記錄與翻譯</span>
                </>
              )}
            </button>
          </div>

          {/* 歷史快取項目卡片 */}
          <div className="bg-[#141417] rounded-2xl border border-neutral-800 p-5 space-y-4 flex-1 flex flex-col min-h-[250px] max-h-[380px]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center space-x-2 text-base font-bold text-neutral-250">
                <Clock className="h-5 w-5 text-indigo-400" />
                <span>歷史會議紀錄快取 ({history.length}/15)</span>
              </h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllHistory}
                  className="text-xs font-semibold text-rose-450 hover:text-rose-400 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>清除全部</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-850 rounded-xl bg-neutral-900/10">
                <HelpCircle className="h-8 w-8 text-neutral-600 mb-2" />
                <p className="text-sm text-neutral-400 font-medium">尚無歷史會議紀錄</p>
                <p className="text-xs text-neutral-500 mt-1">產出的報告將保存在您此瀏覽器的快取中</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className={`group w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between space-x-3 ${
                      activeHistoryId === item.id
                        ? "border-indigo-500/50 bg-indigo-500/5"
                        : "border-neutral-900/50 bg-neutral-900/20 hover:border-neutral-800 hover:bg-neutral-900/40"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-neutral-200 truncate group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1 break-all">{item.transcriptPreview}</p>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">{getModeLabel(item.mode)}</span>
                        {item.targetLanguage !== "default" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/20 text-amber-400 border border-amber-900/30">{getLanguageLabel(item.targetLanguage)}</span>
                        )}
                        <span className="text-[10px] text-neutral-500 font-mono">{item.timestamp}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="text-neutral-500 hover:text-rose-400 p-1 rounded-md hover:bg-neutral-850 transition-colors self-center opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="刪除此紀錄"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 右側面板：結果輸出區 */}
        <div className={`w-full lg:w-7/12 flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-[#0A0A0B] p-6 md:p-8" : ""}`}>
          <div className="bg-[#141417] rounded-2xl border border-neutral-800 flex flex-col flex-1 h-full min-h-[500px]">
            
            {/* 結果欄標題 */}
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-[#141417] rounded-t-2xl">
              <div className="flex items-center space-x-2.5">
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2 rounded-lg">
                  <ListChecks className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {activeHistoryId ? "歷史會議記錄詳情" : "AI 智能分析與翻譯成果"}
                  </h2>
                  {activeHistoryId && (
                    <p className="text-xs text-indigo-400 font-bold mt-0.5">唯讀模式：載入自本地快取紀錄</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {result && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title={isFullscreen ? "縮小視窗" : "放大至全螢幕"}
                    >
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        copied
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border-indigo-650 hover:border-indigo-600"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>複製成功</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>複製 Markdown</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-850 text-neutral-200 shadow-md cursor-pointer transition-all"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>下載 Markdown (.md)</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 結果內容 */}
            <div className="p-6 overflow-y-auto flex-1 bg-transparent rounded-b-2xl">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 py-20 min-h-[300px]">
                  <div className="relative flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-950 border-t-indigo-500"></div>
                    <Sparkles className="absolute h-5 w-5 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-semibold text-neutral-200 animate-pulse">正在精準剖析逐字稿的對話脈絡...</p>
                    <p className="text-xs text-neutral-550">過濾口語助詞、重新編排議題決議、建立待辦事項並進行多國預備</p>
                  </div>

                  {/* 模擬生成細部進度框 */}
                  <div className="mt-4 w-64 bg-neutral-900/50 border border-neutral-800/50 rounded-lg p-3 text-[11px] text-neutral-500 font-mono space-y-1">
                    <div className="flex items-center"><ChevronRight className="h-3 w-3 text-emerald-400 mr-1 animate-ping" /><span>分析會議人物關係...</span></div>
                    <div className="flex items-center"><ChevronRight className="h-3 w-3 text-indigo-400 mr-1" /><span>結構化標記議題與行動方案...</span></div>
                    <div className="flex items-center"><ChevronRight className="h-3 w-3 text-indigo-400 mr-1" /><span>校正繁體中文排版格式...</span></div>
                  </div>
                </div>
              ) : result ? (
                <div className="prose prose-invert max-w-none text-neutral-300 leading-relaxed break-words pb-8 animate-fadeIn">
                  <MarkdownRenderer content={result} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 min-h-[300px]">
                  <div className="bg-neutral-900/80 p-4 rounded-full border border-neutral-850 mb-4 text-neutral-600">
                    <MessageSquare className="h-10 w-10" />
                  </div>
                  <h3 className="text-base font-bold text-white">尚未生成成果</h3>
                  <p className="text-sm text-neutral-400 mt-1 max-w-sm font-light">
                    在左邊輸入您的逐字稿，選擇您想要的格式與翻譯條件，然後點擊上面的「開始生成」按鈕吧！
                  </p>

                  <div className="mt-8 p-4 bg-[#0d0d0f]/50 rounded-xl border border-neutral-800/40 max-w-md text-left text-xs text-neutral-400 space-y-3">
                    <div className="font-bold text-neutral-300 flex items-center">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400 mr-1.5" />
                      本 AI 工具的功能優勢
                    </div>
                    <ul className="list-disc leading-relaxed pl-4 space-y-1">
                      <li>**高精準提煉**：主動重組混亂的口語會議內容，抓取精準的決議（Decision）。</li>
                      <li>**智慧翻譯**：不只是直譯，兼顧行業詞彙與文雅的商務溝通對譯。</li>
                      <li>**時程待辦一覽**：結構化列出 Who, What, When，幫助團隊敏捷對接。</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </main>

      {/* 底部 Footer */}
      <footer className="bg-[#0D0D0E] border-t border-neutral-800 mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <p>© 2026 AI 會議記錄生成與翻譯工具. 利用專業級 Gemini 頂尖性能為繁體辦公室賦能。</p>
          <div className="flex space-x-4">
            <span className="text-neutral-400 hover:text-white transition-colors">繁體中文版</span>
            <span>•</span>
            <span className="text-neutral-400 hover:text-white transition-colors">雲端本地快取機制</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
