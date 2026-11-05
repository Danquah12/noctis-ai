/**
 * Universal RFC-compliant Unified Diff generator for Noctis
 * Client-safe and server-safe (zero Node built-in dependencies).
 */

export function generateUnifiedDiff(filename: string, originalCode: string, patchedCode: string): string {
  const oldLines = originalCode.split("\n");
  const newLines = patchedCode.split("\n");

  const diffHeader = [
    `diff --git a/${filename} b/${filename}`,
    `--- a/${filename}`,
    `+++ b/${filename}`,
    `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
  ];

  const diffBody: string[] = [];

  let i = 0;
  let j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffBody.push(` ${oldLines[i]}`);
      i++;
      j++;
    } else {
      if (i < oldLines.length && (!newLines.slice(j, j + 4).includes(oldLines[i]) || j >= newLines.length)) {
        diffBody.push(`-${oldLines[i]}`);
        i++;
      } else if (j < newLines.length) {
        diffBody.push(`+${newLines[j]}`);
        j++;
      }
    }
  }

  return [...diffHeader, ...diffBody].join("\n");
}
