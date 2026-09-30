import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelEmpty, PanelError, PanelLoading, inputCls, primaryBtnCls } from "@/components/ui-states";
import { adminApi, departmentsApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin.users")({
  ssr: false,
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.listUsers(),
    enabled: user?.role === "ADMIN",
  });
  
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.list(),
    enabled: user?.role === "ADMIN",
  });

  const createUser = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not create user."),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: "admin" | "analyst" | "user" }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not update role."),
  });

  if (user?.role !== "ADMIN") {
    return (
      <AppShell title="User management" subtitle="Administrator access required">
        <Panel title="Access denied">
          <PanelError message="Only administrators can manage users." />
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell title="User management" subtitle="Create accounts and assign roles">
      <Panel title="Create user" subtitle="New accounts cannot choose their own role">
        <form
          className="grid gap-3 p-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            createUser.mutate({
              full_name: String(form.get("full_name")),
              email: String(form.get("email")),
              password: String(form.get("password")),
              role: String(form.get("role")) as "admin" | "analyst" | "user",
              department_id: form.get("department_id")
                ? Number(form.get("department_id"))
                : null,
            });
            event.currentTarget.reset();
          }}
        >
          <input className={inputCls} name="full_name" placeholder="Full name" minLength={2} required />
          <input className={inputCls} name="email" type="email" placeholder="Email" required />
          <input className={inputCls} name="password" type="password" placeholder="Temporary password (8+ characters)" minLength={8} required />
          <select className={inputCls} name="role" defaultValue="analyst">
            <option value="analyst">Analyst</option>
            <option value="user">Card user</option>
            <option value="admin">Administrator</option>
          </select>
          <button className={primaryBtnCls} disabled={createUser.isPending}>
            {createUser.isPending ? "Creating…" : "Create account"}
          </button>
        </form>
      </Panel>

      <Panel title="Accounts" subtitle="Change a user's access role">
        {users.isLoading ? <PanelLoading label="Loading users" /> : null}
        {users.isError ? (
          <PanelError
            message={users.error instanceof Error ? users.error.message : "Could not load users."}
            onRetry={() => void users.refetch()}
          />
        ) : null}
        {users.data?.length === 0 ? <PanelEmpty message="No user accounts found." /> : null}
        {users.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-faint">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((account) => (
                  <tr key={account.id} className="border-t border-line">
                    <td className="p-3">{account.full_name}</td>
                    <td className="p-3">{account.email}</td>
                    <td className="p-3">
                      <select
                        className={inputCls}
                        value={account.role}
                        disabled={updateRole.isPending && updateRole.variables?.id === account.id}
                        onChange={(event) =>
                          updateRole.mutate({
                            id: account.id,
                            role: event.target.value as "admin" | "analyst" | "user",
                            department_id: form.get("department_id")
                            ? Number(form.get("department_id"))
                            : null,
                          })
                        }
                      >
                        <option value="analyst">Analyst</option>
                        <option value="user">Card user</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <select className={inputCls} name="department_id" defaultValue="">
                        <option value="">No department</option>
                        {departments.data?.map((department) => (
                        <option key={department.id} value={department.id}>
                            {department.department_code} — {department.name}
                        </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {error ? <div className="px-4 pb-4 text-[12px] text-alarm">{error}</div> : null}
      </Panel>
    </AppShell>
  );
}