import { getApproximateServerNow } from "@/shared/utils/serverTime";

export const generateLocalId = (): string =>
  `local_${getApproximateServerNow()}_${Math.random().toString(36).slice(2, 11)}`;

export const generateEventId = (): string =>
  `evt_${getApproximateServerNow()}_${Math.random().toString(36).slice(2, 9)}`;
