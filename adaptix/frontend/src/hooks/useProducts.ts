import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Product } from "@/lib/types";

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await api.get("/products/");
      return response.data.results as Product[];
    },
  });
};
