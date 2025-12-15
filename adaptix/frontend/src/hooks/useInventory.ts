import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Stock, StockTransaction, Warehouse } from "@/lib/types";

export const useStock = () => {
  return useQuery({
    queryKey: ["stocks"],
    queryFn: async () => {
      const response = await api.get("/inventory/stocks/");
      return response.data.results as Stock[];
    },
  });
};

export const useTransactions = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (
      data: Partial<StockTransaction> & {
        product_uuid?: string;
        warehouse?: string;
      }
    ) => {
      // Logic might need to find the correct stock ID first or backend handles it
      // For now assuming we post to transactions directly
      const response = await api.post("/inventory/transactions/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  return { createTransaction: mutation.mutateAsync };
};
