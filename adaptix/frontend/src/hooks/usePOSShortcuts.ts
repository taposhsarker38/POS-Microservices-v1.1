import { useEffect } from "react";

interface POSShortcuts {
  onSearch?: () => void;
  onCheckout?: () => void;
  onClearCart?: () => void;
  onFocusGrid?: () => void;
  onExactChange?: () => void;
  onQuickPay?: (amount: number) => void;
}

export const usePOSShortcuts = (handlers: POSShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Search: Alt + S or /
      if (
        (e.altKey && e.key === "s") ||
        (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT")
      ) {
        e.preventDefault();
        handlers.onSearch?.();
      }

      // Checkout: Alt + X or Enter (if not in input)
      if (e.altKey && e.key === "x") {
        e.preventDefault();
        handlers.onCheckout?.();
      }

      // Clear Cart: Alt + C
      if (e.altKey && e.key === "c") {
        e.preventDefault();
        handlers.onClearCart?.();
      }

      // Focus Grid: Alt + G
      if (e.altKey && e.key === "g") {
        e.preventDefault();
        handlers.onFocusGrid?.();
      }

      // Quick Pay Denominations (Shift + 1, 2, 3...)
      if (e.shiftKey) {
        const amounts: Record<string, number> = {
          "1": 10,
          "2": 20,
          "3": 50,
          "4": 100,
        };
        if (amounts[e.key]) {
          e.preventDefault();
          handlers.onQuickPay?.(amounts[e.key]);
        }

        if (e.key === "Enter") {
          e.preventDefault();
          handlers.onExactChange?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
};
