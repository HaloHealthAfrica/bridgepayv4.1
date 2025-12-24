import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SignInPage() {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const error = params.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="text-2xl font-semibold text-slate-900">Sign in</div>
          <div className="text-sm text-slate-600">
            Use your Bridge account to access the dashboard.
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <form method="POST" action="/api/auth/login" className="space-y-3">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Email</div>
            <Input name="email" type="email" required placeholder="you@company.com" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Password</div>
            <Input name="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-4 text-sm text-slate-600">
          New here?{" "}
          <a className="text-slate-900 underline" href="/account/signup">
            Create an account
          </a>
        </div>
      </div>
    </div>
  );
}


