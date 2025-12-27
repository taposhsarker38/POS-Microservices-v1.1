"use client";

import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

export function useCompany() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userUuid, setUserUuid] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setCompanyId(decoded.company_uuid || null);
        setUserUuid(decoded.user_uuid || null);
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }
  }, []);

  return { companyId, userUuid };
}
