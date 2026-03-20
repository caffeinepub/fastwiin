interface FastwiinLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function FastwiinLogo({
  size = "md",
  className = "",
}: FastwiinLogoProps) {
  const sizeClasses = {
    sm: "text-xl tracking-tight",
    md: "text-2xl tracking-tight",
    lg: "text-4xl tracking-tight",
  };

  return (
    <span
      className={`font-extrabold select-none ${sizeClasses[size]} ${className}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}
    >
      <span style={{ color: "#ffffff" }}>Fast</span>
      <span style={{ color: "#D4AF37" }}>wiin</span>
    </span>
  );
}
