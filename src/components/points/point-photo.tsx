import { useEffect, useState } from "react";

import { resolvePhotoUrl } from "@/lib/points";
import { cn } from "@/lib/utils";

/** Exibe a foto de um ponto resolvendo a URL assinada do storage. */
export function PointPhoto({
  path,
  alt,
  className,
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    resolvePhotoUrl(path).then((next) => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
    };
  }, [path]);

  if (!path || !url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface text-xs text-muted-foreground",
          className,
        )}
        aria-hidden
      >
        sem foto
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
