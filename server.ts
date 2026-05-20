import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// 初始化 Gemini 客戶端
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// 支援大容量 JSON 請求（有些會議逐字稿可能很長）
app.use(express.json({ limit: "20mb" }));

// API 路由
app.post("/api/generate", async (req: express.Request, res: express.Response) => {
  try {
    const { content, mode, targetLanguage, customLanguage, customInstructions } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "請輸入或貼上會議逐字稿或重點筆記。" });
    }

    const currentApiKey = process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      return res.status(500).json({ 
        error: "未偵測到 GEMINI_API_KEY。請在 AI Studio 中透過「Settings > Secrets」設定您的金鑰。" 
      });
    }

    // 延遲初始化或在 key 變更後重置
    if (!ai) {
      ai = new GoogleGenAI({
        apiKey: currentApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }

    // 建立提示詞
    let taskPrompt = "";
    if (mode === "summary_only") {
      taskPrompt = `【特定處理模式：僅重要摘要且精簡】\n請迅速提煉並回傳此會議內容的簡明摘要，不需要包含過多細節，但必須保留最核心的結論與重要對話亮點。請用項目符號條列。`;
    } else if (mode === "action_items") {
      taskPrompt = `【特定處理模式：行動指南與待辦清單】\n請聚焦於提取會議中所有的行動事項（Action Items），並將其結構化。要明確指出「何人 (Who)」、「何事 (What)」與「何時 (When)」。若無明確時間或負責人，可合理推論或標註為全體。`;
    } else if (mode === "translate_only") {
      taskPrompt = `【特定處理模式：僅翻譯】\n請直接且精確、不帶任何多餘解釋與前言地將使用者貼上的內容翻譯成目標語言，並盡可能保留原文的所有標點符號與原本的排版結構。`;
    } else {
      taskPrompt = `【特定處理模式：完整會議記錄整理】\n請生成完整的、格式精美的會議記錄。應完整包含「會議基本資訊（如主題、時間、與會者，如未提及則寫不知道）」、「重點摘要（3-5句精簡結論）」、「關鍵討論議題與決議（詳細列出討論亮點與各方觀點與Decision）」、以及「待辦與行動事項（Action Items）一覽表」。`;
    }

    let languagePrompt = "主要輸出語言：若無特別指定或指定為 default，請一律使用繁體中文（台灣，zh-TW）進行整理與撰寫。";
    if (targetLanguage && targetLanguage !== "default") {
      const langMap: Record<string, string> = {
        en: "英文 (English, US)",
        ja: "日文 (Japanese)",
        ko: "韓文 (Korean)",
        zh_cn: "簡體中文 (Simplified Chinese)",
        vi: "越南文 (Vietnamese)",
        th: "泰文 (Thai)",
        id: "印尼文 (Indonesian)"
      };
      const langName = targetLanguage === "custom" ? (customLanguage || "使用者指定語言") : (langMap[targetLanguage] || targetLanguage);
      
      if (mode === "translate_only") {
        languagePrompt = `請將原文「僅直接翻譯」為 ${langName}，不要添加任何解釋性前言或後記。`;
      } else {
        languagePrompt = `整理完成會議記錄後，請將整份整理結果完整翻譯並以 ${langName} 輸出發表（若有需要，可以提供 ${langName} 的完整版本）。`;
      }
    }

    let extraPrompt = "";
    if (customInstructions && typeof customInstructions === "string" && customInstructions.trim()) {
      extraPrompt = `【特別客戶指令（必須優先遵守並調整生成風格）】：${customInstructions.trim()}`;
    }

    const finalPrompt = `
以下是需要處理的會議逐字稿/重點筆記內容：
------------------------------------
${content}
------------------------------------

請依據下列方針進行處理：
1. ${taskPrompt}
2. ${languagePrompt}
3. ${extraPrompt}

請直接回傳 Markdown 格式的整理結果，不要有額外的不相關聊天回應。
`;

    const SYSTEM_INSTRUCTION = `你是一位專業的會議記錄助理與高效秘書，擅長將冗長混亂的會議逐字稿、重點筆記或對話紀錄，整理成結構極其清晰、重點突出、便於閱讀且極具辦公室專業水準的會議記錄。

請根據使用者提供的會議逐字稿，整理出結構化的會議紀錄。
請務必遵守以下「輸出格式結構項目」（以精美 Markdown 格式輸出）：

1. **會議主題與時間**：擷取會議的主題與時間（若逐字稿中未提及，請根據上下文推論或標註「未在逐字稿中明確提及」）。
2. **與會者**：列出參與會議的人員（以條列呈現）。
3. **會議重點總結**：用 3 到 5 個重點總結會議內容（請條列式且簡明扼要）。
4. **Action Items (待辦事項)**：明確列出接下來的待辦事項與負責人（明確寫出「是誰負責什麼」）。
5. **英文翻譯版**：將上述 1~4 點的內容完整翻譯成專業的英文，並以一個獨立的主標題呈現（例如 ### English Version）。

請保持語氣專業、不誇張、實事求是。
請完全不要包含任何額外的問候語、前言或結語（例如：「好的，以下是為您整理的...」、「希望對您有幫助」等廢話都不可以出現），直接輸出 Markdown。
所有的繁體中文部分（包括上述 1~4 點、標題以及整理內容）必須使用【繁體中文（台灣，zh-TW）】回覆，不要混雜簡體字。`;

    // 呼叫 Gemini 3.5 Flash，對於基本文字摘要與翻譯，選用 'gemini-3.5-flash' 是最佳實踐
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // 降低隨機性，保證穩定且忠實於逐字稿
      }
    });

    const textResult = response.text || "無法生成結果。";
    return res.json({ result: textResult });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || "伺服器內部錯誤，請重試。" });
  }
});

// Vite & 靜態託管處理
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
