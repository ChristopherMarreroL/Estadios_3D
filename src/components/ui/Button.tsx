import type { ButtonHTMLAttributes, ReactNode } from "react";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles = {
    primary:
      "bg-[#f6cc7c] text-[#071323] hover:bg-[#ffe2a7] shadow-[0_10px_35px_rgba(246,204,124,.18)]",
    secondary: "border border-white/20 bg-white/8 text-white hover:bg-white/14",
    ghost: "text-[#b6c2d1] hover:bg-white/8 hover:text-white",
  };
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
