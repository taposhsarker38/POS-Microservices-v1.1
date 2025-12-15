import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

interface ApiErrorResponse {
  [key: string]: string[] | string | any;
}

/**
 * Handles API errors by setting form errors and showing toast notifications.
 *
 * @param error The error object returned from the API (Axios error).
 * @param form The react-hook-form instance (optional). If provided, field-specific errors will be set.
 * @param globalMessage Optional fallback message if no specific error is found.
 */
export function handleApiError(
  error: any,
  form?: UseFormReturn<any>,
  globalMessage: string = "Something went wrong"
) {
  const responseData = error.response?.data as ApiErrorResponse;

  if (!responseData) {
    toast.error(globalMessage);
    return;
  }

  // 1. Handle "detail" or "message" (Common Global Errors)
  if (responseData.detail) {
    toast.error(
      typeof responseData.detail === "string"
        ? responseData.detail
        : "An error occurred"
    );
    // Don't return, in case there are also field errors (rare but possible)
  }

  if (responseData.message) {
    toast.error(
      typeof responseData.message === "string"
        ? responseData.message
        : globalMessage
    );
  }

  // 2. Handle non_field_errors (Django specific)
  if (
    responseData.non_field_errors &&
    Array.isArray(responseData.non_field_errors)
  ) {
    responseData.non_field_errors.forEach((err) => toast.error(err));
  }

  // 3. Handle Field-Specific Errors (if form is provided)
  if (form && typeof responseData === "object") {
    Object.keys(responseData).forEach((field) => {
      // Skip global keys
      if (["detail", "code", "messages", "non_field_errors"].includes(field))
        return;

      const messages = responseData[field];
      const message = Array.isArray(messages) ? messages[0] : messages;

      if (typeof message === "string") {
        // Check if field exists in form
        // @ts-ignore
        if (form.getValues(field) !== undefined) {
          form.setError(field, { type: "server", message });
        } else {
          // If field doesn't exist in form (e.g., hidden Logic), show as toast
          toast.error(`${field}: ${message}`);
        }
      }
    });
  }
}
