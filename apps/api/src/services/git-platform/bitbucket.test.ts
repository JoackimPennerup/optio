import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RepoIdentifier } from "@optio/shared";
import { BitbucketPlatform } from "./bitbucket.js";

const ri: RepoIdentifier = {
  platform: "bitbucket",
  host: "git.example.com",
  owner: "PRJ",
  repo: "app",
  apiBaseUrl: "https://git.example.com/rest/api/latest",
};
const row = {
  id: 42,
  title: "Improve app",
  description: "Details",
  state: "OPEN",
  version: 3,
  fromRef: {
    displayId: "feature",
    latestCommit: "abc",
    repository: { project: { key: "PRJ" }, slug: "app" },
  },
  toRef: { displayId: "main" },
  author: { user: { name: "alice" } },
  reviewers: [],
  createdDate: 1700000000000,
  updatedDate: 1700000001000,
};

describe("BitbucketPlatform", () => {
  const api = new BitbucketPlatform("secret-token");
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("maps a pull request and sends the token only to its REST host", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(row), { status: 200 }));
    const pr = await api.getPullRequest(ri, 42);
    expect(pr).toMatchObject({
      number: 42,
      headSha: "abc",
      headBranch: "feature",
      baseBranch: "main",
      author: "alice",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://git.example.com/rest/api/latest/projects/PRJ/repos/app/pull-requests/42",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
      }),
    );
  });

  it("refuses to merge after the source branch moved", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(row), { status: 200 }));
    await expect(api.mergePullRequest(ri, 42, "merge", "old-head")).rejects.toThrow("head changed");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("sends the merge strategy in the 8.9 request body", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(row), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...row, state: "MERGED" }), { status: 200 }),
      );
    await api.mergePullRequest(ri, 42, "squash", "abc");
    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(String(url)).toContain("/pull-requests/42/merge?version=3");
    expect(JSON.parse(String(init?.body))).toEqual({ version: 3, strategyId: "squash" });
  });

  it("uses Bitbucket's nextPageStart while listing pull requests", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ values: [row], isLastPage: false, nextPageStart: 2 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ values: [{ ...row, id: 43 }], isLastPage: true }), {
          status: 200,
        }),
      );
    const prs = await api.listOpenPullRequests(ri);
    expect(prs.map((pr) => pr.number)).toEqual([42, 43]);
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("start=2");
  });
});
