/**
 * Helper formatters for Dream Journal
 */

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatRelativeDate(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // If within the last hour
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  // Same day check
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today at ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeStr}`;
  }

  if (diffDays < 7) {
    const weekday = date.toLocaleDateString([], { weekday: 'short' });
    return `${weekday} at ${timeStr}`;
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDefaultDreamTitle() {
  const now = new Date();
  const hour = now.getHours();
  let timeOfDay = 'Night';
  if (hour >= 4 && hour < 12) timeOfDay = 'Morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';

  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${timeOfDay} Dream · ${dateStr}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'dream-recording.webm';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const MOODS = [
  { id: 'mystical', label: 'Mystical', emoji: '🔮', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  { id: 'lucid', label: 'Lucid', emoji: '✨', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  { id: 'peaceful', label: 'Peaceful', emoji: '🌙', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { id: 'vivid', label: 'Vivid', emoji: '⚡', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  { id: 'flying', label: 'Flying', emoji: '🦋', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  { id: 'intense', label: 'Intense', emoji: '🌪️', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  { id: 'recurring', label: 'Recurring', emoji: '💭', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
];

export function getMoodDetails(moodId) {
  return MOODS.find((m) => m.id === moodId) || MOODS[0];
}
