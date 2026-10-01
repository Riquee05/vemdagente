import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import fallbackPhoto from "@/assets/ponto-sem-foto.jpg";
import { getAdminPointPhotoUrl, getPublishedPointPhotoUrl } from "@/lib/point-photos.functions";
import { cn } from "@/lib/utils";

/** Exibe a foto de um ponto, com imagem acolhedora padrão quando não há foto. */
export function PointPhoto({
  path,
  alt,
  className,
  adminAccess = false,
}: {
  path: string | null;
  alt: string;
  className?: string;
  adminAccess?: boolean;
}) {
  const getPublicUrl = useServerFn(getPublishedPointPhotoUrl);
  const getAdminUrl = useServerFn(getAdminPointPhotoUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    if (!path) return () => { active = false; };
    if (path.startsWith("http")) {
      setUrl(path);
      return () => { active = false; };
    }
    const resolve = adminAccess ? getAdminUrl : getPublicUrl;
    resolve({ data: { path } })
      .then((result) => {
        if (active) setUrl(result.url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [adminAccess, getAdminUrl, getPublicUrl, path]);

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
