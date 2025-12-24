import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SignUpPage() {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const error = params.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="text-2xl font-semibold text-slate-900">
            Create account
          </div>
          <div className="text-sm text-slate-600">
            Sign up to start using Bridge.
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <form method="POST" action="/api/auth/signup" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-medium text-slate-700 mb-1">
                First name
              </div>
              <Input name="firstName" required placeholder="Edwin" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700 mb-1">
                Last name
              </div>
              <Input name="lastName" required placeholder="Doe" />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Email</div>
            <Input name="email" type="email" required placeholder="you@company.com" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">
              Password
            </div>
            <Input name="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>

        <div className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <a className="text-slate-900 underline" href="/account/signin">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}


