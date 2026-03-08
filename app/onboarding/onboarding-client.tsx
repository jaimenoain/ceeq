"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { tenantConfig } from "@/tenant-system.config";
import type { OnboardingState } from "@/types/supabase";
import {
  acceptInvitation,
  requestAccess,
  createTenant,
} from "@/lib/onboarding/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const postOnboardingRoute = tenantConfig.routing.postOnboardingRoute;
const blacklistedDomains = tenantConfig.email.blacklistedDomains;

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function isDomainBlacklisted(email: string | null | undefined): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return blacklistedDomains.includes(domain);
}

type Props = {
  state: OnboardingState;
  userEmail: string | null;
};

export function OnboardingClient({ state, userEmail }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function onSuccess() {
    const supabase = createClient();
    await supabase.auth.refreshSession();
    router.push(postOnboardingRoute);
  }

  async function handleAcceptInvitation(invitationId: string) {
    setError(null);
    setLoading("accept");
    const result = await acceptInvitation(invitationId);
    setLoading(null);
    if (result.success) {
      await onSuccess();
    } else {
      setError(result.error);
    }
  }

  async function handleRequestAccess(tenantId: string) {
    setError(null);
    setLoading("request");
    const result = await requestAccess(tenantId);
    setLoading(null);
    if (result.success) {
      await onSuccess();
    } else {
      setError(result.error);
    }
  }

  async function handleCreateTenant(name: string, domain?: string) {
    setError(null);
    setLoading("create");
    const result = await createTenant(name, domain);
    setLoading(null);
    if (result.success) {
      await onSuccess();
    } else {
      setError(result.error);
    }
  }

  const displayState = showCreateForm ? "create_tenant" : state.type;

  if (displayState === "create_tenant") {
    return (
      <CreateTenantForm
        userEmail={userEmail}
        error={error}
        loading={loading === "create"}
        onSubmit={handleCreateTenant}
        onBack={state.type === "domain_match" ? () => setShowCreateForm(false) : undefined}
      />
    );
  }

  if (state.type === "has_invite") {
    return (
      <Card className="w-full max-w-md border-border bg-card shadow">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold">Invitation</CardTitle>
          <CardDescription className="text-muted-foreground">
            You’ve been invited to join <strong>{state.tenantName}</strong> as{" "}
            <strong>{state.invitation.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Expires {formatExpiry(state.invitation.expires_at)}
          </p>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            className="w-full"
            disabled={loading !== null}
            onClick={() => handleAcceptInvitation(state.invitation.id)}
          >
            {loading === "accept" ? "Accepting…" : "Accept Invitation"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.type === "pending_request") {
    return (
      <Card className="w-full max-w-md border-border bg-card shadow">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold">Request pending</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your request to join <strong>{state.tenantName}</strong> is pending.
            You’ll get access once an admin approves it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No action needed. Check back later or contact the workspace admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state.type === "domain_match") {
    return (
      <Card className="w-full max-w-md border-border bg-card shadow">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold">Join workspace</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your email matches <strong>{state.tenant.name}</strong>. Request
            access or create a new workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={loading !== null}
              onClick={() => handleRequestAccess(state.tenant.id)}
            >
              {loading === "request" ? "Requesting…" : "Request Access"}
            </Button>
            <Button
              variant="link"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              Create a new workspace instead
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CreateTenantForm
      userEmail={userEmail}
      error={error}
      loading={loading === "create"}
      onSubmit={handleCreateTenant}
    />
  );
}

function CreateTenantForm({
  userEmail,
  error,
  loading,
  onSubmit,
  onBack,
}: {
  userEmail: string | null;
  error: string | null;
  loading: boolean;
  onSubmit: (name: string, domain?: string) => Promise<void>;
  onBack?: () => void;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const hideDomain = isDomainBlacklisted(userEmail);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await onSubmit(trimmedName, domain.trim() || undefined);
  }

  return (
    <Card className="w-full max-w-md border-border bg-card shadow">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">Create workspace</CardTitle>
        <CardDescription className="text-muted-foreground">
          Set up a new workspace for your team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="workspace-name"
              className="text-sm font-medium leading-none"
            >
              Workspace Name
            </label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc"
              required
              className="w-full"
            />
          </div>
          {!hideDomain && (
            <div className="space-y-2">
              <label
                htmlFor="company-domain"
                className="text-sm font-medium leading-none"
              >
                Company domain (optional)
              </label>
              <Input
                id="company-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="acme.com"
                className="w-full"
              />
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create Workspace"}
            </Button>
            {onBack && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onBack}
              >
                Back
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
