import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
export function RouteAccessibility() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    document.getElementById("conteudo-principal")?.focus();
    setAnnouncement(`Página aberta: ${document.title}`);
  }, [pathname]);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
