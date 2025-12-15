"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Loader2,
  ArrowLeft,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { handleApiError } from "@/lib/utils/error-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get uid and token from URL
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordValues) => {
    if (!uid || !token) {
      toast.error("Invalid Link", {
        description: "Missing reset token information.",
      });
      return;
    }

    setLoading(true);
    try {
      // POST to /api/auth/password/reset/confirm/
      await api.post("/auth/password/reset/confirm/", {
        uid,
        token,
        new_password: data.password,
      });

      setSuccess(true);
      toast.success("Password Reset Successful!", {
        description: "You can now login with your new password.",
      });

      // Optional: Auto redirect after few seconds
      setTimeout(() => router.push("/login"), 3000);
    } catch (error: any) {
      handleApiError(error, form, "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <Card className="w-full max-w-md shadow-lg border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="pt-6 text-center text-red-600">
          <p>Invalid or expired password reset link.</p>
          <Button variant="link" asChild className="mt-4">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
              success
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {success ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Lock className="h-6 w-6" />
            )}
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {success ? "Password Reset Complete" : "Set New Password"}
        </CardTitle>
        <CardDescription>
          {success
            ? "Your password has been updated successfully."
            : "Please enter your new password below."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4 pt-2">
            <Button
              asChild
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Link href="/login">Continue to Login</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={loading}
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword((prev) => !prev)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-slate-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-500" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={loading}
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-slate-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-500" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      {!success && (
        <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
          <Link
            href="/login"
            className="flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to log in
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Suspense
        fallback={<Loader2 className="h-8 w-8 animate-spin text-emerald-600" />}
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
