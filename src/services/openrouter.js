/**
 * OpenRouter integration for Dream Journal.
 * Runs entirely client-side using the user's own OpenRouter API key
 * (stored locally, see SettingsModal) — there is no backend for this app.
 */

const API_KEY_STORAGE_KEY = 'dream_openrouter_api_key';

const TRANSCRIPTION_URL = 'https://openrouter.ai/api/v1/audio/transcriptions';
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const IMAGES_URL = 'https://openrouter.ai/api/v1/images';

const TRANSCRIPTION_MODEL = 'openai/gpt-transcribe';
const ILLUSTRATION_PROMPT_MODEL = '~openai/gpt-luna-latest';
const ILLUSTRATION_IMAGE_MODEL = 'openai/gpt-image-2.5-sunburst';

export function getApiKey() {
  return (localStorage.getItem(API_KEY_STORAGE_KEY) || '').trim();
}

export function hasApiKey() {
  return getApiKey().length > 0;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result || '';
      const commaIndex = dataUrl.indexOf(',');
      resolve(commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, mimeType = 'image/png') {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

const ILLUSTRATION_WEBP_QUALITY = 0.82;

/**
 * Re-encode a generated illustration (PNG/JPEG) as WebP client-side to keep
 * on-device storage small. Falls back to the original blob if the browser's
 * canvas can't produce WebP (canvas.toBlob silently returns PNG in that case).
 */
function convertBlobToWebp(blob, quality = ILLUSTRATION_WEBP_QUALITY) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (result) => {
          URL.revokeObjectURL(objectUrl);
          resolve(result || blob);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load generated illustration for WebP conversion'));
    };

    img.src = objectUrl;
  });
}

// Maps our MediaRecorder mimeType to the `format` field the transcription
// endpoint expects (it doesn't accept full mime strings like "audio/webm;codecs=opus").
function audioFormatFromMimeType(mimeType = '') {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

async function callOpenRouter(url, body) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Add your OpenRouter API key in Settings to use AI features.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter request failed (${response.status}): ${errorText || response.statusText}`);
  }

  return response.json();
}

/**
 * Transcribe a recorded dream memo to text.
 */
export async function transcribeDreamAudio(audioBlob, mimeType) {
  const base64Audio = await blobToBase64(audioBlob);
  const data = await callOpenRouter(TRANSCRIPTION_URL, {
    model: TRANSCRIPTION_MODEL,
    input_audio: {
      data: base64Audio,
      format: audioFormatFromMimeType(mimeType)
    }
  });

  const text = (data.text || '').trim();
  if (!text) {
    throw new Error('Transcription came back empty. Try again, or check your audio.');
  }
  return text;
}

/**
 * Turn a dream's transcript/notes into a short, vivid image-generation prompt.
 */
export async function generateIllustrationPrompt(dreamText) {
  const trimmed = (dreamText || '').trim();
  if (!trimmed) {
    throw new Error('Transcribe the dream (or add notes) before generating an illustration.');
  }

  const data = await callOpenRouter(CHAT_URL, {
    model: ILLUSTRATION_PROMPT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You convert dream journal entries into a single vivid, concise text-to-image prompt ' +
          '(under 60 words) describing a surreal, atmospheric illustrated scene capturing the dream\'s ' +
          'key imagery and mood. Reply with only the prompt itself — no preamble, labels, or quotes.'
      },
      { role: 'user', content: trimmed.slice(0, 4000) }
    ]
  });

  const prompt = data.choices?.[0]?.message?.content?.trim();
  if (!prompt) {
    throw new Error('Could not generate an illustration prompt from this dream.');
  }
  return prompt;
}

/**
 * Generate a dream illustration from a prompt, returned as a WebP Blob ready
 * to store in IndexedDB alongside the dream (mirrors how audioBlob is stored).
 * Requests the cheapest "low" quality tier at 1024x1024, then re-encodes the
 * result as WebP client-side since the API only returns PNG/JPEG.
 */
export async function generateDreamIllustration(prompt) {
  const data = await callOpenRouter(IMAGES_URL, {
    model: ILLUSTRATION_IMAGE_MODEL,
    prompt,
    quality: 'low',
    size: '1024x1024'
  });

  const item = data.data?.[0];
  if (!item) {
    throw new Error('No illustration was returned.');
  }

  let rawBlob;
  if (item.b64_json) {
    rawBlob = base64ToBlob(item.b64_json, 'image/png');
  } else if (item.url) {
    const imageResponse = await fetch(item.url);
    rawBlob = await imageResponse.blob();
  } else {
    throw new Error('Illustration response did not include image data.');
  }

  try {
    return await convertBlobToWebp(rawBlob);
  } catch (err) {
    console.warn('WebP conversion failed, storing original image format:', err);
    return rawBlob;
  }
}

/**
 * Convenience helper: transcript/notes -> illustration prompt -> illustration blob.
 */
export async function illustrateDream(dreamText) {
  const prompt = await generateIllustrationPrompt(dreamText);
  const imageBlob = await generateDreamIllustration(prompt);
  return { prompt, imageBlob };
}
