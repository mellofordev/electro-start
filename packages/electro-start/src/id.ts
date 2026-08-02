/**
 * Build the stable RPC id used by both the webview transform and Bun loader.
 */
export function deriveMainFnId(
  fileName: string,
  exportName: string,
  root: string,
): string {
  const normalizedFile = fileName.replaceAll("\\", "/");
  const normalizedRoot = root.replaceAll("\\", "/").replace(/\/+$/, "");
  const prefix = `${normalizedRoot}/`;
  const relative = normalizedFile.startsWith(prefix)
    ? normalizedFile.slice(prefix.length)
    : normalizedFile.replace(/^\/+/, "");
  return `${relative}:${exportName}`;
}
