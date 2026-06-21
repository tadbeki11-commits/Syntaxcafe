import { Injectable } from "@nestjs/common";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import db from "../../db/drizzle";
import { users } from "../../db/tables/users.table";
import { hash, compare } from "bcryptjs";
import { emitCreated, emitDeleted, emitUpdated } from "../sync/sync-emit.util";
import {
  requireBranchId,
  requireBusinessId,
} from "../../common/tenant/tenant-context";

@Injectable()
export class UsersService {
  async syncBulk(items: any[]) {
    if (!items || items.length === 0) return {};

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);
    // Tenancy is derived from the device token (the sync caller), never the
    // client payload, so synced staff are scoped to the device's branch.
    const businessId = requireBusinessId();
    const branchId = requireBranchId();
    const updatedIds: string[] = [];
    const createdRows: Array<typeof users.$inferSelect> = [];

    await db.transaction(async (tx) => {
      for (const item of items) {
        const [existing] = item.id
          ? await tx.select({ id: users.id }).from(users).where(eq(users.id, item.id)).limit(1)
          : [];

        if (existing) {
          const updates: any = {
            updated_at: new Date(),
            is_active: item.is_active === 1 || item.is_active === true,
          };
          if (item.name) updates.name = item.name;
          if (item.first_name) updates.first_name = item.first_name;
          if (item.last_name) updates.last_name = item.last_name;
          if (item.phone) updates.phone = item.phone;
          if (item.role) updates.role = item.role;
          if (item.username) updates.username = item.username;
          if (item.password) updates.password_hash = await hash(item.password, saltRounds);
          if (item.pin) updates.pin_hash = await hash(String(item.pin), saltRounds);

          await tx.update(users).set(updates).where(eq(users.id, item.id));
          updatedIds.push(item.id);
        } else {
          // PIN-only staff are valid; only fall back to a default password when
          // neither credential was supplied.
          const pin_hash = item.pin ? await hash(String(item.pin), saltRounds) : null;
          const password_hash =
            item.password || !pin_hash
              ? await hash(item.password || "123456", saltRounds)
              : null;
          const [created] = await tx
            .insert(users)
            .values({
              ...(item.id ? { id: item.id } : {}),
              business_id: businessId,
              branch_id: branchId,
              username: item.username || `user_${Date.now()}`,
              name: item.name || item.full_name || item.username || "Staff",
              password_hash,
              pin_hash,
              role: item.role || "employee",
              first_name: item.first_name || null,
              last_name: item.last_name || null,
              phone: item.phone || null,
              is_active: item.is_active === 1 || item.is_active === true,
            })
            .returning();
          createdRows.push(created);
        }
      }
    });

    for (const id of updatedIds) {
      const [updated] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (updated) await emitUpdated(db, "user", "USER_UPDATED", updated as any);
    }
    for (const row of createdRows) {
      await emitCreated(db, "user", "USER_CREATED", row as any);
    }

    return {};
  }
  async findAll(params?: { role?: string; is_active?: boolean }) {
    let query = db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        role_id: users.role_id,
        first_name: users.first_name,
        last_name: users.last_name,
        phone: users.phone,
        is_active: users.is_active,
        pin_hash: users.pin_hash,
        password_hash: users.password_hash,
        cancel_password: users.cancel_password,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .$dynamic();

    const conditions = [
      eq(users.business_id, requireBusinessId()),
      eq(users.branch_id, requireBranchId()),
    ];
    if (params?.role) {
      conditions.push(eq(users.role, params.role));
    }
    if (params?.is_active !== undefined) {
      conditions.push(eq(users.is_active, params.is_active));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(users.created_at);
  }


  async createUser(
    name: string,
    password: string,
    role = "waiter",
  ) {
    const passwordHash = await hash(password, 10);
    const [created] = await db
      .insert(users)
      .values({
        name,
        password_hash: passwordHash,
        role,
      })
      .returning();
    return created;
  }

  async verifyPassword(user: any, plain: string) {
    if (!user || !user.password_hash) return false;
    return compare(plain, user.password_hash);
  }

  async findById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.branch_id, requireBranchId())))
      .limit(1);
    return user || null;
  }

  /**
   * Resolves a login by username. Staff/branch-admin accounts are unique per
   * branch, so we first look within the caller's branch (set by the device token
   * on desktop). Cross-branch accounts — business owners and platform super
   * admins — have a NULL branch and are matched by the fallback, which also
   * covers web logins where no real branch context exists.
   */
  async findForLogin(username: string) {
    const [scoped] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.username, username), eq(users.branch_id, requireBranchId())),
      )
      .limit(1);
    if (scoped) return scoped;

    const [crossBranch] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), isNull(users.branch_id)))
      .limit(1);
    if (crossBranch) return crossBranch;

    // F&B managers are pinned to a branch (branch_id IS NOT NULL) but sign in
    // from the platform portal with no branch context, so neither lookup above
    // finds them. Their username is unique platform-wide (enforced on create and
    // by users_fb_manager_username_idx), so resolve them by username alone.
    // (Branch admins also branch-pinned, but they enroll a device first — the
    // x-device-token sets the branch so the scoped lookup above finds them.)
    const [fbManager] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.role, "fb_manager")))
      .limit(1);
    return fbManager || null;
  }

  async findByName(name: string) {
    const pattern = `%${name}%`;
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        password_hash: users.password_hash,
        pin_hash: users.pin_hash,
        role: users.role,
        role_id: users.role_id,
        business_id: users.business_id,
        first_name: users.first_name,
        last_name: users.last_name,
        phone: users.phone,
        is_active: users.is_active,
      })
      .from(users)
      .where(
        and(
          eq(users.business_id, requireBusinessId()),
          eq(users.branch_id, requireBranchId()),
          or(
            ilike(users.name, pattern),
            ilike(users.username, pattern),
            ilike(users.first_name, pattern),
            ilike(users.last_name, pattern),
          ),
        ),
      )
      .limit(1);
    return user || null;
  }

  async verifyPin(user: any, pin: string) {
    if (!user) return false;
    const bcrypt = require("bcryptjs");
    const pinHash = user.pin_hash || user.password_hash;
    if (!pinHash) return false;
    return bcrypt.compare(pin, pinHash);
  }

  async toggleStatus(id: string) {
    const [existing] = await db
      .select({ id: users.id, is_active: users.is_active })
      .from(users)
      .where(and(eq(users.id, id), eq(users.branch_id, requireBranchId())))
      .limit(1);
    if (!existing) throw new Error("User not found");

    const [updated] = await db
      .update(users)
      .set({ is_active: !existing.is_active, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (updated) {
      await emitUpdated(db, "user", "USER_UPDATED", updated);
    }
    return updated;
  }

  async deleteUser(id: string) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.branch_id, requireBranchId())))
      .limit(1);
    if (!existing) throw new Error("User not found");

    await emitDeleted(db, "user", "USER_DELETED", id);
    await db.delete(users).where(eq(users.id, id));
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const [user] = await db
      .select({ id: users.id, password_hash: users.password_hash })
      .from(users)
      .where(and(eq(users.id, id), eq(users.branch_id, requireBranchId())))
      .limit(1);

    if (!user) throw new Error("User not found");

    const valid = await compare(currentPassword, user.password_hash!);
    if (!valid) throw new Error("Current password is incorrect");

    const newHash = await hash(
      newPassword,
      parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10),
    );
    await db
      .update(users)
      .set({ password_hash: newHash, updated_at: new Date() })
      .where(eq(users.id, id));
  }

  // Floor staff sign in with a 4-digit PIN stored in `pin_hash` (see verifyPin).
  // Verify the current PIN against the same fallback chain login uses, then
  // rotate `pin_hash` so the new PIN takes effect everywhere it's synced.
  async changePin(id: string, currentPin: string, newPin: string) {
    const [user] = await db
      .select({
        id: users.id,
        pin_hash: users.pin_hash,
        password_hash: users.password_hash,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.branch_id, requireBranchId())))
      .limit(1);

    if (!user) throw new Error("User not found");

    const existingHash = user.pin_hash || user.password_hash;
    if (!existingHash) throw new Error("No PIN is set for this account");

    const valid = await compare(currentPin, existingHash);
    if (!valid) throw new Error("Current PIN is incorrect");

    const newHash = await hash(
      newPin,
      parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10),
    );
    const [updated] = await db
      .update(users)
      .set({ pin_hash: newHash, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (updated) {
      await emitUpdated(db, "user", "USER_UPDATED", updated as any);
    }
  }

  async register(payload: any) {
    const {
      username,
      password,
      pin,
      cancel_password,
      role,
      role_id,
      full_name,
      first_name,
      last_name,
      phone,
    } = payload;

    let fname = first_name;
    let lname = last_name;
    if (full_name && !first_name && !last_name) {
      const parts = full_name.split(" ");
      fname = parts[0] || "";
      lname = parts.slice(1).join(" ") || "";
    }

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.business_id, requireBusinessId()),
          eq(users.username, username),
        ),
      )
      .limit(1);
    if (existingUser.length > 0) {
      throw new Error("Username already exists in this business");
    }

    // F&B managers log in from the platform portal with no branch context, so
    // login resolves them by username alone — that requires the username to be
    // unique across the whole platform, not just within the branch.
    if (role === "fb_manager") {
      const [clash] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      if (clash) {
        throw new Error(
          "An F&B manager's username must be unique across the platform — that username is already taken.",
        );
      }
    }


    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);
    const password_hash = password ? await hash(password, saltRounds) : null;
    const pin_hash = pin ? await hash(pin, saltRounds) : null;

    if (!password_hash && !pin_hash) {
      throw new Error("Either password or pin is required");
    }

    const [created] = await db
      .insert(users)
      .values({
        business_id: requireBusinessId(),
        branch_id: requireBranchId(),
        username,
        name: full_name || [fname, lname].filter(Boolean).join(" ") || username,
        password_hash,
        pin_hash,
        ...(payload.id ? { id: payload.id } : {}),
        cancel_password: cancel_password || null,
        role: role || "employee",
        role_id: role_id || null,
        first_name: fname,
        last_name: lname,
        phone,
      })
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        role_id: users.role_id,
        first_name: users.first_name,
        last_name: users.last_name,
        phone: users.phone,
        created_at: users.created_at,
        is_active: users.is_active,
        password_hash: users.password_hash,
        pin_hash: users.pin_hash,
        meta: users.meta,
      });

    if (created) {
      await emitCreated(db, "user", "USER_CREATED", created as any);
    }
    return created;
  }

  async updateProfile(userId: string, payload: any) {
    const {
      full_name,
      username,
      first_name,
      last_name,
      phone,
      role_id,
    } = payload;

    let fname = first_name;
    let lname = last_name;
    if (full_name && !first_name && !last_name) {
      const parts = full_name.split(" ");
      fname = parts[0] || "";
      lname = parts.slice(1).join(" ") || "";
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.branch_id, requireBranchId())))
      .limit(1);
    if (!existing) {
      throw new Error("User not found");
    }

    const updates: Record<string, any> = {};
    if (username !== undefined) updates.username = username;
    if (fname !== undefined) updates.first_name = fname;
    if (lname !== undefined) updates.last_name = lname;
    if (phone !== undefined) updates.phone = phone;
    if (role_id !== undefined) updates.role_id = role_id;

    if (Object.keys(updates).length === 0) {
      throw new Error("No fields to update");
    }

    const [updated] = await db
      .update(users)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        role_id: users.role_id,
        first_name: users.first_name,
        last_name: users.last_name,
        phone: users.phone,
        updated_at: users.updated_at,
        is_active: users.is_active,
        meta: users.meta,
      });

    if (updated) {
      await emitUpdated(db, "user", "USER_UPDATED", updated as any);
    }
    return updated;
  }
}
