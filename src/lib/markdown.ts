// Models reach for raw HTML line breaks when a thought needs two lines inside
// one table cell, because GFM has no other way to do it. Markdown renderers
// show those tags as literal text — "<br>" printed in the middle of a
// sentence — and they travel into Word, Excel and PDF the same way.
//
// So they are taken out before anything reads the answer. Inside a table row a
// real newline would end the row, so the break becomes a space; everywhere
// else it becomes the line break it was asking for.
//
// Code is left exactly as written. An answer explaining how to write a line
// break in HTML has to be able to show one.
const BREAK_TAG = /<br\s*\/?>/i;
const BREAK_TAGS = /<br\s*\/?>/gi;
const FENCE = /^\s*(```|~~~)/;
const RUN_OF_SPACES = /[ \t]{2,}/g;

function replaceOutsideCode(line: string, replacement: string, collapseSpaces = false): string {
  // Odd-numbered pieces of a backtick split are the inline code spans.
  return line
    .split("`")
    .map((piece, index) => {
      if (index % 2 === 1) return piece;
      const replaced = piece.replace(BREAK_TAGS, replacement);
      return collapseSpaces ? replaced.replace(RUN_OF_SPACES, " ") : replaced;
    })
    .join("`");
}

export function normaliseMarkdown(markdown: string): string {
  if (!BREAK_TAG.test(markdown)) return markdown;

  let inFence = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (FENCE.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.trimStart().startsWith("|")
        ? replaceOutsideCode(line, " ", true)
        : replaceOutsideCode(line, "\n");
    })
    .join("\n");
}
