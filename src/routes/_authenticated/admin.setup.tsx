import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { adminApi, cardsApi, departmentsApi } from "@/lib/api/services";
import { Panel, PanelEmpty, PanelError, PanelLoading, inputCls, primaryBtnCls, btnCls } from "@/components/ui-states";
import { useState } from "react";
import type { Card, Department } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/admin/setup")({
    ssr: false,
    component: AdminSetupPage,
});

function AdminSetupPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);
    const [editingCardId, setEditingCardId] = useState<number | null>(null);

    const departments = useQuery({
        queryKey: ["departments"],
        queryFn: () => departmentsApi.list(),
        enabled: user?.role === "ADMIN",
    });

    const users = useQuery({
        queryKey: ["admin", "users"],
        queryFn: () => adminApi.listUsers(),
        enabled: user?.role === "ADMIN",
    });

    const cards = useQuery({
        queryKey: ["cards"],
        queryFn: () => cardsApi.list(),
        enabled: user?.role === "ADMIN",
    });

    const createDepartment = useMutation({
        mutationFn: departmentsApi.create,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });

    const createCard = useMutation({
        mutationFn: cardsApi.create,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["cards"] });
        },
    });

    const updateDepartmentStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: "active" | "inactive" }) =>
            departmentsApi.update(id, { status }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });

    const updateCardStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: "active" | "inactive" }) =>
            cardsApi.update(id, { status }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["cards"] });
        },
    });

    const updateDepartment = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<Department> }) =>
            departmentsApi.update(id, payload),
        onSuccess: async () => {
            setEditingDepartmentId(null);
            await queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });

    const updateCard = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof cardsApi.update>[1] }) =>
            cardsApi.update(id, payload),
        onSuccess: async () => {
            setEditingCardId(null);
            await queryClient.invalidateQueries({ queryKey: ["cards"] });
        },
    });

    if (user?.role !== "ADMIN") {
        return (
            <AppShell title="Organisation setup" subtitle="Administrator access required">
                <Panel title="Access denied">
                    <PanelError message="Only administrators can create departments and cards." />
                </Panel>
            </AppShell>
        );
    }

    return (
        <AppShell title="Organisation setup" subtitle="Create departments and issue cards">
            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Create department">
                    <form
                        className="space-y-3 p-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            createDepartment.mutate({
                                department_code: String(form.get("department_code")),
                                name: String(form.get("name")),
                                description: String(form.get("description") ?? ""),
                            });
                        }}
                    >
                        <input className={inputCls} name="department_code" placeholder="Department code (e.g. FIN)" required />
                        <input className={inputCls} name="name" placeholder="Department name" required />
                        <input className={inputCls} name="description" placeholder="Description (optional)" />
                        <button className={primaryBtnCls} disabled={createDepartment.isPending}>
                            {createDepartment.isPending ? "Creating…" : "Create department"}
                        </button>
                        {createDepartment.isError ? (
                            <p className="text-[12px] text-alarm">{createDepartment.error.message}</p>
                        ) : null}
                        {createDepartment.isSuccess ? (
                            <p className="text-[12px] text-clear">Department created.</p>
                        ) : null}
                    </form>
                </Panel>

                <Panel title="Create card" subtitle="Create a department first if none are listed">
                    {departments.isLoading ? <PanelLoading label="Loading departments" /> : null}
                    {departments.isError ? (
                        <PanelError message="Could not load departments. Check your admin session and backend." onRetry={() => void departments.refetch()} />
                    ) : null}
                    {departments.data?.length === 0 ? (
                        <PanelEmpty message="Create a department before issuing a card." />
                    ) : null}
                    {departments.data?.length ? (
                        <form
                            className="space-y-3 p-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                const form = new FormData(event.currentTarget);
                                const assignedUser = String(form.get("assigned_user_id") ?? "").trim();
                                createCard.mutate({
                                    last_four: String(form.get("last_four") ?? "").trim(),
                                    department_id: Number(form.get("department_id")),
                                    assigned_user_id: assignedUser ? Number(assignedUser) : null,
                                    card_type: String(form.get("card_type") ?? "") || null,
                                    issue_date: String(form.get("issue_date") ?? "") || null,
                                    expiry_date: String(form.get("expiry_date") ?? "") || null,
                                });
                            }}
                        >
                            <input
                                className={inputCls}
                                name="last_four"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{4}"
                                minLength={4}
                                maxLength={4}
                                placeholder="Last four digits"
                                title="Enter exactly four digits"
                                required
                            />
                            <select className={inputCls} name="department_id" required defaultValue="">
                                <option value="" disabled>Select department</option>
                                {departments.data.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.department_code} — {department.name}
                                    </option>
                                ))}
                            </select>
                            <select className={inputCls} name="assigned_user_id" defaultValue="">
                                <option value="">Leave unassigned</option>
                                {users.data?.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.full_name} — {account.email}
                                    </option>
                                ))}
                            </select>
                            <input className={inputCls} name="card_type" placeholder="Card type (optional)" />
                            <label className="block text-[11px] text-faint">
                                Issue date (optional)
                                <input className={inputCls} name="issue_date" type="date" />
                            </label>
                            <label className="block text-[11px] text-faint">
                                Expiry date (optional)
                                <input className={inputCls} name="expiry_date" type="date" />
                            </label>
                            <button className={primaryBtnCls} disabled={createCard.isPending}>
                                {createCard.isPending ? "Creating…" : "Create card"}
                            </button>
                            {createCard.isError ? (
                                <p className="text-[12px] text-alarm">{createCard.error.message}</p>
                            ) : null}
                            {createCard.isSuccess ? (
                                <p className="text-[12px] text-clear">
                                    Card created. Reference: {createCard.data.card_reference}
                                </p>
                            ) : null}
                        </form>
                    ) : null}
                </Panel>
            </div>

            <Panel title="Existing departments">
                {departments.isLoading ? <PanelLoading label="Loading departments" /> : null}
                {departments.isError ? (
                    <PanelError message="Could not load departments." onRetry={() => void departments.refetch()} />
                ) : null}
                {departments.data?.length === 0 ? <PanelEmpty message="No departments have been created yet." /> : null}
                {departments.data?.map((department) => (
                    <div key={department.id} className="border-t border-line p-4">
                        {editingDepartmentId === department.id ? (
                            <form
                                className="grid gap-2 md:grid-cols-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    const form = new FormData(event.currentTarget);
                                    updateDepartment.mutate({
                                        id: department.id,
                                        payload: {
                                            department_code: String(form.get("department_code")),
                                            name: String(form.get("name")),
                                            description: String(form.get("description") ?? ""),
                                            status: String(form.get("status")) as "active" | "inactive",
                                        },
                                    });
                                }}
                            >
                                <input className={inputCls} name="department_code" defaultValue={department.department_code} required />
                                <input className={inputCls} name="name" defaultValue={department.name} required />
                                <input className={inputCls} name="description" defaultValue={department.description ?? ""} />
                                <select className={inputCls} name="status" defaultValue={department.status}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <button className={primaryBtnCls} disabled={updateDepartment.isPending}>
                                    {updateDepartment.isPending ? "Saving…" : "Save department"}
                                </button>
                                <button type="button" className={btnCls} onClick={() => setEditingDepartmentId(null)}>
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
                                <div>
                                    <div>{department.department_code} — {department.name}</div>
                                    <div className="text-faint">{department.description || "No description"} · {department.status}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" className={btnCls} onClick={() => setEditingDepartmentId(department.id)}>
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className={btnCls}
                                        disabled={updateDepartmentStatus.isPending}
                                        onClick={() =>
                                            updateDepartmentStatus.mutate({
                                                id: department.id,
                                                status: department.status === "active" ? "inactive" : "active",
                                            })
                                        }
                                    >
                                        {department.status === "active" ? "Deactivate" : "Activate"}
                                    </button>
                                </div>
                            </div>
                        )}
                        {updateDepartment.isError ? (
                            <p className="mt-2 text-[12px] text-alarm">{updateDepartment.error.message}</p>
                        ) : null}
                    </div>
                ))}
            </Panel>

            <Panel title="Existing cards">
                {cards.isLoading ? <PanelLoading label="Loading cards" /> : null}
                {cards.isError ? (
                    <PanelError message="Could not load cards." onRetry={() => void cards.refetch()} />
                ) : null}
                {cards.data?.length === 0 ? <PanelEmpty message="No cards have been created yet." /> : null}
                {cards.data?.map((card) => (
                    <div key={card.id} className="border-t border-line p-4">
                        {editingCardId === card.id ? (
                            <form
                                className="grid gap-2 md:grid-cols-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    const form = new FormData(event.currentTarget);
                                    const assignedUser = String(form.get("assigned_user_id") ?? "");
                                    updateCard.mutate({
                                        id: card.id,
                                        payload: {
                                            department_id: Number(form.get("department_id")),
                                            assigned_user_id: assignedUser ? Number(assignedUser) : null,
                                            card_type: String(form.get("card_type") ?? "") || null,
                                            issue_date: String(form.get("issue_date") ?? "") || null,
                                            expiry_date: String(form.get("expiry_date") ?? "") || null,
                                            status: String(form.get("status")),
                                        },
                                    });
                                }}
                            >
                                <input className={inputCls} value={card.card_reference} readOnly />
                                <input
                                    className={inputCls}
                                    value={card.masked_card_number}
                                    readOnly
                                    aria-label="Masked card number"
                                />
                                <select className={inputCls} name="department_id" defaultValue={String(card.department_id)} required>
                                    {departments.data?.map((department) => (
                                        <option key={department.id} value={department.id}>
                                            {department.department_code} — {department.name}
                                        </option>
                                    ))}
                                </select>
                                <select className={inputCls} name="assigned_user_id" defaultValue={card.assigned_user_id ? String(card.assigned_user_id) : ""}>
                                    <option value="">Leave unassigned</option>
                                    {users.data?.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.full_name} — {account.email}
                                        </option>
                                    ))}
                                </select>
                                <input className={inputCls} name="card_type" defaultValue={card.card_type ?? ""} placeholder="Card type" />
                                <label className="text-[11px] text-faint">
                                    Issue date
                                    <input className={inputCls} name="issue_date" type="date" defaultValue={card.issue_date ?? ""} />
                                </label>
                                <label className="text-[11px] text-faint">
                                    Expiry date
                                    <input className={inputCls} name="expiry_date" type="date" defaultValue={card.expiry_date ?? ""} />
                                </label>
                                <select className={inputCls} name="status" defaultValue={card.status}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <button className={primaryBtnCls} disabled={updateCard.isPending}>
                                    {updateCard.isPending ? "Saving…" : "Save card"}
                                </button>
                                <button type="button" className={btnCls} onClick={() => setEditingCardId(null)}>
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
                                <span>
                                    {card.card_reference} · {card.masked_card_number}
                                    <span className="ml-2 text-faint">Department {card.department_id} · {card.status}</span>
                                </span>
                                <div className="flex gap-2">
                                    <button type="button" className={btnCls} onClick={() => setEditingCardId(card.id)}>
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className={btnCls}
                                        disabled={updateCardStatus.isPending}
                                        onClick={() =>
                                            updateCardStatus.mutate({
                                                id: card.id,
                                                status: card.status === "active" ? "inactive" : "active",
                                            })
                                        }
                                    >
                                        {card.status === "active" ? "Deactivate" : "Activate"}
                                    </button>
                                </div>
                            </div>
                        )}
                        {updateCard.isError ? (
                            <p className="mt-2 text-[12px] text-alarm">{updateCard.error.message}</p>
                        ) : null}
                    </div>
                ))}
            </Panel>
        </AppShell>
    );
}