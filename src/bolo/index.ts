import type { BoloDevice } from "./BoloDevice";
import { SimBolo } from "./SimBolo";

/**
 * The single place SimBolo is constructed (BUILD.md §5). Screens and the beat
 * engine take a BoloDevice; only the debug panel reaches for the concrete SimBolo,
 * via getSimBolo(). When the BLE device exists, this factory returns that instead
 * and nothing else changes.
 */

let device: SimBolo | null = null;

export function getBolo(): BoloDevice {
  if (!device) device = new SimBolo();
  return device;
}

/**
 * Sim-only accessor for the debug panel. Returns null once a non-sim device is in
 * use, so dev tooling degrades rather than breaking a real build.
 */
export function getSimBolo(): SimBolo | null {
  return device instanceof SimBolo ? device : null;
}

export type { BoloDevice } from "./BoloDevice";
