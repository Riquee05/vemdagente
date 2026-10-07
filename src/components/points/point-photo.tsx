import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import fallbackPhoto from "@/assets/ponto-sem-foto.jpg";
import { getAdminPointPhotoUrl, getPublishedPointPhotoUrl } from "@/lib/point-photos.functions";
import { cn } from "@/lib/utils";
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
  const getPublic = useServerFn(getPublishedPointPhotoUrl);
  const getAdmin = useServerFn(getAdminPointPhotoUrl);
  const ref = useRef<HTMLImageElement>(null);
  const [nearby, setNearby] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setNearby(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearby(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const remote = Boolean(path && /^https?:\/\//i.test(path));
  const photo = useQuery({
    queryKey: ["point-photo", adminAccess ? "admin" : "public", path],
    enabled: nearby && Boolean(path) && !remote,
    queryFn: () => (adminAccess ? getAdmin : getPublic)({ data: { path: path! } }),
    staleTime: 45 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    retry: false,
  });
  const url = nearby ? (remote ? path : photo.data?.url) : null;
  useEffect(() => setFailed(false), [path, url]);
  return (
    <img
      ref={ref}
      src={failed || !url ? fallbackPhoto : url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("bg-surface object-cover", className)}
    />
  );
}
