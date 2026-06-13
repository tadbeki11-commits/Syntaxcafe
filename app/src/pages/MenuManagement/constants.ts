import { MenuFormData } from "./types";

export const FASTING_SUB = ["Break fast", "Lunch", "Extra"];

export const DEFAULT_FORM: MenuFormData = {
  name: "",
  description: "",
  price: "",
  category: "cafe",
  main_category: "barista",
  tags: "",
  sub_category: "",
  is_available: true,
  image_base64: "",
  prep_time_minutes: "",
  sku: "",
  barcode: "",
};
