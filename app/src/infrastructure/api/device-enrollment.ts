import { api } from "@/infrastructure/api/http-client";
import {
  setDeviceEnrollment,
  type DeviceEnrollment,
} from "@/shared/utils/deviceToken";

interface EnrollResponse {
  token: string;
  business_id: string;
  branch_id: string;
}

/**
 * Redeems a one-time enrollment code for a long-lived device token and persists
 * it. After this resolves, every subsequent API/sync call carries the device's
 * x-device-token header (attached by the http-client interceptor).
 */
export const enrollDevice = async (
  code: string,
  deviceName?: string,
): Promise<DeviceEnrollment> => {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Enrollment code is required");

  const { data } = await api.post<EnrollResponse>("/devices/enroll", {
    code: trimmed,
    device_name: deviceName?.trim() || undefined,
  });

  if (!data?.token) {
    throw new Error("Enrollment failed: no token returned");
  }

  const enrollment: DeviceEnrollment = {
    token: data.token,
    businessId: data.business_id,
    branchId: data.branch_id,
    deviceName: deviceName?.trim() || null,
    enrolledAt: new Date().toISOString(),
  };
  await setDeviceEnrollment(enrollment);
  return enrollment;
};
