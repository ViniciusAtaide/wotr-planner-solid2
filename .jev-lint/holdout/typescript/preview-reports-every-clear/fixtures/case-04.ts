export function previewName(name: string, width: number): string {
  const trimmed = name.trim();
  return trimmed.length <= width ? trimmed : `${trimmed.slice(0, Math.max(0, width - 1))}…`;
}

export const previewThumbnail = (url: string, size: number): string => `${url}?w=${size}&h=${size}`;
