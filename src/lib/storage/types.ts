export interface StorageProvider {
  readonly name: string;
  upload(path: string, data: Buffer, contentType: string): Promise<{ url: string; path: string }>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}
