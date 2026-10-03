import { LocalStorageProvider } from "@/lib/storage/local";
import { SupabaseStorageProvider } from "@/lib/storage/supabase";
import type { StorageProvider } from "@/lib/storage/types";

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const driver = process.env.PLIM_STORAGE_DRIVER ?? "local";
  cached = driver === "supabase" ? new SupabaseStorageProvider() : new LocalStorageProvider();
  return cached;
}
