import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // 簡單且極度美觀的高相容 Markdown 行解析器
  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];
  
  let inList = false;
  let listItems: string[] = [];
  let inOrderedList = false;
  let orderedListItems: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-${key}`} className="list-disc pl-6 space-y-2 mt-2 mb-4 text-neutral-300 leading-relaxed font-sans">
          {listItems.map((item, idx) => (
            <li key={`li-${idx}`}>{parseInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushOrderedList = (key: string) => {
    if (orderedListItems.length > 0) {
      renderedElements.push(
        <ol key={`ol-${key}`} className="list-decimal pl-6 space-y-2 mt-2 mb-4 text-neutral-300 leading-relaxed font-sans">
          {orderedListItems.map((item, idx) => (
            <li key={`li-ord-${idx}`}>{parseInline(item)}</li>
          ))}
        </ol>
      );
      orderedListItems = [];
      inOrderedList = false;
    }
  };

  const flushTable = (key: string) => {
    if (tableRows.length > 0 || tableHeaders.length > 0) {
      renderedElements.push(
        <div key={`table-container-${key}`} className="overflow-x-auto my-4 rounded-xl border border-neutral-800 bg-[#0d0d0f]/50">
          <table className="min-w-full divide-y divide-neutral-800 text-sm">
            {tableHeaders.length > 0 && (
              <thead className="bg-[#18181c] text-neutral-200 font-semibold">
                <tr>
                  {tableHeaders.map((header, idx) => (
                    <th key={`th-${idx}`} className="px-4 py-3 text-left font-medium text-neutral-100 border-b border-neutral-800">
                      {parseInline(header.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-neutral-900 text-neutral-300">
              {tableRows.map((row, rowIdx) => (
                <tr key={`tr-${rowIdx}`} className={rowIdx % 2 === 0 ? "bg-transparent" : "bg-neutral-900/20"}>
                  {row.map((cell, cellIdx) => (
                    <td key={`td-${cellIdx}`} className="px-4 py-3 whitespace-normal border-b border-neutral-900/50">
                      {parseInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  const flushBlockquote = (key: string) => {
    if (blockquoteLines.length > 0) {
      renderedElements.push(
        <blockquote key={`quote-${key}`} className="border-l-4 border-indigo-500 bg-indigo-950/20 text-indigo-200 px-4 py-3 my-4 rounded-r-xl italic leading-relaxed">
          {blockquoteLines.map((line, idx) => (
            <p key={`quote-p-${idx}`} className={idx > 0 ? "mt-2" : ""}>
              {parseInline(line)}
            </p>
          ))}
        </blockquote>
      );
      blockquoteLines = [];
      inBlockquote = false;
    }
  };

  // 處理行內格式：**粗體**、*斜體*、`程式碼`
  function parseInline(text: string): React.ReactNode[] {
    let parts: React.ReactNode[] = [];
    let currentText = text;
    
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const splitParts = currentText.split(regex);
    
    splitParts.forEach((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        parts.push(<strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>);
      } else if (part.startsWith("*") && part.endsWith("*")) {
        parts.push(<em key={idx} className="italic text-neutral-200">{part.slice(1, -1)}</em>);
      } else if (part.startsWith("`") && part.endsWith("`")) {
        parts.push(<code key={idx} className="px-1.5 py-0.5 bg-neutral-800 text-rose-400 rounded font-mono text-xs border border-neutral-700">{part.slice(1, -1)}</code>);
      } else {
        parts.push(part);
      }
    });

    return parts.length > 0 ? parts : [text];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const key = `${i}`;

    // 1. 處理表格
    if (trimmed.startsWith("|")) {
      flushList(key);
      flushOrderedList(key);
      flushBlockquote(key);

      inTable = true;
      const cells = trimmed.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      if (cells.every(cell => cell.startsWith("-") || cell.match(/^:?-+:?$/))) {
        continue;
      }

      if (tableHeaders.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(key);
    }

    // 2. 處理引用
    if (trimmed.startsWith(">")) {
      flushList(key);
      flushOrderedList(key);
      inBlockquote = true;
      blockquoteLines.push(trimmed.slice(1).trim());
      continue;
    } else if (inBlockquote && !trimmed.startsWith(">") && trimmed !== "") {
      blockquoteLines.push(trimmed);
      continue;
    } else if (inBlockquote && trimmed === "") {
      flushBlockquote(key);
    }

    // 3. 處理無序列表
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushOrderedList(key);
      inList = true;
      listItems.push(trimmed.substring(2));
      continue;
    } else if (inList && !trimmed.startsWith("- ") && !trimmed.startsWith("* ") && trimmed !== "") {
      if (listItems.length > 0) {
        listItems[listItems.length - 1] += "\n" + trimmed;
      } else {
        listItems.push(trimmed);
      }
      continue;
    } else if (inList && trimmed === "") {
      flushList(key);
    }

    // 4. 處理有序列表
    const olMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (olMatch) {
      flushList(key);
      inOrderedList = true;
      orderedListItems.push(olMatch[2]);
      continue;
    } else if (inOrderedList && !trimmed.match(/^(\d+)\.\s/) && trimmed !== "") {
      if (orderedListItems.length > 0) {
        orderedListItems[orderedListItems.length - 1] += "\n" + trimmed;
      } else {
        orderedListItems.push(trimmed);
      }
      continue;
    } else if (inOrderedList && trimmed === "") {
      flushOrderedList(key);
    }

    // 5. 處理標題
    if (trimmed.startsWith("#")) {
      flushList(key);
      flushOrderedList(key);
      flushBlockquote(key);

      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const text = trimmed.replace(/^#+\s*/, "");
      
      if (level === 1) {
        renderedElements.push(<h1 key={key} className="text-2xl font-bold text-white border-b border-neutral-800 pb-2 mt-6 mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-indigo-500 rounded-full inline-block"></span>{parseInline(text)}</h1>);
      } else if (level === 2) {
        renderedElements.push(<h2 key={key} className="text-xl font-bold text-indigo-400 border-b border-neutral-800 pb-1.5 mt-5 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 bg-indigo-500/80 rounded-full inline-block"></span>{parseInline(text)}</h2>);
      } else if (level === 3) {
        renderedElements.push(<h3 key={key} className="text-lg font-bold text-slate-200 mt-4 mb-2">{parseInline(text)}</h3>);
      } else {
        renderedElements.push(<h4 key={key} className="text-base font-semibold text-slate-300 mt-3 mb-1.5">{parseInline(text)}</h4>);
      }
      continue;
    }

    // 6. 處理分割線
    if (trimmed === "---" || trimmed === "***") {
      flushList(key);
      flushOrderedList(key);
      flushBlockquote(key);
      renderedElements.push(<hr key={key} className="my-6 border-neutral-800" />);
      continue;
    }

    // 7. 處理一般段落
    if (trimmed !== "") {
      flushList(key);
      flushOrderedList(key);
      flushBlockquote(key);
      renderedElements.push(
        <p key={key} className="text-neutral-300 leading-relaxed mb-4 text-base font-sans">
          {parseInline(trimmed)}
        </p>
      );
    } else {
      flushList(key);
      flushOrderedList(key);
      flushBlockquote(key);
    }
  }

  // 結尾清除殘留的區塊
  const endKey = "end";
  flushList(endKey);
  flushOrderedList(endKey);
  flushTable(endKey);
  flushBlockquote(endKey);

  return <div className="markdown-body space-y-1">{renderedElements}</div>;
}
