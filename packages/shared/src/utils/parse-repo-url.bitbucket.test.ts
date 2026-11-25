import { afterEach, describe, expect, it, vi } from "vitest";
import {
  knownHostPlatform,
  parsePrUrl,
  parseRepoUrl,
  resolveRepoPlatform,
} from "./parse-repo-url.js";

afterEach(() => vi.unstubAllEnvs());

describe("Bitbucket Server / Data Center URLs", () => {
  it("recognizes a configured host and its clone URL", () => {
    vi.stubEnv("BITBUCKET_HOSTS", "git.example.com");
    expect(knownHostPlatform("git.example.com")).toBe("bitbucket");
    expect(parseRepoUrl("https://git.example.com/scm/PRJ/app.git")).toEqual({
      platform: "bitbucket",
      host: "git.example.com",
      owner: "PRJ",
      repo: "app",
      apiBaseUrl: "https://git.example.com/rest/api/latest",
    });
  });

  it("recognizes a pull request URL on an unknown host without sending GitHub credentials", () => {
    const url = "https://git.example.com/projects/PRJ/repos/app/pull-requests/42";
    expect(resolveRepoPlatform(url)).toBe("bitbucket");
    expect(parsePrUrl(url)).toMatchObject({
      platform: "bitbucket",
      owner: "PRJ",
      repo: "app",
      prNumber: 42,
    });
  });
});
