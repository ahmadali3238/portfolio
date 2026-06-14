import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-left"
      richColors
      expand
      closeButton
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-elegant group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:backdrop-blur-sm",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          success:
            "group-[.toaster]:border-green-500/30 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-background group-[.toaster]:to-background",
          error:
            "group-[.toaster]:border-red-500/30 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-background group-[.toaster]:to-background",
          info: "group-[.toaster]:border-blue-500/30 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-background group-[.toaster]:to-background",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
