"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useOptimistic, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateTenantAction } from "@/app/actions/tenant";

export type TenantDTO = {
  id: string;
  name: string;
  max_seats: number;
};

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "team", label: "Team" },
  { value: "fields", label: "Custom Fields" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function isValidTab(t: string): t is TabValue {
  return TABS.some((tab) => tab.value === t);
}

function PageTitle() {
  return (
    <h1 className="text-xl font-semibold tracking-tight text-foreground">
      Account Settings
    </h1>
  );
}

function ProfileTabPanel({
  tenant,
  initialTab,
}: {
  tenant: TenantDTO;
  initialTab: TabValue;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [optimisticName, setOptimisticName] = useOptimistic(tenant.name);
  const [localName, setLocalName] = useState(tenant.name);
  const [formError, setFormError] = useState<string | null>(null);
  const displayName = isPending ? optimisticName : localName;

  const setTab = (value: string) => {
    const tab = isValidTab(value) ? value : "profile";
    router.push(`${pathname}?tab=${tab}`);
  };

  return (
    <Tabs value={initialTab} onValueChange={setTab} className="w-full">
      <div className="space-y-4">
        <PageTitle />
        <TabsList className="bg-muted">
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              const form = e.currentTarget;
              const fd = new FormData(form);
              const name = fd.get("name")?.toString()?.trim() ?? "";
              if (name.length >= 2) setOptimisticName(name);
              startTransition(async () => {
                const result = await updateTenantAction(null, fd);
                if (result?.error) {
                  setFormError(result.error);
                  setLocalName(tenant.name);
                }
              });
            }}
            className="space-y-4 max-w-md"
          >
            <input type="hidden" name="tenantId" value={tenant.id} />
            <div className="space-y-2">
              <label htmlFor="tenant-name" className="text-sm font-medium leading-none">
                Tenant Name
              </label>
              <Input
                id="tenant-name"
                name="name"
                type="text"
                value={displayName}
                onChange={(e) => setLocalName(e.target.value)}
                className="w-full"
                minLength={2}
                required
                disabled={isPending}
                aria-describedby="tenant-name-helper"
              />
              <p id="tenant-name-helper" className="text-xs text-muted-foreground">
                Tenant name must be at least 2 characters.
              </p>
              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground">
                Utilized seats
              </label>
              <p
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                aria-readonly
              >
                {tenant.max_seats}
              </p>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <p className="text-sm text-muted-foreground">Team management (placeholder).</p>
        </TabsContent>
        <TabsContent value="fields" className="mt-4">
          <p className="text-sm text-muted-foreground">Custom fields (placeholder).</p>
        </TabsContent>
      </div>
    </Tabs>
  );
}

export function SettingsContent({
  tenant,
  initialTab,
}: {
  tenant: TenantDTO;
  initialTab: TabValue;
}) {
  return <ProfileTabPanel tenant={tenant} initialTab={initialTab} />;
}
