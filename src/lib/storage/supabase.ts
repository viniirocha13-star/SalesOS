import { createClient } from "@supabase/supabase-js";
import type { StorageProvider } from "@/lib/storage/types";

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";
  private bucket: string;
  private client: ReturnType<typeof createClient>;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "plim";
    if (!url || !key) throw new Error("Supabase Storage não configurado.");
    this.client = createClient(url, key);
  }

  async upload(path: string, data: Buffer, contentType: string) {
    const { error } = await this.client.storage.from(this.bucket).upload(path, data, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    return { path, url: this.getPublicUrl(path) };
  }

  async delete(path: string) {
    await this.client.storage.from(this.bucket).remove([path]);
  }

  getPublicUrl(path: string) {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
