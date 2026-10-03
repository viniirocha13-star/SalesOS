import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import type { StorageProvider } from "@/lib/storage/types";

const ROOT = process.env.PLIM_STORAGE_LOCAL_DIR ?? path.join(process.cwd(), ".plim-storage");

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local_disk";

  private fullPath(rel: string) {
    const safe = rel.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(/* turbopackIgnore: true */ ROOT, safe);
  }

  async upload(rel: string, data: Buffer, _contentType: string) {
    const full = this.fullPath(rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return { path: rel, url: `/api/plim/storage/${encodeURIComponent(rel)}` };
  }

  async delete(rel: string) {
    try {
      await unlink(this.fullPath(rel));
    } catch {
      // ignore missing
    }
  }

  getPublicUrl(rel: string) {
    return `/api/plim/storage/${encodeURIComponent(rel)}`;
  }
}
