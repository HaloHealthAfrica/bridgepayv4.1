import { Link } from "react-router-dom";

export const QuickActions = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Link
        to="/wallet/add"
        className="rounded-card bg-surface border border-gray-200 p-5 hover:border-primary hover:text-primary transition"
      >
        <div className="font-bold">Add Money</div>
        <div className="text-sm text-text-secondary mt-1">M-Pesa or Card</div>
      </Link>
      <div className="rounded-card bg-surface border border-gray-200 p-5 opacity-70">
        <div className="font-bold">Send Money</div>
        <div className="text-sm text-text-secondary mt-1">Coming next</div>
      </div>
    </div>
  );
};


