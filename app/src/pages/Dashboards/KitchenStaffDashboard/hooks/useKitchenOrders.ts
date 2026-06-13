import api from "@/application";
import toast from "react-hot-toast";

export const useKitchenOrders = (onDataRefresh: () => Promise<void>) => {
  const formatCurrency = (val: any) => {
    const n = parseFloat(val);
    const safe = Number.isFinite(n) ? n : 0;
    return `${safe.toLocaleString()} Birr`;
  };

  const startPreparing = async (orderId: any, userId?: string | number) => {
    try {
      await api.orders.updateStatus(orderId, {
        status: "preparing",
        updated_by: userId,
      });
      toast.success("Order moved to preparing!");
      await onDataRefresh();
      return true;
    } catch (error) {
      console.error("Error starting preparation:", error);
      toast.error("Failed to update order status");
      return false;
    }
  };

  const markOrderReady = async (orderId: any, userId?: string | number) => {
    try {
      await api.orders.markReady(orderId, { updated_by: userId });
      toast.success("Order marked as ready!");
      await onDataRefresh();
      return true;
    } catch (error) {
      console.error("Error marking order ready:", error);
      toast.error("Failed to mark order as ready");
      return false;
    }
  };

  return {
    formatCurrency,
    startPreparing,
    markOrderReady,
  };
};
