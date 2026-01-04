import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

/**
 * Handles API errors by mapping validation errors to form fields
 * and showing toast notifications for generic errors.
 */
export const handleApiError = (
  error: any,
  form?: UseFormReturn<any>,
  defaultMessage: string = "Something went wrong"
) => {
  console.error("API Error Trace:", error);
  const errorData = error.response?.data;

  if (errorData && typeof errorData === "object") {
    // 1. Handle field-specific validation errors (400 Bad Request)
    if (form) {
      Object.keys(errorData).forEach((key) => {
        // DRF often uses 'non_field_errors' or 'detail' for errors that don't belong to a specific field
        if (key === "non_field_errors" || key === "detail") {
          toast.error(
            Array.isArray(errorData[key])
              ? errorData[key][0]
              : String(errorData[key])
          );
        } else {
          // Map to correct field if it exists in the form
          form.setError(key as any, {
            type: "manual",
            message: Array.isArray(errorData[key])
              ? errorData[key][0]
              : String(errorData[key]),
          });
        }
      });

      // Show the first error found in the toast for immediate feedback
      const firstKey = Object.keys(errorData).find(
        (k) => k !== "non_field_errors" && k !== "detail"
      );
      if (firstKey) {
        const message = Array.isArray(errorData[firstKey])
          ? errorData[firstKey][0]
          : String(errorData[firstKey]);
        toast.error(`${message} (${firstKey})`);
      }
    } else {
      // No form provided, just show toasts for what we found
      if (errorData.detail || errorData.non_field_errors) {
        toast.error(
          errorData.detail ||
            (Array.isArray(errorData.non_field_errors)
              ? errorData.non_field_errors[0]
              : errorData.non_field_errors)
        );
      } else {
        // Try to show the first error found
        const firstKey = Object.keys(errorData)[0];
        const message = Array.isArray(errorData[firstKey])
          ? errorData[firstKey][0]
          : String(errorData[firstKey]);
        toast.error(`${firstKey}: ${message}`);
      }
    }
  } else if (error.response?.status === 401) {
    toast.error("Session expired. Please login again.");
  } else if (error.message === "Network Error") {
    toast.error("Network error. Please check your connection.");
  } else {
    // If we have a string response from backend (e.g. 500 HTML or Kong message)
    const customMsg =
      typeof error.response?.data === "string"
        ? error.response.data.substring(0, 100)
        : defaultMessage;
    toast.error(customMsg);
  }
};

/**
 * Standardized success handler
 */
export const handleApiSuccess = (message: string) => {
  toast.success(message);
};
