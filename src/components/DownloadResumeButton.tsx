"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { META } from "@/constants/data";

interface DownloadResumeButtonProps {
  variant?: "download" | "default" | "hero" | "outline";
  size?: "default" | "sm" | "lg" | "xl" | "icon";
  className?: string;
}

const DownloadResumeButton = ({
  variant = "download",
  size = "xl",
  className = "",
}: DownloadResumeButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = useCallback(async () => {
    try {
      setIsGenerating(true);

      // Dynamically import @react-pdf/renderer and ResumePDF to avoid SSR issues
      const [{ pdf }, { default: ResumePDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ResumePDF"),
      ]);

      // Generate PDF blob
      const doc = <ResumePDF />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = META.resumeFileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast.success(`${META.documentType} downloaded successfully!`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(`Failed to generate ${META.documentType.toLowerCase()}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isGenerating}
      className={`group ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
          Download {META.documentType}
        </>
      )}
    </Button>
  );
};

export default DownloadResumeButton;
