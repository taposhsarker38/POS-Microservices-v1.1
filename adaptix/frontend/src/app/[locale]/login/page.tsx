"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "sonner"; // Use Sonner for toasts

import api from "@/lib/api";
import { handleApiError } from "@/lib/utils/error-handler"; // Our new utility
import { loginSchema, LoginFormValues } from "@/lib/schemas/auth"; // Enterprise Reuse
import { Loader } from "@/components/ui/loader"; // Enterprise Reuse
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

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false); // Start with false to prevent hydration error
  const [isMounted, setIsMounted] = useState(false); // Track if component is mounted
  const [errorMessage, setErrorMessage] = useState(""); // For inline error display

  // 1. Check if component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);

    // Restore error message from sessionStorage if exists (for hot reload persistence)
    if (typeof window !== "undefined") {
      const savedError = sessionStorage.getItem("login_error");
      if (savedError) {
        setErrorMessage(savedError);
        // Clear after 15 seconds
        setTimeout(() => {
          sessionStorage.removeItem("login_error");
          setErrorMessage("");
        }, 15000);
      }
    }
  }, []);

  // 2. Auth Check on Mount - Only run on client side after mount
  useEffect(() => {
    if (!isMounted) return; // Don't run on server

    setIsCheckingAuth(true);
    const token = localStorage.getItem("access_token");
    if (token) {
      // If token exists, redirect immediately
      router.push("/dashboard");
    } else {
      // No token, safe to show login form
      setIsCheckingAuth(false);
    }
  }, [isMounted, router]);

  // 3. Initialize Hook Form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // 4. Handle Submission
  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMessage(""); // Clear previous errors
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("login_error"); // Clear saved error
    }

    try {
      // Clear previous toasts
      toast.dismiss();

      const response = await api.post("/auth/login/", data);

      // Adaptix Backend Wrapper: response.data = { status, data: { access, refresh } }
      const payload = response.data.data;

      // Store tokens
      localStorage.setItem("access_token", payload.access);
      localStorage.setItem("refresh_token", payload.refresh);

      // Success Message (Best Practice: Toast)
      toast.success("Welcome back!", {
        description: "Login successful. Redirecting...",
      });

      // Redirect
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login Error:", error);

      const responseData = error.response?.data;
      let errMsg = "Login failed. Please try again.";

      if (responseData) {
        // Use backend's message directly
        if (responseData.message) {
          errMsg = responseData.message;
        }

        if (responseData.errors) {
          const errors = responseData.errors;

          // Username not found
          if (errors.username) {
            errMsg = errors.username; // "No account found with this username"
            setErrorMessage(errMsg);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("login_error", errMsg);
            }
            toast.error("User Not Found", {
              description: errMsg,
              duration: 10000,
            });
            return;
          }

          // Wrong password
          if (errors.password) {
            errMsg = errors.password; // "Incorrect password. Please try again."
            setErrorMessage(errMsg);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("login_error", errMsg);
            }
            toast.error("Wrong Password", {
              description: errMsg,
              duration: 10000,
            });
            return;
          }

          // Email not verified
          if (errors.email_verified) {
            errMsg = errors.email_verified;
            setErrorMessage(errMsg);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("login_error", errMsg);
            }
            toast.error("Email Not Verified", {
              description: errMsg,
              duration: 10000,
            });
            return;
          }

          // Account disabled
          if (errors.account) {
            errMsg = errors.account;
            setErrorMessage(errMsg);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("login_error", errMsg);
            }
            toast.error("Account Disabled", {
              description: errMsg,
              duration: 10000,
            });
            return;
          }

          // Other field errors
          if (errors.fields) {
            handleApiError(error, form, errMsg);
            return;
          }
        }
      } else if (error.code === "ERR_NETWORK") {
        errMsg = "Cannot connect to server. Please check your connection.";
        toast.error("Network Error", {
          description: errMsg,
          duration: 10000,
        });
      }

      // Set inline error message and save to sessionStorage
      setErrorMessage(errMsg);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("login_error", errMsg);
      }

      // Show toast
      toast.error("Login Failed", {
        description: errMsg,
        duration: 10000,
      });
    } finally {
      setLoading(false);
    }
  };

  // 5. Render Loading State while checking Auth
  if (isCheckingAuth) {
    return <Loader fullScreen text="Verifying session..." />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
            Adaptix
          </CardTitle>
          <CardDescription>
            Enter your credentials to access the workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit(onSubmit)(e);
              }}
              className="space-y-4"
            >
              {/* Username Field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          placeholder="admin"
                          disabled={loading}
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
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
                          <span className="sr-only">
                            {showPassword ? "Hide password" : "Show password"}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Forgot Password Link */}
              <div className="flex items-center justify-end">
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 font-normal text-emerald-600 dark:text-emerald-500"
                  onClick={() => router.push("/forgot-password")}
                  type="button"
                >
                  Forgot password?
                </Button>
              </div>

              {/* Error Message Display */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                  <p className="font-medium">⚠️ {errorMessage}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
                disabled={loading}
              >
                {loading ? (
                  <Loader
                    size="sm"
                    variant="white"
                    text="Signing in..."
                    className="flex-row"
                  />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground">
          Protected by Adaptix Security
        </CardFooter>
      </Card>
    </div>
  );
}
