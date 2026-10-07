import { CircleCheck, CircleAlert, Info, TriangleAlert, LoaderCircle, X } from "lucide-react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="vdg-notifications"
      position="top-center"
      offset={{ top: "max(20px, env(safe-area-inset-top))" }}
      mobileOffset={{
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        left: "12px",
        right: "12px",
      }}
      duration={Infinity}
      closeButton
      visibleToasts={2}
      gap={12}
      containerAriaLabel="Avisos do Vem da Gente"
      icons={{
        success: <CircleCheck aria-hidden="true" />,
        error: <CircleAlert aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        loading: <LoaderCircle aria-hidden="true" className="animate-spin" />,
        close: <X aria-hidden="true" />,
      }}
      toastOptions={{
        closeButtonAriaLabel: "Fechar aviso",
        classNames: {
          toast: "vdg-notice",
          title: "vdg-notice-title",
          description: "vdg-notice-description",
          icon: "vdg-notice-icon",
          closeButton: "vdg-notice-close",
          actionButton: "vdg-notice-action",
          cancelButton: "vdg-notice-cancel",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
