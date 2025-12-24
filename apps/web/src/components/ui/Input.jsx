import clsx from "classnames";

export default function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400",
        className,
      )}
      {...props}
    />
  );
}


