import { describe, expect, it } from "vitest";
import { KiloAdapter } from "./kilo.js";
import { getAdapter } from "./index.js";

const adapter = new KiloAdapter();
const input = {
  taskId: "task-1",
  prompt: "Fix it",
  repoUrl: "https://github.com/acme/repo",
  repoBranch: "main",
};

describe("KiloAdapter", () => {
  it("uses Kilo's identity, config and gateway secret", () => {
    expect(getAdapter("kilo")).toBeInstanceOf(KiloAdapter);
    const config = adapter.buildContainerConfig(input);
    expect(config.env.OPTIO_AGENT_TYPE).toBe("kilo");
    expect(config.requiredSecrets).toEqual(["KILO_API_KEY"]);
    expect(config.setupFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/home/agent/.config/kilo/kilo.json" }),
      ]),
    );
    expect(config.setupFiles?.some((file) => file.path.includes("/opencode/"))).toBe(false);
  });

  it("accepts a custom endpoint without a Kilo key", () => {
    const config = adapter.buildContainerConfig({
      ...input,
      opencodeBaseUrl: "https://models.example/v1",
    });
    expect(config.requiredSecrets).toEqual([]);
    expect(config.env.OPENAI_BASE_URL).toBe("https://models.example/v1");
  });

  it("reads Kilo's JSON events and pull request URL", () => {
    const result = adapter.parseResult(
      0,
      '{"type":"text","part":{"text":"Done"}}\nhttps://github.com/acme/repo/pull/4',
    );
    expect(result.summary).toBe("Done");
    expect(result.prUrl).toBe("https://github.com/acme/repo/pull/4");
  });
});
