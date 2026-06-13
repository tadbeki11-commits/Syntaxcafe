import { useState, useCallback } from "react";

export interface FormData {
  pin: string;
  username: string;
  password: string;
}

export const useLoginForm = (initialPhase: string) => {
  const [formData, setFormData] = useState<FormData>({
    pin: "",
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => {
      if (prev[name]) {
        return {
          ...prev,
          [name]: "",
        };
      }
      return prev;
    });
  }, []);

  const handlePinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value || "";
      value = value.replace(/\D/g, "").slice(0, 4);
      setFormData((prev) => ({ ...prev, pin: value }));
      setErrors((prev) => (prev.pin ? { ...prev, pin: "" } : prev));
      setActiveField("pin");
    },
    [],
  );

  const handlePinInput = (digit: string) => {
    if (formData.pin.length < 4) {
      setFormData((prev) => ({
        ...prev,
        pin: prev.pin + digit,
      }));

      if (errors.pin) {
        setErrors((prev) => ({
          ...prev,
          pin: "",
        }));
      }
    }
  };

  const handlePinBackspace = () => {
    setFormData((prev) => ({
      ...prev,
      pin: prev.pin.slice(0, -1),
    }));
  };

  const clearPin = () => {
    setFormData((prev) => ({
      ...prev,
      pin: "",
    }));
  };

  const validateForm = (phase: string) => {
    const newErrors: Record<string, string> = {};

    if (phase === "pin-entry" || phase === "waiter-username-pin") {
      if (!formData.pin || formData.pin.length !== 4) {
        newErrors.pin = "Please enter a 4-digit PIN";
      }
      if (!formData.username.trim()) {
        newErrors.username = "Username is required";
      }
    } else if (phase === "admin") {
      if (!formData.username.trim()) {
        newErrors.username = "Username is required";
      }

      if (!formData.password) {
        newErrors.password = "Password is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      pin: "",
      username: "",
      password: "",
    });
    setErrors({});
    setShowPassword(false);
    setActiveField(null);
  };

  return {
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    errors,
    setErrors,
    isLoading,
    setIsLoading,
    activeField,
    setActiveField,
    handleChange,
    handlePinChange,
    handlePinInput,
    handlePinBackspace,
    clearPin,
    validateForm,
    resetForm,
  };
};
