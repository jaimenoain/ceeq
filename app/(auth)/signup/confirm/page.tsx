import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SignUpConfirmPage() {
  return (
    <Card className="w-full max-w-md border-border bg-card shadow">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">Check your email</CardTitle>
        <CardDescription className="text-muted-foreground">
          We&apos;ve sent you a confirmation link. Click the link in the email to verify your
          account and sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          If you don&apos;t see the email, check your spam folder. It may take a few minutes to
          arrive.
        </p>
        <Button asChild variant="secondary" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
