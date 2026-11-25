import type { ProviderCatalog } from "./types.js";

/** Kilo's model namespace and run flags mirror OpenCode's. The existing repo
 * model, agent and endpoint fields are shared so a runtime switch needs no
 * repository migration. */
export const KILO_CATALOG: ProviderCatalog = {
  provider: "kilo",
  label: "Kilo CLI",
  modelField: "opencodeModel",
  modelIsFreeText: true,
  modelPlaceholder: "Default (Kilo configuration)",
  modelHelpText: "Provider/model, for example anthropic/claude-sonnet-4",
  models: [],
  aliases: {},
  options: [
    { key: "opencodeAgent", label: "Agent", kind: "text", placeholder: "Default" },
    {
      key: "opencodeBaseUrl",
      label: "Custom Base URL",
      kind: "text",
      placeholder: "https://your-inference-server/v1",
      helpText: "OpenAI-compatible endpoint URL.",
    },
  ],
  liveRefreshSupported: false,
};
