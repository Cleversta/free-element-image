"use client";
import { useEffect, useState } from "react";

export default function ProjectPreview({ blob }: { blob?: Blob }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url ? (
    <img src={url} alt="" decoding="async" />
  ) : (
    <div className="projectPreviewEmpty">Scene preview unavailable</div>
  );
}
