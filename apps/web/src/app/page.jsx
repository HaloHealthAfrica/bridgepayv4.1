import { useEffect } from "react";
import useUser from "@/utils/useUser";

export default function HomePage() {
  const { data: user, loading: userLoading } = useUser();

  // Redirect signed-in users to dashboard
  useEffect(() => {
    if (!userLoading && user) {
      window.location.href = "/dashboard";
    }
  }, [user, userLoading]);

  if (userLoading) {
    return (
      <div
        className="font-inter min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(40deg, #F9F6ED 0%, #F0F0F8 50%, #E7E9FB 100%)",
        }}
      >
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="font-inter min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(40deg, #F9F6ED 0%, #F0F0F8 50%, #E7E9FB 100%)",
      }}
    >
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">
          Bridge MVP v3
        </h1>
        <p className="text-slate-600 mb-8 text-lg">
          Welcome to the Bridge MVP platform. Please sign in or create an
          account to continue.
        </p>
        <div className="space-y-4">
          <a
            href="/account/signin"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 w-full justify-center"
          >
            Sign In
          </a>
          <a
            href="/account/signup"
            className="inline-flex items-center px-6 py-3 border border-slate-300 text-base font-medium rounded-lg shadow-sm text-slate-900 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 w-full justify-center"
          >
            Create Account
          </a>
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
