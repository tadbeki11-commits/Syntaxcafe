import { useState, useEffect, useMemo } from "react";
import services from "@/application";
import { api as httpApi, isOnline } from "@/infrastructure/api/http-client";
import toast from "react-hot-toast";
import { EmployeeSummary, EmployeeDetailsData } from "../types";

const LIVE_ORDER_TYPE = "cafe";

const parseNumber = (value: unknown): number => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const parseList = (payload: any, ...keys: string[]) => {
  for (const key of keys) {
    const value =
      payload?.data?.data?.[key] ?? payload?.data?.[key] ?? payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const getEmployeeIdFromOrder = (order: any): string | null => {
  const candidate =
    order?.employee_id ?? order?.waiter_id ?? order?.created_by_id;
  if (candidate == null) return null;
  const id = String(candidate).trim();
  return id ? id : null;
};

const getEmployeeName = (user: any, fallbackId: string) => {
  const name = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    user?.full_name ||
    user?.name ||
    user?.username ||
    `Employee #${fallbackId}`
  );
};

export const useEmployeeData = () => {
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [details, setDetails] = useState<EmployeeDetailsData | null>(null);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);

  const selectedEmployee = useMemo(() => {
    const id =
      selectedEmployeeId && selectedEmployeeId !== "all"
        ? selectedEmployeeId
        : null;
    if (id === null || (id === "")) return null;
    return (
      employees.find((e) => String(e.employee_id) === id) || null
    );
  }, [employees, selectedEmployeeId]);

  const allEmployeesSummary = useMemo(() => {
    return (Array.isArray(employees) ? employees : []).reduce(
      (acc, e) => {
        acc.orders_total += parseNumber(e?.orders_total || 0);
        acc.paid_total += parseNumber(e?.paid_total || 0);
        acc.unpaid_total += parseNumber(e?.unpaid_total || 0);
        acc.orders_count += parseNumber(e?.orders_count || 0);
        acc.payments_count += parseNumber(e?.payments_count || 0);
        return acc;
      },
      {
        orders_total: 0,
        paid_total: 0,
        unpaid_total: 0,
        orders_count: 0,
        payments_count: 0,
      },
    );
  }, [employees]);

  const activeSummary = selectedEmployee || allEmployeesSummary;

  const fetchLiveEmployeeOrders = async () => {
    const [usersResponse, ordersResponse] = await Promise.all([
      services.users.getAll(),
      httpApi.get("/orders", { params: { type: LIVE_ORDER_TYPE } }),
    ]);

    const users = parseList(usersResponse as any, "users");
    const rawOrders = parseList(ordersResponse as any, "orders");

    const usersById = new Map<string, any>();
    for (const user of users) {
      const id = user?.id != null ? String(user.id).trim() : "";
      if (id) {
        usersById.set(id, user);
      }
    }

    const normalizedOrders = (Array.isArray(rawOrders) ? rawOrders : [])
      .map((order: any) => {
        const employeeId = getEmployeeIdFromOrder(order);
        if (!employeeId) return null;
        const user = usersById.get(employeeId);
        return {
          ...order,
          id: String(order?.id ?? ""),
          employee_id: employeeId,
          employee_name:
            order?.employee_name || getEmployeeName(user, employeeId),
          total_amount: parseNumber(order?.total_amount),
          status: String(order?.status || "pending"),
          payment_status: order?.payment_status
            ? String(order.payment_status)
            : null,
          type: String(order?.type || LIVE_ORDER_TYPE),
          table_number: order?.table_number ?? null,
          created_at: order?.created_at ?? null,
        };
      })
      .filter(Boolean);

    const summaryByEmployee = new Map<string, EmployeeSummary>();

    for (const order of normalizedOrders) {
      const employeeId = order.employee_id;
      const existing = summaryByEmployee.get(employeeId) || {
        employee_id: employeeId,
        employee_name: order.employee_name || `Employee #${employeeId}`,
        orders_total: 0,
        paid_total: 0,
        unpaid_total: 0,
        orders_count: 0,
        payments_count: 0,
        last_order_at: null,
      };

      existing.orders_total += parseNumber(order.total_amount);
      existing.orders_count += 1;
      if (
        String(order.payment_status || "")
          .trim()
          .toLowerCase() === "paid"
      ) {
        existing.paid_total += parseNumber(order.total_amount);
        existing.payments_count += 1;
      } else {
        existing.unpaid_total += parseNumber(order.total_amount);
      }

      if (order.created_at) {
        const currentTime = existing.last_order_at
          ? new Date(existing.last_order_at).getTime()
          : 0;
        const nextTime = new Date(order.created_at).getTime();
        if (!currentTime || nextTime >= currentTime) {
          existing.last_order_at = order.created_at;
        }
      }

      summaryByEmployee.set(employeeId, existing);
    }

    const summaryList = Array.from(summaryByEmployee.values()).sort(
      (left, right) => {
        if (right.orders_count !== left.orders_count)
          return right.orders_count - left.orders_count;
        return right.orders_total - left.orders_total;
      },
    );

    setEmployees(summaryList);
    setLiveOrders(normalizedOrders);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await fetchLiveEmployeeOrders();
      } catch {
        toast.error(
          isOnline()
            ? "Failed to load employee orders"
            : "Offline data unavailable",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId || selectedEmployeeId === "all") {
      setDetails(null);
      return;
    }

    const employeeId = selectedEmployeeId;

    const orders = liveOrders
      .filter((order) => String(order.employee_id) === employeeId)
      .sort((left, right) => {
        const leftTime = left?.created_at
          ? new Date(left.created_at).getTime()
          : 0;
        const rightTime = right?.created_at
          ? new Date(right.created_at).getTime()
          : 0;
        return rightTime - leftTime;
      });

    setDetails({ orders });
  }, [selectedEmployeeId, liveOrders]);

  return {
    loading,
    selectedEmployeeId,
    setSelectedEmployeeId,
    employees,
    details,
    selectedEmployee,
    allEmployeesSummary,
    activeSummary,
  };
};

export default useEmployeeData;
