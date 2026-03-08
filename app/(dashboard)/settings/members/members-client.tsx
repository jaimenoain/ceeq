"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { tenantConfig } from "@/tenant-system.config";
import {
  updateMemberRole,
  removeMember,
  createInvitation,
  revokeInvitation,
  approveRequest,
  rejectRequest,
} from "@/app/actions/members";
import type { UserRow } from "@/types/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const roles = tenantConfig.roles.all;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string | null;
};

type Request = {
  id: string;
  user_email: string;
  user_id: string | null;
  status: string;
  created_at: string | null;
};

type Props = {
  members: UserRow[];
  invitations: Invitation[];
  requests: Request[];
};

export function MembersClient({
  members: initialMembers,
  invitations: initialInvitations,
  requests: initialRequests,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [requests, setRequests] = useState(initialRequests);

  useEffect(() => {
    setMembers(initialMembers);
    setInvitations(initialInvitations);
    setRequests(initialRequests);
  }, [initialMembers, initialInvitations, initialRequests]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const [roleEditMember, setRoleEditMember] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState("");
  const [removeTarget, setRemoveTarget] = useState<UserRow | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(tenantConfig.roles.defaultMember);
  const [approveTarget, setApproveTarget] = useState<Request | null>(null);
  const [approveRole, setApproveRole] = useState(tenantConfig.roles.defaultMember);
  const [rejectTarget, setRejectTarget] = useState<Request | null>(null);

  async function handleUpdateRole() {
    if (!roleEditMember) return;
    setError(null);
    setLoading("role");
    const result = await updateMemberRole(roleEditMember.id, newRole);
    setLoading(null);
    if (result.ok) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === roleEditMember.id ? { ...m, role: newRole } : m
        )
      );
      setRoleEditMember(null);
    } else {
      setError(result.error);
    }
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;
    setError(null);
    setLoading("remove");
    const result = await removeMember(removeTarget.id);
    setLoading(null);
    if (result.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      setRemoveTarget(null);
    } else {
      setError(result.error);
    }
  }

  async function handleCreateInvitation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("invite");
    const result = await createInvitation(inviteEmail, inviteRole);
    setLoading(null);
    if (result.ok) {
      router.refresh();
      setInviteEmail("");
      setInviteRole(tenantConfig.roles.defaultMember);
    } else {
      setError(result.error);
    }
  }

  async function handleRevokeInvitation(id: string) {
    setError(null);
    setLoading(`revoke-${id}`);
    const result = await revokeInvitation(id);
    setLoading(null);
    if (result.ok) {
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } else {
      setError(result.error);
    }
  }

  async function handleApproveRequest() {
    if (!approveTarget) return;
    setError(null);
    setLoading("approve");
    const result = await approveRequest(approveTarget.id, approveRole);
    setLoading(null);
    if (result.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== approveTarget.id));
      setApproveTarget(null);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleRejectRequest() {
    if (!rejectTarget) return;
    setError(null);
    setLoading("reject");
    const result = await rejectRequest(rejectTarget.id);
    setLoading(null);
    if (result.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setRejectTarget(null);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Member management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite members, change roles, and manage access requests.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Workspace members and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {roleEditMember?.id === member.id ? (
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      member.role
                    )}
                  </TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>{formatDate(member.created_at)}</TableCell>
                  <TableCell>
                    {roleEditMember?.id === member.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          disabled={loading === "role"}
                          onClick={handleUpdateRole}
                        >
                          {loading === "role" ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRoleEditMember(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRoleEditMember(member);
                            setNewRole(member.role);
                          }}
                        >
                          Change role
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRemoveTarget(member)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite member</CardTitle>
          <CardDescription>Send an invitation by email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvitation} className="flex flex-wrap gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="w-56"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={loading !== null}>
              {loading === "invite" ? "Sending…" : "Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Invitations not yet accepted.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>{inv.role}</TableCell>
                    <TableCell>{formatDate(inv.expires_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading !== null}
                        onClick={() => handleRevokeInvitation(inv.id)}
                      >
                        {loading === `revoke-${inv.id}` ? "Revoking…" : "Revoke"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending access requests</CardTitle>
            <CardDescription>Approve or reject requests to join.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.user_email}</TableCell>
                    <TableCell>
                      {req.created_at ? formatDate(req.created_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setApproveTarget(req);
                            setApproveRole(tenantConfig.roles.defaultMember);
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectTarget(req)}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Remove {removeTarget?.email} from the workspace? They will lose
              access and can request to join again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={loading !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={loading !== null}
            >
              {loading === "remove" ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve request</DialogTitle>
            <DialogDescription>
              Approve {approveTarget?.user_email} with role:
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <select
              value={approveRole}
              onChange={(e) => setApproveRole(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveTarget(null)}
              disabled={loading !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveRequest}
              disabled={loading !== null}
            >
              {loading === "approve" ? "Approving…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>
              Reject {rejectTarget?.user_email}? They will not be added to the
              workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={loading !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRequest}
              disabled={loading !== null}
            >
              {loading === "reject" ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
