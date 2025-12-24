import Dexie, { type Table } from "dexie";

export interface SyncItem {
  id?: number;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  data: any;
  timestamp: number;
  status: "pending" | "syncing" | "failed";
}

export interface CacheItem {
  key: string; // URL
  data: any;
  expiresAt: number;
}

export class OfflineDB extends Dexie {
  syncQueue!: Table<SyncItem>;
  cache!: Table<CacheItem>;

  constructor() {
    super("AdaptixOfflineDB");
    this.version(1).stores({
      syncQueue: "++id, status, timestamp",
      cache: "key, expiresAt",
    });
  }
}

export const db = new OfflineDB();
