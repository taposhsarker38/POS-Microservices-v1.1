"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const redirectToLogin = (reason: string) => {
    console.warn("AuthGuard Redirect:", reason);
    // DEBUG MODE: Uncomment next line to see error on screen instead of redirect
    // setErrorInfo(reason); return;

    // For now, let's show the error for 5 seconds then redirect
    setErrorInfo(reason);
    setTimeout(() => {
      setAuthorized(false);
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?returnUrl=${returnUrl}`);
    }, 5000);
  };

  const isTokenExpired = (token: string): string | null => {
    try {
      if (!token) return "Token missing";
      const decoded: any = jwtDecode(token);
      const exp = decoded.exp;

      if (!exp) return "Token missing 'exp' claim";

      if (Date.now() >= exp * 1000) {
        return `Token expired at ${new Date(exp * 1000).toLocaleString()}`;
      }
      return null; // Valid
    } catch (e: any) {
      return `Token parse failed: ${e.message}`;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      redirectToLogin("No token found in localStorage");
      return;
    }

    const expiryError = isTokenExpired(token);
    if (expiryError) {
      localStorage.removeItem("access_token");
      redirectToLogin(expiryError);
      return;
    }

    setAuthorized(true);
  }, []);

  if (errorInfo) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-red-50 p-4">
        <h2 className="text-xl font-bold text-red-600 mb-2">Session Error</h2>
        <p className="text-red-800 bg-red-100 p-4 rounded border border-red-200">
          {errorInfo}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Redirecting to login in 5 seconds...
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
