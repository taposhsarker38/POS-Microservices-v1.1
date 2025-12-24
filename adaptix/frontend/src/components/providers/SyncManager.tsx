"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/offline/OfflineStore";
import axios from "axios";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8101/api";

export function SyncManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updatePendingCount = async () => {
      const count = await db.syncQueue.count();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000); // Check every 5s

    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    if (navigator.onLine) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const processSyncQueue = async () => {
    const pendingItems = await db.syncQueue
      .where("status")
      .equals("pending")
      .toArray();
    if (pendingItems.length === 0) {
      setPendingCount(0);
      return;
    }

    console.info(`SyncManager: Syncing ${pendingItems.length} items`);
    setIsSyncing(true);
    setPendingCount(pendingItems.length);

    const token = localStorage.getItem("access_token");

    for (const item of pendingItems) {
      try {
        await db.syncQueue.update(item.id!, { status: "syncing" });

        await axios({
          method: item.method,
          url: `${API_URL}${item.url}`,
          data: item.data,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        await db.syncQueue.delete(item.id!);
        const newCount = await db.syncQueue.count();
        setPendingCount(newCount);
      } catch (error) {
        console.error(`SyncManager: Sync failed for ${item.url}`, error);
        await db.syncQueue.update(item.id!, { status: "pending" });
        break;
      }
    }

    setIsSyncing(false);
    const finalCount = await db.syncQueue.count();
    setPendingCount(finalCount);
    if (finalCount === 0) {
      toast.success("All offline data synchronized!");
    }
  };

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 animate-pulse transition-all duration-300">
        <span className="w-2 h-2 bg-white rounded-full"></span>
        Offline Mode {pendingCount > 0 && `(${pendingCount} pending)`}
      </div>
    );
  }

  if (isSyncing || pendingCount > 0) {
    return (
      <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 transition-all duration-300">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        {isSyncing
          ? `Syncing ${pendingCount} items...`
          : `${pendingCount} items pending sync`}
      </div>
    );
  }

  return null;
}
