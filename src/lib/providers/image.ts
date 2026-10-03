export interface ImageProvider {
  resize(): Promise<{ ok: boolean }>;
  applyWatermark(): Promise<{ ok: boolean }>;
}

export class SimulationImageProvider implements ImageProvider {
  async resize() {
    return { ok: true };
  }
  async applyWatermark() {
    return { ok: true };
  }
}

export function getImageProvider() {
  return new SimulationImageProvider();
}
