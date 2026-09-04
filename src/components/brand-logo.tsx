import Image from "next/image";
import { branded } from "@/lib/asset-version";
import { cn } from "@/lib/utils";

const RATIO = 535 / 401;

export function BrandLogo({
  className,
  height = 32,
  priority = false,
}: {
  className?: string;
  height?: number;
  priority?: boolean;
}) {
  const width = Math.round(height * RATIO);
  return (
    <Image
      src={branded("/logo-trim.png")}
      alt="DTF Studio"
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto", className)}
      style={{ height, width: "auto" }}
    />
  );
}
