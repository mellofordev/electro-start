/**
 * Build the stable RPC id used by both the webview transform and Bun loader.
 *
 * `root` should normally be absolute (both plugins resolve it), but a relative
 * root like `src/actions` is also accepted when it appears as a path suffix.
 */
export function deriveMainFnId(
  fileName: string,
  exportName: string,
  root: string,
): string {
  const normalizedFile = fileName.replaceAll("\\", "/");
  const normalizedRoot = root.replaceAll("\\", "/").replace(/\/+$/, "");
  const prefix = `${normalizedRoot}/`;

  let relative: string;
  if (normalizedFile.startsWith(prefix)) {
    relative = normalizedFile.slice(prefix.length);
  } else {
    const marker = `/${normalizedRoot}/`;
    const idx = normalizedFile.lastIndexOf(marker);
    relative =
      idx >= 0
        ? normalizedFile.slice(idx + marker.length)
        : normalizedFile.replace(/^\/+/, "");
  }

  return `${relative}:${exportName}`;
}
