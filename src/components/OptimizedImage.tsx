import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
}

export function OptimizedImage({ src, alt, fallbackSrc, className = '', ...props }: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Lazy loading with Intersection Observer
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView && !imageSrc) return;

    setIsLoading(true);
    setHasError(false);

    // If it's a Supabase storage URL, ensure it's public
    let processedSrc = src;
    if (src.includes('supabase.co/storage')) {
      // Extract bucket and path from URL
      const urlParts = src.split('/storage/v1/object/public/');
      if (urlParts.length === 2) {
        const [bucket, ...pathParts] = urlParts[1].split('/');
        const path = pathParts.join('/');
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        processedSrc = data.publicUrl;
      }
    }

    const img = new Image();
    img.onload = () => {
      setImageSrc(processedSrc);
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
    };
    img.src = processedSrc;
  }, [src, isInView, imageSrc]);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-xl ${className}`}
        {...(props.style ? { style: props.style } : {})}
      >
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{alt || 'תמונה לא זמינה'}</p>
        </div>
      </div>
    );
  }

  if (!imageSrc && isLoading) {
    return (
      <div
        ref={imgRef}
        className={`bg-muted animate-pulse rounded-xl ${className}`}
        {...(props.style ? { style: props.style } : {})}
      />
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc || fallbackSrc || src}
      alt={alt}
      className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
