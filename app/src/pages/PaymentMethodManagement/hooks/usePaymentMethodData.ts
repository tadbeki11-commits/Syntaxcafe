import React, { useState, useEffect, useCallback } from "react";
import api from "@/application";
import {
  PaymentMethod,
  PaymentMethodFormData,
  DEFAULT_PAYMENT_METHOD_FORM,
} from "../types";
import toast from "react-hot-toast";

export const usePaymentMethodData = () => {
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    ...DEFAULT_PAYMENT_METHOD_FORM,
  });
  const [saving, setSaving] = useState(false);

  const fetchMethods = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.settings.getPaymentMethods();
      const list =
        (response as any)?.data?.data?.payment_methods ??
        (response as any)?.data?.payment_methods ??
        [];
      setMethods(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const openAdd = () => {
    setSelectedMethod(null);
    setFormData({ ...DEFAULT_PAYMENT_METHOD_FORM });
    setDialogOpen(true);
  };

  const openEdit = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setFormData({
      name: method.name,
      display_name: method.display_name,
      icon: method.icon || "",
      description: method.description || "",
      is_active: method.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim() || !formData.name.trim()) {
      toast.error("Display name and system name are required");
      return;
    }
    try {
      setSaving(true);
      if (selectedMethod) {
        await api.settings.updatePaymentMethod(selectedMethod.id, formData);
        toast.success("Payment method updated");
      } else {
        await api.settings.createPaymentMethod(formData);
        toast.success("Payment method created");
      }
      setDialogOpen(false);
      fetchMethods();
    } catch {
      toast.error("Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (
      !window.confirm(
        `Disable "${method.display_name}"? This hides it from the cashier payment selection.`,
      )
    )
      return;
    try {
      await api.settings.deletePaymentMethod(method.id);
      toast.success("Payment method disabled");
      fetchMethods();
    } catch {
      toast.error("Failed to disable payment method");
    }
  };

  return {
    loading,
    methods,
    dialogOpen,
    setDialogOpen,
    selectedMethod,
    formData,
    setFormData,
    saving,
    openAdd,
    openEdit,
    handleSubmit,
    handleDelete,
    fetchMethods,
  };
};

export default usePaymentMethodData;
