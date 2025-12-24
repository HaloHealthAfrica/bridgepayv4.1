import clsx from "classnames";

export function Card({ className, ...props }) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={clsx("p-4 border-b border-slate-100", className)} {...props} />;
}

export function CardBody({ className, ...props }) {
  return <div className={clsx("p-4", className)} {...props} />;
}


