"use client";

import { marked, type Tokens } from "marked";

import { normaliseMarkdown } from "@/lib/markdown";

// Taking an answer out of the chat window and into the places this work
// actually lives: a Word file to send to a board, a PDF to attach, a
// spreadsheet to keep working in.
//
// The heavy writers are imported only when someone clicks, so the chat itself
// stays light for everyone who never exports anything.

function safeFilename(text: string): string {
  // Table rows are skipped: a filename made of column headings reads like
  // noise. Prose comes first, the generic name when there is none.
  const firstLine = text
    .split("\n")
    .filter((l) => !l.trim().startsWith("|"))
    .map((l) => l.replace(/[#*_`>-]/g, "").trim())
    .find((l) => l.length > 8);
  const base = (firstLine ?? "AccessAI2 response").slice(0, 60).replace(/[^\w\s-]/g, "").trim();
  return (base || "AccessAI2 response").replace(/\s+/g, "-");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before the handle goes.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------- Word ----

type Inline = { text: string; bold?: boolean; italics?: boolean };

// Markdown's inline tokens flatten into runs of styled text, which is all a
// Word paragraph is underneath.
function inlineRuns(tokens: Tokens.Generic[] | undefined, inherited: Inline = { text: "" }): Inline[] {
  if (!tokens) return [];
  const runs: Inline[] = [];
  for (const token of tokens) {
    const t = token as Tokens.Generic & { tokens?: Tokens.Generic[]; text?: string };
    switch (t.type) {
      case "strong":
        runs.push(...inlineRuns(t.tokens, { ...inherited, bold: true }));
        break;
      case "em":
        runs.push(...inlineRuns(t.tokens, { ...inherited, italics: true }));
        break;
      case "codespan":
      case "text":
      case "escape":
        if (t.tokens?.length) runs.push(...inlineRuns(t.tokens, inherited));
        else runs.push({ ...inherited, text: t.text ?? "" });
        break;
      case "link": {
        const link = t as unknown as Tokens.Link;
        runs.push({ ...inherited, text: link.text });
        break;
      }
      case "br":
        runs.push({ ...inherited, text: "\n" });
        break;
      default:
        if (t.tokens?.length) runs.push(...inlineRuns(t.tokens, inherited));
        else if (t.text) runs.push({ ...inherited, text: t.text });
    }
  }
  return runs;
}

export async function downloadAsWord(markdown: string) {
  markdown = normaliseMarkdown(markdown);
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } =
    await import("docx");

  const runsFor = (tokens: Tokens.Generic[] | undefined, text?: string) => {
    const runs = inlineRuns(tokens);
    const resolved = runs.length ? runs : [{ text: text ?? "" }];
    return resolved.map((r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italics }));
  };

  const headingFor = (depth: number) =>
    depth === 1 ? HeadingLevel.HEADING_1 : depth === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  for (const token of marked.lexer(markdown)) {
    switch (token.type) {
      case "heading":
        children.push(
          new Paragraph({
            heading: headingFor(token.depth),
            children: runsFor(token.tokens, token.text),
            spacing: { before: 240, after: 120 },
          }),
        );
        break;

      case "paragraph":
        children.push(
          new Paragraph({ children: runsFor(token.tokens, token.text), spacing: { after: 160 } }),
        );
        break;

      case "list":
        for (const item of token.items) {
          children.push(
            new Paragraph({
              children: runsFor(item.tokens, item.text),
              bullet: token.ordered ? undefined : { level: 0 },
              numbering: token.ordered ? { reference: "ordered", level: 0 } : undefined,
              spacing: { after: 80 },
            }),
          );
        }
        break;

      case "table": {
        const table = token as Tokens.Table;
        const headerRow = new TableRow({
          children: table.header.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph({ children: runsFor(cell.tokens, cell.text) })],
                shading: { fill: "F5F7FB" },
              }),
          ),
          tableHeader: true,
        });
        const bodyRows = table.rows.map(
          (row) =>
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [new Paragraph({ children: runsFor(cell.tokens, cell.text) })],
                  }),
              ),
            }),
        );
        children.push(
          new Table({ rows: [headerRow, ...bodyRows], width: { size: 100, type: WidthType.PERCENTAGE } }),
        );
        children.push(new Paragraph({ text: "", spacing: { after: 160 } }));
        break;
      }

      case "code":
        children.push(
          new Paragraph({
            children: [new TextRun({ text: token.text, font: "Consolas", size: 20 })],
            spacing: { after: 160 },
          }),
        );
        break;

      case "blockquote":
        children.push(
          new Paragraph({
            children: [new TextRun({ text: token.raw.replace(/^>\s?/gm, "").trim(), italics: true })],
            indent: { left: 400 },
            spacing: { after: 160 },
          }),
        );
        break;

      case "hr":
        children.push(new Paragraph({ text: "", border: { bottom: { style: "single", size: 6, color: "DDDDDD" } } }));
        break;

      default:
        break;
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "ordered",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "left" }],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [{ children: children.length ? children : [new Paragraph({ text: markdown })] }],
  });

  triggerDownload(await Packer.toBlob(doc), `${safeFilename(markdown)}.docx`);
}

// ----------------------------------------------------------------- PDF ----

// The browser's own print pipeline produces the PDF: no extra library, and
// the result matches what the person gets when they print anything else.
// Separated from printAsPdf so the document itself can be inspected without
// opening a print dialog.
export function buildPrintableHtml(markdown: string): string {
  markdown = normaliseMarkdown(markdown);
  const html = marked.parse(markdown, { async: false, gfm: true, breaks: true });
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${safeFilename(markdown)}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: Calibri, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11.5pt; line-height: 1.55; color: #16181d; }
  h1, h2, h3 { color: #00124a; margin: 1.1em 0 .4em; line-height: 1.25; }
  h1 { font-size: 19pt; } h2 { font-size: 15pt; } h3 { font-size: 13pt; }
  table { border-collapse: collapse; width: 100%; margin: .8em 0; font-size: 10.5pt; }
  th, td { border: 1px solid #d9dfeb; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #f5f7fb; }
  code { font-family: Consolas, monospace; font-size: 10pt; background: #f5f7fb; padding: 1px 4px; }
  pre { background: #f5f7fb; padding: 10px; overflow-x: auto; }
  blockquote { margin: .8em 0; padding-left: 12px; border-left: 3px solid #00b09b; color: #45506b; }
  ul, ol { padding-left: 22px; }
  footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e8f0; font-size: 8.5pt; color: #8a93a6; }
</style></head>
<body>${html}
<footer>Generated with AccessAI2 — AI-generated content, verify before relying on it.</footer>
</body></html>`;
}

export function printAsPdf(markdown: string) {
  markdown = normaliseMarkdown(markdown);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(buildPrintableHtml(markdown));
  doc.close();

  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // Safari and Firefox finish printing asynchronously; removing the frame
    // immediately would cancel the dialog.
    setTimeout(() => frame.remove(), 60_000);
  };

  if (frame.contentWindow?.document.readyState === "complete") run();
  else frame.onload = run;
}

// --------------------------------------------------------------- Excel ----

export type ParsedTable = { header: string[]; rows: string[][] };

// A cell's raw text still carries its markdown, so a bold heading would land
// in the spreadsheet as literal asterisks. Word and PDF render those markers;
// a cell has no formatting to render them into, so they are flattened away.
function plainCell(cell: Tokens.TableCell): string {
  const runs = inlineRuns(cell.tokens);
  return runs.length ? runs.map((r) => r.text).join("") : cell.text;
}

export function extractTables(markdown: string): ParsedTable[] {
  markdown = normaliseMarkdown(markdown);
  const tables: ParsedTable[] = [];
  for (const token of marked.lexer(markdown)) {
    if (token.type !== "table") continue;
    const table = token as Tokens.Table;
    tables.push({
      header: table.header.map(plainCell),
      rows: table.rows.map((row) => row.map(plainCell)),
    });
  }
  return tables;
}

export function hasTable(markdown: string): boolean {
  markdown = normaliseMarkdown(markdown);
  return extractTables(markdown).length > 0;
}

// Numbers typed into a table are still numbers: writing them as text would
// leave the recipient unable to sum a column, which is the whole point of
// asking for a spreadsheet.
function cellValue(raw: string): string | number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "—") return raw;
  const asNumber = Number(cleaned);
  return Number.isFinite(asNumber) && /\d/.test(cleaned) ? asNumber : raw;
}

export async function downloadTablesAsExcel(markdown: string) {
  markdown = normaliseMarkdown(markdown);
  const tables = extractTables(markdown);
  if (tables.length === 0) return false;

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AccessAI2";
  workbook.created = new Date();

  tables.forEach((table, index) => {
    const sheet = workbook.addWorksheet(tables.length === 1 ? "Table" : `Table ${index + 1}`);
    sheet.addRow(table.header);
    table.rows.forEach((row) => sheet.addRow(row.map(cellValue)));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00124A" } };
    headerRow.alignment = { vertical: "middle" };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    sheet.columns.forEach((column, columnIndex) => {
      const longest = [table.header[columnIndex] ?? "", ...table.rows.map((r) => r[columnIndex] ?? "")].reduce(
        (max, value) => Math.max(max, String(value).length),
        10,
      );
      column.width = Math.min(longest + 2, 60);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${safeFilename(markdown)}.xlsx`,
  );
  return true;
}
