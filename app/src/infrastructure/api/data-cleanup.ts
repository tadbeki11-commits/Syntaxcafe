import { api } from "@/infrastructure/api/http-client";

// Mirrors the backend data_cleanup_requests row (subset the desktop cares about).
export interface CleanupRequest {
  id: string;
  branch_id: string;
  device_id: string | null;
  device_name: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  reason: string | null;
  requested_at: string | null;
}

/** Ask the owner to approve wiping this device's local data. */
export const createCleanupRequest = async (
  reason?: string,
): Promise<CleanupRequest> => {
  const { data } = await api.post<CleanupRequest>("/data-cleanup/requests", {
    reason: reason?.trim() || undefined,
  });
  return data;
};

/** Latest pending/approved cleanup request for this device, or null. */
export const getActiveCleanupRequest =
  async (): Promise<CleanupRequest | null> => {
    const { data } = await api.get<CleanupRequest | null>(
      "/data-cleanup/requests/active",
    );
    return data ?? null;
  };

/**
 * Confirm the device has wiped: the backend deletes this branch's orders &
 * payments and marks the request completed.
 */
export const completeCleanupRequest = async (
  id: string,
): Promise<CleanupRequest> => {
  const { data } = await api.post<CleanupRequest>(
    `/data-cleanup/requests/${id}/complete`,
  );
  return data;
};
