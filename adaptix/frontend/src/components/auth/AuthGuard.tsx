"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // 1. Cleanup Legacy Keys (Self-Healing)
    if (localStorage.getItem("accessToken")) {
      console.log("AuthGuard: Cleaning up legacy 'accessToken'");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }

    // 2. Get Current Token
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.log("AuthGuard: No token found. Redirecting to login...");
      redirectToLogin();
      return;
    }

    // 3. Check Token Expiry
    if (isTokenExpired(token)) {
      console.log("AuthGuard: Token expired. Requesting re-login...");
      clearAuth();
      redirectToLogin();
      return;
    }

    // 4. Authorized
    setAuthorized(true);
  }, [router, pathname]);

  const redirectToLogin = () => {
    setAuthorized(false);
    const returnUrl = encodeURIComponent(pathname);
    router.push(`/login?returnUrl=${returnUrl}`);
  };

  const clearAuth = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  };

  const isTokenExpired = (token: string): boolean => {
    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return true;

      const decodedJson = JSON.parse(atob(payloadBase64));
      const exp = decodedJson.exp;

      // Check if expired (exp is in seconds, Date.now() is ms)
      if (exp && Date.now() >= exp * 1000) {
        return true;
      }
      return false;
    } catch (e) {
      console.error("AuthGuard: Failed to parse token", e);
      return true;
    }
  };

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
