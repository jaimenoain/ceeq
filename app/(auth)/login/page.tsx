"use client";

import { useActionState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loginAction,
  signUpAction,
  forgotPasswordAction,
  type AuthResult,
} from "@/app/actions/auth";

const initialAuthResult: AuthResult = {};

function AuthMessage({ result }: { result: AuthResult }) {
  if (result?.error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {result.error}
      </p>
    );
  }
  if (result?.success) {
    return (
      <p className="text-sm text-foreground" role="status">
        Check your email for the password reset link.
      </p>
    );
  }
  return null;
}

export default function LoginPage() {
  const [loginState, loginFormAction] = useActionState(loginAction, initialAuthResult);
  const [signUpState, signUpFormAction] = useActionState(signUpAction, initialAuthResult);
  const [forgotState, forgotFormAction] = useActionState(forgotPasswordAction, initialAuthResult);

  return (
    <Card className="w-full max-w-md border-border bg-card shadow">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">Welcome</CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to your account or create a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
            <TabsTrigger value="forgot">Forgot password</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4 space-y-4">
            <form action={loginFormAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium leading-none">
                  Email
                </label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-medium leading-none">
                  Password
                </label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full"
                  minLength={8}
                />
              </div>
              <AuthMessage result={loginState} />
              <Button type="submit" className="w-full">
                Log in
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup" className="mt-4 space-y-4">
            <form action={signUpFormAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="signup-email" className="text-sm font-medium leading-none">
                  Email
                </label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="signup-password" className="text-sm font-medium leading-none">
                  Password
                </label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full"
                  minLength={8}
                />
              </div>
              <AuthMessage result={signUpState} />
              <Button type="submit" className="w-full">
                Sign up
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="forgot" className="mt-4 space-y-4">
            <form action={forgotFormAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="forgot-email" className="text-sm font-medium leading-none">
                  Email
                </label>
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full"
                />
              </div>
              <AuthMessage result={forgotState} />
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
