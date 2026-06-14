"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { CreditSummary } from "@/components/organizations/credit-card";
import { AddPaymentForm } from "@/components/organizations/add-payment-form";
import { RecordTransactionForm } from "@/components/organizations/record-transaction-form";
import { PaymentList } from "@/components/organizations/payment-list";
import { Organizations } from "@/lib/resources";
import { birr, shortDate } from "@/lib/format";

type Org = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  credit_balance?: string | number;
};

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [credit, setCredit] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Partial<Org>>({});

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      Organizations.get(id),
      Organizations.credit(id).catch(() => null),
      Organizations.orders(id).catch(() => []),
    ])
      .then(([o, c, ord]) => {
        setOrg(o);
        setCredit(c);
        setOrders(ord);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit() {
    if (!org) return;
    setForm({
      name: org.name,
      contact_name: org.contact_name ?? "",
      phone: org.phone ?? "",
      email: org.email ?? "",
      address: org.address ?? "",
      notes: org.notes ?? "",
      is_active: org.is_active,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!form.name?.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      await Organizations.update(id, form);
      toast.success("Saved");
      setEditOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const payments = credit?.payments ?? [];
  const transactions = credit?.transactions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/customers">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title={org?.name || "Organization"}
          description="Credit account, payments, transactions and orders."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={openEdit} disabled={!org}>
                <PencilIcon className="size-4" />
                Edit
              </Button>
              <Button asChild>
                <Link href={`/dashboard/orders/new?org=${id}`}>
                  <PlusIcon className="size-4" />
                  Create order
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center text-sm">Loading…</p>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <CreditSummary
              creditBalance={Number(
                credit?.credit_balance ?? org?.credit_balance ?? 0,
              )}
              totalPaid={Number(credit?.total_paid ?? 0)}
              totalDeducted={Number(credit?.total_deducted ?? 0)}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Contact" value={org?.contact_name} />
                <Detail label="Phone" value={org?.phone} />
                <Detail label="Email" value={org?.email} />
                <Detail label="Address" value={org?.address} />
                <Detail label="Notes" value={org?.notes} />
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={org?.is_active ? "success" : "muted"}>
                    {org?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                          No orders for this organization yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">
                            #{o.order_number ?? o.id?.slice(0, 8)}
                          </TableCell>
                          <TableCell className="capitalize">{o.status ?? "—"}</TableCell>
                          <TableCell>{birr(o.total_amount)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {shortDate(o.created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <AddPaymentForm orgId={id} onAdded={load} />
            <PaymentList payments={payments} transactions={transactions} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <RecordTransactionForm orgId={id} onRecorded={load} />
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                          No transactions recorded.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-muted-foreground">
                            {shortDate(t.transaction_date)}
                          </TableCell>
                          <TableCell>
                            {(Array.isArray(t.services) ? t.services : [])
                              .map((s: any) => s.description)
                              .join(", ") || "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {birr(t.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {([
              ["name", "Name"],
              ["contact_name", "Contact name"],
              ["phone", "Phone"],
              ["email", "Email"],
              ["address", "Address"],
              ["notes", "Notes"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  value={(form[key] as string) ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value || "—"}</p>
    </div>
  );
}
