import type { AgentContainerConfig, AgentTaskInput } from "@optio/shared";
import { OpenCodeAdapter } from "./opencode.js";

/** Kilo CLI emits the same part events as OpenCode, but has its own executable,
 * configuration directory and automatic approval flag. */
export class KiloAdapter extends OpenCodeAdapter {
  override readonly type = "kilo";
  override readonly displayName = "Kilo CLI";

  override validateSecrets(availableSecrets: string[]): { valid: boolean; missing: string[] } {
    const valid = availableSecrets.includes("KILO_API_KEY");
    return { valid, missing: valid ? [] : ["KILO_API_KEY"] };
  }

  override buildContainerConfig(input: AgentTaskInput): AgentContainerConfig {
    const config = super.buildContainerConfig(input);
    config.env.OPTIO_AGENT_TYPE = "kilo";
    config.requiredSecrets = input.opencodeBaseUrl ? [] : ["KILO_API_KEY"];
    config.setupFiles = config.setupFiles?.map((file) => {
      if (file.path === "/home/agent/.config/opencode/opencode.json") {
        return {
          ...file,
          path: "/home/agent/.config/kilo/kilo.json",
          content: file.content.replace(
            "https://opencode.ai/config.json",
            "https://app.kilo.ai/config.json",
          ),
        };
      }
      if (file.path === "/home/agent/.config/opencode/AGENTS.md") {
        return { ...file, path: "/home/agent/.config/kilo/AGENTS.md" };
      }
      return file;
    });
    return config;
  }
}
