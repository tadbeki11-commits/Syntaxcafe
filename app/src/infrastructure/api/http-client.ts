import axios, {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import toast from "react-hot-toast";
import { getSessionUser } from "@/shared/utils/sessionUser";
import { getApproximateServerNow } from "@/shared/utils/serverTime";

export const normalizeBaseUrl = (url?: string): string => {
  const s = String(url || "").trim();
  if (!s) return "";
  return s.replace(/\/+$/, "");
};

export const resolveApiBaseUrl = (): string => {
  const configured = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  return configured || "";
};

export const API_BASE_URL = resolveApiBaseUrl();
const NETWORK_LOGOUT_FLAG_KEY = "network_logout_in_progress_v1";
const NETWORK_LOGOUT_COOLDOWN_MS = 30000;

export const handleNetworkLogout = () => {
  try {
    const prev = parseInt(
      sessionStorage.getItem(NETWORK_LOGOUT_FLAG_KEY) || "0",
      10,
    );
    const now = getApproximateServerNow();
    if (Number.isFinite(prev) && prev > 0 && now - prev < NETWORK_LOGOUT_COOLDOWN_MS)
      return;
    sessionStorage.setItem(NETWORK_LOGOUT_FLAG_KEY, String(now));
  } catch {
    // ignore
  }

  try {
    toast.error("Network error. Please check your connection and try again.");
  } catch {
    // ignore
  }
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
    "X-App-Client": "tauri-pos-app",
  },
});


export const isOnline = (): boolean => {
  try {
    if (
      typeof window !== "undefined" &&
      (window as any).isSyncOnline !== undefined
    ) {
      return !!(window as any).isSyncOnline;
    }
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  } catch (e) {
    return true;
  }
};

// Client-Side ESC/POS Thermal Print Ticket Payload Generator for Offline Mode (58mm/80mm compatible)
export function generateEscPosBase64(order: any, waiterName: string): string {
  const esc = "\u001B";
  const init = esc + "@"; // Initialize printer
  const center = esc + "a" + "\u0001"; // Center alignment
  const left = esc + "a" + "\u0000"; // Left alignment
  const right = esc + "a" + "\u0002"; // Right alignment
  const boldOn = esc + "E" + "\u0001"; // Bold text on
  const boldOff = esc + "E" + "\u0000"; // Bold text off
  const fontDouble = esc + "!" + "\u0038"; // Double size
  const fontNormal = esc + "!" + "\u0000"; // Normal size
  const line = "--------------------------------\n"; // 32 chars separator

  let ticket =
    init +
    center +
    boldOn +
    fontDouble +
    "CAFE SYSTEM\n" +
    fontNormal +
    boldOff;
  ticket += "OFFLINE CASHIER TICKET\n";
  ticket += line;
  if (order.table_number) {
    ticket += left + boldOn + `Table: #${order.table_number}\n` + boldOff;
  } else {
    ticket += left + boldOn + `Type: Take Away\n` + boldOff;
  }
  ticket += `Waiter: ${waiterName}\n`;
  ticket += `Date: ${new Date(order.created_at).toLocaleString()}\n`;
  ticket += line;
  ticket += left + boldOn + "Item         Qty   Price   Sub\n" + boldOff;
  ticket += line;

  order.items?.forEach((item: any) => {
    // Truncate item name to 12 chars to fit columns on 58mm printer
    const name = String(item.menu_item_name || "Item")
      .substring(0, 12)
      .padEnd(12, " ");
    const qty = String(item.quantity).padStart(3, " ");
    const price = parseFloat(item.unit_price).toFixed(0).padStart(5, " ");
    const sub = parseFloat(item.subtotal).toFixed(0).padStart(6, " ");
    ticket += `${name} ${qty} ${price} ${sub}\n`;
  });

  ticket += line;
  ticket +=
    right +
    boldOn +
    fontDouble +
    `TOTAL: ${parseFloat(order.total_amount).toFixed(2)} Birr\n` +
    fontNormal +
    boldOff;
  ticket += center + "\nThank You!\n\n\n\n" + esc + "m"; // Cut paper command

  // Base64 encode unicode string safely
  return btoa(unescape(encodeURIComponent(ticket)));
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const sessionUser = getSessionUser();
      const skipAuthRoutes = ["/auth/", "/health"];
      const needsAuth = !skipAuthRoutes.some((route) =>
        config.url?.includes(route),
      );

      if (needsAuth && sessionUser?.id) {
        const userId = String(sessionUser.id);

        if (userId && config.method !== "get") {
          if (config.data && typeof config.data === "object") {
            if (!config.data.user_id) {
              config.data.user_id = userId;
            }
          } else if (!config.data) {
            config.data = { user_id: userId };
          }
        }
      }
    } catch (error) {
      console.error("Error adding user ID to request:", error);
    }

    return config;
  },
  (error: any) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<any>) => {
    if (error.response) {
      const { status, data, config } = error.response;
      const isAuthEndpoint = config?.url?.includes("/auth/");

      if (!isAuthEndpoint) {
        switch (status) {
          case 401:
            console.error("Unauthorized access. Please login again.")
            break;
          case 403:
            console.warn("Access forbidden. Insufficient permissions.");
            break;
          case 404:
            console.warn("Resource not found:", config?.url);
            break;
          case 409:
            console.error(data?.message || "Conflict error occurred.");
            break;
          case 500:
            console.warn("Server error. Please try again later.");
            break;
          default:
            console.warn(data?.message || "An error occurred.");
        }
      }
    } else if (error.request) {
      handleNetworkLogout();
    } else {
      toast.error("An unexpected error occurred.");
    }

    return Promise.reject(error);
  },
);

// Stubbed response for endpoints that do not exist in the backend
export const notImplemented = <T>(
  moduleName: string,
): Promise<AxiosResponse<import("@/types/api.types").ApiResponse<T>>> => {
  console.warn(
    `[API STUB] The backend module '${moduleName}' is not implemented yet.`,
  );
  return Promise.resolve({
    data: { status: "success", data: [] as any },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as any,
  });
};
