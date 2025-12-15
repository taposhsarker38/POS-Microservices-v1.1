import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Employee,
  Department,
  Designation,
  LeaveApplication,
  LeaveType,
} from "@/lib/types";

export const useEmployees = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await api.get("/hrms/employees/list/");
      return response.data.results as Employee[];
    },
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const response = await api.get("/hrms/employees/departments/");
      return response.data.results as Department[];
    },
  });
};

export const useLeaves = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leaves"],
    queryFn: async () => {
      const response = await api.get("/hrms/leaves/applications/");
      return response.data.results as LeaveApplication[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<LeaveApplication>) => {
      const response = await api.post("/hrms/leaves/applications/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });

  return { ...query, createLeave: createMutation.mutateAsync };
};
