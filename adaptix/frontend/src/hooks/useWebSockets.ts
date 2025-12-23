"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

export const useWebSockets = () => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    let company_uuid: string | null = null;
    try {
      const decoded: any = jwtDecode(token);
      company_uuid = decoded.company_uuid;
    } catch (e) {
      console.error("Failed to decode token", e);
    }

    // Use environment variable or fallback to the same port as Kong
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8101";

    const socket = io(socketUrl, {
      path: "/api/ws/socket.io",
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("Connected to WS Gateway");
      if (company_uuid) {
        socket.emit("join", `company_${company_uuid}`);
        console.log(`Joined room: company_${company_uuid}`);
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("Disconnected from WS Gateway");
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
};
