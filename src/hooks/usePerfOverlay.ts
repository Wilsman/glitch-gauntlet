import { useSyncExternalStore } from "react";
import { toast } from "@/components/ui/sonner";
import { perfMonitor, type PerfOverlayMode } from "@/lib/perfMonitor";

export function usePerfOverlayMode(): PerfOverlayMode {
  return useSyncExternalStore(
    (onChange) => perfMonitor.onModeChange(onChange),
    () => perfMonitor.getMode(),
  );
}

export function exportPerfLog() {
  perfMonitor.exportLog();
  toast.success("Performance log exported", { description: "Send the downloaded .json file to the dev team." });
}
