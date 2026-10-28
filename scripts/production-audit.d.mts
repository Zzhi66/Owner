export interface ManifestChunk {
  file?: string;
  isEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  src?: string;
}
export function initialChunks(manifest: Record<string, ManifestChunk>): string[];
export function assertProductionCode(source: string, file?: string): void;
export function auditProduction(directory: string): Promise<void>;
