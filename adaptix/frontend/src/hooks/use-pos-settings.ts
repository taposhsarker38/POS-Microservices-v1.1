import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const usePOSSettings = (companyUuid?: string) => {
  const { data, error, isLoading } = useQuery({
    queryKey: ["pos-settings", companyUuid],
    queryFn: async () => {
      if (!companyUuid) return null;
      const res = await api.get(`/pos/settings/?company_uuid=${companyUuid}`);
      return (
        res.data?.[0] || {
          allow_partial_payment: true,
          allow_split_payment: true,
        }
      );
    },
    enabled: !!companyUuid,
  });

  return {
    settings: data,
    isLoading,
    isError: error,
  };
};

export default usePOSSettings;
