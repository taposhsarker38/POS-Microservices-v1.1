"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing"; import { useSearchParams } from "next/navigation";
import { Loader } from "@/components/ui/loader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await api.get(`/auth/verify-email/?token=${token}`);

        if (response.data.status === "success") {
          setStatus("success");
          setMessage("Email verified successfully!");
          toast.success("Email verified!", {
            description: "You can now log in to your account.",
          });
        } else {
          setStatus("error");
          setMessage(response.data.message || "Verification failed.");
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.response?.data?.message || "Invalid or expired token."
        );
        toast.error("Verification failed", {
          description: "Please try requesting a new verification email.",
        });
      }
    };

    verifyEmail();
  }, [token]);

  if (status === "loading") {
    return <Loader fullScreen text="Verifying your email..." />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            {status === "success" ? (
              <CheckCircle2 className="h-16 w-16 text-emerald-600" />
            ) : (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === "success" ? "Email Verified!" : "Verification Failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {status === "success" ? (
            <Button
              onClick={() => router.push("/login")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Go to Login
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
