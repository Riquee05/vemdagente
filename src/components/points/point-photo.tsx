import { useEffect, useState } from "react";

import fallbackPhoto from "@/assets/ponto-sem-foto.jpg";
import { resolvePhotoUrl } from "@/lib/points";
import { cn } from "@/lib/utils";

/** Exibe a foto de um ponto, com imagem acolhedora padrão quando não há foto. */
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    resolvePhotoUrl(path).then((next) => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
    };
  }, [path]);

  const src = !path || failed || !url ? fallbackPhoto : url;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("bg-surface object-cover", className)}
    />
  );
}
