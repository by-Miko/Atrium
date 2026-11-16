import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

interface ImageLightboxProps {
  imageUrl: string | null;
  altText?: string;
  closeLabel: string;
  onClose: () => void;
}

export function ImageLightbox({
  imageUrl,
  altText = '',
  closeLabel,
  onClose,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!imageUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [imageUrl, onClose]);

  return (
    <AnimatePresence>
      {imageUrl ? (
        <motion.div
          key="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={closeLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="fixed top-5 left-5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/90 backdrop-blur-xl transition-colors hover:border-white/35 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <motion.img
            src={imageUrl}
            alt={altText}
            referrerPolicy="no-referrer"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.85)] select-none"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
