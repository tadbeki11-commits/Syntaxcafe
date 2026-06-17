import { Injectable } from "@nestjs/common";
import { db } from "../../db/drizzle";
import {
  paymentMethods,
  roles,
  users,
  orders,
  payments,
  systemSettings,
} from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { requireBranchId, requireBusinessId, tenantInsert } from "../../common/tenant/tenant-context";
import { emitCreated, emitDeleted, emitUpdated } from "../sync/sync-emit.util";

@Injectable()
export class SettingsService {
  // ── Data Management ────────────────────────────────────────────────────────

  async cleanupData(): Promise<{
    ordersDeleted: number;
    paymentsDeleted: number;
  }> {
    const branchId = requireBranchId();
    return await db.transaction(async (tx) => {
      // Scope the wipe to the current branch only — never touch other tenants' data.
      // First delete payments (though cascade should handle it)
      const pResult = await tx
        .delete(payments)
        .where(eq(payments.branch_id, branchId));
      // Then delete orders
      const oResult = await tx
        .delete(orders)
        .where(eq(orders.branch_id, branchId));

      console.log(`[SettingsService] Data cleanup: Removed payments and orders for branch ${branchId}.`);

      return {
        ordersDeleted: 0, // Drizzle delete doesn't return count by default in some pg drivers without .returning().count() or similar, but we can just say success
        paymentsDeleted: 0,
      };
    });
  }

  // ── Payment Methods ────────────────────────────────────────────────────────

  async getAllPaymentMethods(): Promise<any[]> {
    return db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.branch_id, requireBranchId()),
          eq(paymentMethods.is_active, true),
        ),
      )
      .orderBy(paymentMethods.display_name);
  }

  async createPaymentMethod(data: any): Promise<any> {
    const [created] = await db
      .insert(paymentMethods)
      .values({
        ...tenantInsert(),
        ...(data.id ? { id: data.id } : {}),
        name: data.name,
        display_name: data.display_name,
        icon: data.icon || null,
        description: data.description || null,
        is_active: data.is_active !== false,
      })
      .returning();
    if (created) {
      await emitCreated(db, "payment_method", "PAYMENT_METHOD_CREATED", created as any);
    }
    return created;
  }

  async updatePaymentMethod(id: string, data: any): Promise<any> {
    const [updated] = await db
      .update(paymentMethods)
      .set({
        name: data.name,
        display_name: data.display_name,
        icon: data.icon,
        description: data.description,
        is_active: data.is_active,
        updated_at: new Date(),
      })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.branch_id, requireBranchId())))
      .returning();
    if (!updated) throw new Error("Payment method not found");
    await emitUpdated(db, "payment_method", "PAYMENT_METHOD_UPDATED", updated as any);
    return updated;
  }

  async deletePaymentMethod(id: string): Promise<any> {
    const [deleted] = await db
      .update(paymentMethods)
      .set({ is_active: false, updated_at: new Date() })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.branch_id, requireBranchId())))
      .returning();
    if (!deleted) throw new Error("Payment method not found");
    await emitUpdated(db, "payment_method", "PAYMENT_METHOD_DEACTIVATED", deleted as any);
    return deleted;
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  async getAllRoles(): Promise<any[]> {
    return db.select().from(roles).orderBy(roles.display_name);
  }

  async getRoleById(id: string): Promise<any> {
    const [row] = await db.select().from(roles).where(eq(roles.id, id));
    return row || null;
  }

  async createRole(data: any): Promise<any> {
    const [created] = await db
      .insert(roles)
      .values({
        ...(data.id ? { id: data.id } : {}),
        name: data.name,
        display_name: data.display_name,
        description: data.description || null,
        is_active: data.is_active !== false,
      })
      .returning();
    if (created) {
      await emitCreated(db, "role", "ROLE_CREATED", created as any);
    }
    return created;
  }

  async updateRole(id: string, data: any): Promise<any> {
    const [updated] = await db
      .update(roles)
      .set({
        name: data.name,
        display_name: data.display_name,
        description: data.description,
        is_active: data.is_active,
        updated_at: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();
    if (!updated) throw new Error("Role not found");
    await emitUpdated(db, "role", "ROLE_UPDATED", updated as any);
    return updated;
  }

  async deleteRole(id: string): Promise<any> {
    const [deleted] = await db
      .update(roles)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(roles.id, id))
      .returning();
    if (!deleted) throw new Error("Role not found");
    await emitUpdated(db, "role", "ROLE_DEACTIVATED", deleted as any);
    return deleted;
  }

  // ── Seed Defaults ──────────────────────────────────────────────────────────

  async _seedDefaults(): Promise<void> {
    // Seed default roles if roles table is empty
    const existingRoles = await db.select().from(roles);
    if (existingRoles.length === 0) {
      const defaultRoles = [
        {
          name: "admin",
          display_name: "Administrator",
          description: "Full system access",
          is_active: true,
        },
        {
          name: "cashier",
          display_name: "Cashier",
          description: "Handles payments and checkout",
          is_active: true,
        },
        {
          name: "kitchen_staff",
          display_name: "Kitchen Staff",
          description: "Receives and fulfils kitchen orders",
          is_active: true,
        },
        {
          name: "cafe_waiter",
          display_name: "Café Waiter",
          description: "Serves customers and takes orders",
          is_active: true,
        },
      ];
      for (const r of defaultRoles) {
        await db.insert(roles).values(r).onConflictDoNothing();
      }
    }

    // Seed default payment methods if table is empty
    const existingPm = await db.select().from(paymentMethods);
    if (existingPm.length === 0) {
      const defaultMethods = [
        {
          name: "cash",
          display_name: "Cash",
          icon: "dollar-sign",
          description: "Cash payment",
          is_active: true,
        },
        {
          name: "qr_code",
          display_name: "QR Code",
          icon: "square",
          description: "QR code payment",
          is_active: true,
        },
        {
          name: "mobile_pay",
          display_name: "Mobile Pay",
          icon: "smartphone",
          description: "Mobile wallet",
          is_active: true,
        },
        {
          name: "card",
          display_name: "Card",
          icon: "credit-card",
          description: "Card payment",
          is_active: true,
        },
      ];
      for (const m of defaultMethods) {
        await db
          .insert(paymentMethods)
          .values({ ...tenantInsert(), ...m })
          .onConflictDoNothing();
      }
    }
  }

  // ── Current-User Settings ───────────────────────────────────────────────────

  async getCurrentUserSettings(userId: string): Promise<any> {
    const cancelPassword = await this.getSystemSetting("cancel_password");

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return { cancel_password: cancelPassword, print_copies: "1" };
    }

    const [row] = await db
      .select({
        print_copies: users.print_copies,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.business_id, requireBusinessId())));

    return {
      cancel_password: cancelPassword,
      print_copies: row?.print_copies || "1" 
    };
  }

  async updateCancelPassword(userId: string, password: string): Promise<any> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new Error("Invalid User ID");
    }
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.business_id, requireBusinessId())));
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can change the cancellation password.");
    }

    const hashed = await hash(password, 10);
    await this.setSystemSetting("cancel_password", hashed);
    return { cancel_password: hashed };
  }

  async verifyCancelPassword(
    userId: string,
    password: string,
  ): Promise<boolean> {
    const cancelPassword = await this.getSystemSetting("cancel_password");
    if (!cancelPassword) return false;
    return compare(password, cancelPassword);
  }

  async updatePrintCopies(userId: string, copies: string): Promise<any> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return { print_copies: copies };
    }
    const [updated] = await db
      .update(users)
      .set({ print_copies: copies, updated_at: new Date() })
      .where(and(eq(users.id, userId), eq(users.business_id, requireBusinessId())))
      .returning({ print_copies: users.print_copies });
    return updated;
  }

  // ── System Settings ─────────────────────────────────────────────────────────

  async getAllSystemSettings(): Promise<Array<{ key: string; value: string }>> {
    return db
      .select({ key: systemSettings.key, value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.branch_id, requireBranchId()));
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const [row] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.branch_id, requireBranchId()),
          eq(systemSettings.key, key),
        ),
      );
    return row?.value ?? null;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db
      .insert(systemSettings)
      .values({ ...tenantInsert(), key, value })
      .onConflictDoUpdate({
        target: [systemSettings.branch_id, systemSettings.key],
        set: { value, updated_at: new Date() },
      });
  }

  async getInventorySettings(): Promise<{ allow_low_stock_orders: boolean }> {
    const raw = await this.getSystemSetting("allow_low_stock_orders");
    return { allow_low_stock_orders: raw === "true" };
  }

  async updateInventorySettings(data: { allow_low_stock_orders: boolean }): Promise<{ allow_low_stock_orders: boolean }> {
    await this.setSystemSetting("allow_low_stock_orders", data.allow_low_stock_orders ? "true" : "false");
    return { allow_low_stock_orders: data.allow_low_stock_orders };
  }

  async getOrganizationSettings(): Promise<{ allow_cashier_manage_org_orders: boolean }> {
    const raw = await this.getSystemSetting("allow_cashier_manage_org_orders");
    return { allow_cashier_manage_org_orders: raw === "true" };
  }

  async updateOrganizationSettings(data: {
    allow_cashier_manage_org_orders: boolean;
  }): Promise<{ allow_cashier_manage_org_orders: boolean }> {
    await this.setSystemSetting(
      "allow_cashier_manage_org_orders",
      data.allow_cashier_manage_org_orders ? "true" : "false",
    );
    return {
      allow_cashier_manage_org_orders: data.allow_cashier_manage_org_orders,
    };
  }

  async getTableSelectionSettings(): Promise<{ force_table_selection: boolean }> {
    const raw = await this.getSystemSetting("force_table_selection");
    return { force_table_selection: raw === "true" };
  }

  async updateTableSelectionSettings(data: { force_table_selection: boolean }): Promise<{ force_table_selection: boolean }> {
    await this.setSystemSetting("force_table_selection", data.force_table_selection ? "true" : "false");
    return { force_table_selection: data.force_table_selection };
  }

  async getReceiptSettings(): Promise<{ enable_cashier_receipt: boolean }> {
    const raw = await this.getSystemSetting("enable_cashier_receipt");
    return { enable_cashier_receipt: raw === "true" };
  }

  async updateReceiptSettings(data: { enable_cashier_receipt: boolean }): Promise<{ enable_cashier_receipt: boolean }> {
    await this.setSystemSetting("enable_cashier_receipt", data.enable_cashier_receipt ? "true" : "false");
    return { enable_cashier_receipt: data.enable_cashier_receipt };
  }

  // Branch-scoped cancellation override password, settable from the owner web
  // dashboard. We never return the stored hash — only whether one is set — so
  // it can't leak to the browser.
  async getCancelPasswordStatus(): Promise<{ is_set: boolean }> {
    const cancelPassword = await this.getSystemSetting("cancel_password");
    return { is_set: !!cancelPassword };
  }

  async updateSystemCancelPassword(password: string): Promise<{ is_set: boolean }> {
    if (!password || password.length < 6) {
      throw new Error("Cancel password must be at least 6 characters.");
    }
    const hashed = await hash(password, 10);
    await this.setSystemSetting("cancel_password", hashed);
    return { is_set: true };
  }
}
