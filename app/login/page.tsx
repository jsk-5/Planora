import { LoginForm } from "../../components/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Trip Planner",
  description: "Login to your Trip Planner account",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Trip Planner
          </h1>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Plan trips and coordinate availability with friends and family
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
