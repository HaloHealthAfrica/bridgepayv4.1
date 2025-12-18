import { useState } from "react";
import useAuth from "@/utils/useAuth";

export default function LogoutPage() {
  const [loading, setLoading] = useState(false);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut({
        callbackUrl: "/account/signin",
        redirect: true,
      });
    } catch (error) {
      console.error("Sign out error:", error);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div
      className="font-inter min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(40deg, #F9F6ED 0%, #F0F0F8 50%, #E7E9FB 100%)",
      }}
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
          Sign Out
        </h1>

        <div className="text-center mb-8">
          <p className="text-slate-600 text-[15px]">
            Are you sure you want to sign out of your account?
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-50 text-[15px] font-medium transition-colors"
          >
            {loading ? "Signing out..." : "Sign Out"}
          </button>

          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full bg-slate-100 text-slate-900 py-2 px-4 rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 text-[15px] font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx global>{`
        .font-inter {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
    </div>
  );
}
