import clsx from "classnames";

export default function Button({
  as: As = "button",
  variant = "primary",
  className,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "bg-transparent text-slate-900 hover:bg-slate-100",
  };
  return (
    <As className={clsx(base, styles[variant] || styles.primary, className)} {...props} />
  );
}


