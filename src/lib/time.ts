export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 5) return 'agora';
  if (seconds < 60) return `${seconds}s atras`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atras`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;

  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}
