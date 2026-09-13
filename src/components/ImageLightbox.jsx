import { useEffect } from 'preact/hooks';

export function ImageLightbox({ imageUrl, alt = '', onClose }) {
  useEffect(() => {
    if (!imageUrl) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      class="lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Full-size dream illustration"
    >
      <button
        type="button"
        class="lightbox-close-btn"
        onClick={onClose}
        aria-label="Close full-size image"
      >
        ✕
      </button>
      <img
        src={imageUrl}
        alt={alt}
        class="lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
