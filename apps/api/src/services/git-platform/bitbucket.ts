import type {
  Branch,
  BrowsableRepository,
  CICheck,
  GitPlatform,
  InlineComment,
  Issue,
  IssueComment,
  PlatformLocation,
  PullRequest,
  RepoContent,
  RepoIdentifier,
  RepoMetadata,
  Review,
} from "@optio/shared";

type Json = Record<string, any>;
type Page<T> = { values?: T[]; isLastPage?: boolean; nextPageStart?: number };

/** Bitbucket Server / Data Center (Server) REST API. `owner` is its project key. */
export class BitbucketPlatform implements GitPlatform {
  readonly type = "bitbucket" as const;

  constructor(private readonly token: string) {}

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Bitbucket API ${response.status}: ${detail.slice(0, 500)}`);
    }
    if (response.status === 204 || response.status === 205) return undefined as T;
    return response.json() as Promise<T>;
  }

  private repoUrl(ri: RepoIdentifier): string {
    return `${ri.apiBaseUrl}/projects/${encodeURIComponent(ri.owner)}/repos/${encodeURIComponent(ri.repo)}`;
  }

  private prUrl(ri: RepoIdentifier, number: number): string {
    return `${this.repoUrl(ri)}/pull-requests/${number}`;
  }

  private async page<T>(url: string, limit = 100): Promise<T[]> {
    const values: T[] = [];
    let start = 0;
    do {
      const separator = url.includes("?") ? "&" : "?";
      const page = await this.request<Page<T>>(
        `${url}${separator}limit=${Math.min(limit, 1000)}&start=${start}`,
      );
      values.push(...(page.values ?? []));
      if (page.isLastPage !== false || page.nextPageStart == null || values.length >= limit) break;
      start = page.nextPageStart;
    } while (true);
    return values.slice(0, limit);
  }

  private pullRequest(ri: RepoIdentifier, row: Json): PullRequest {
    const state = String(row.state ?? "OPEN");
    const author = row.author?.user?.name ?? row.author?.user?.slug ?? "";
    return {
      number: Number(row.id),
      title: String(row.title ?? ""),
      body: String(row.description ?? ""),
      state: state === "OPEN" ? "open" : "closed",
      merged: state === "MERGED",
      mergeable: row.properties?.mergeResult?.outcome === "CLEAN" ? true : null,
      draft: Boolean(row.draft),
      headSha: String(row.fromRef?.latestCommit ?? ""),
      headBranch: row.fromRef?.displayId,
      headRepo: row.fromRef?.repository
        ? `${row.fromRef.repository.project?.key}/${row.fromRef.repository.slug}`
        : undefined,
      baseBranch: String(row.toRef?.displayId ?? ""),
      url:
        row.links?.self?.[0]?.href ??
        `https://${ri.host}/projects/${ri.owner}/repos/${ri.repo}/pull-requests/${row.id}`,
      author,
      assignees: (row.reviewers ?? []).map((r: Json) => r.user?.name).filter(Boolean),
      labels: [],
      createdAt: new Date(row.createdDate ?? 0).toISOString(),
      updatedAt: new Date(row.updatedDate ?? 0).toISOString(),
    };
  }

  async getPullRequest(ri: RepoIdentifier, number: number): Promise<PullRequest> {
    return this.pullRequest(ri, await this.request<Json>(this.prUrl(ri, number)));
  }

  async listOpenPullRequests(
    ri: RepoIdentifier,
    opts?: { branch?: string; perPage?: number },
  ): Promise<PullRequest[]> {
    const rows = await this.page<Json>(
      `${this.repoUrl(ri)}/pull-requests?state=OPEN`,
      opts?.perPage ?? 100,
    );
    return rows
      .map((row) => this.pullRequest(ri, row))
      .filter(
        (pr) => !opts?.branch || pr.headBranch === opts.branch || pr.baseBranch === opts.branch,
      );
  }

  async findPullRequestsByHeadPrefix(ri: RepoIdentifier, prefix: string): Promise<PullRequest[]> {
    return (await this.listOpenPullRequests(ri, { perPage: 200 })).filter((pr) =>
      pr.headBranch?.startsWith(prefix),
    );
  }

  async getCIChecks(ri: RepoIdentifier, sha: string): Promise<CICheck[]> {
    const root = `https://${ri.host}/rest/build-status/latest/commits/${encodeURIComponent(sha)}`;
    const rows = await this.page<Json>(root, 100);
    return rows.map((row) => ({
      name: String(row.name ?? row.key ?? "Build"),
      status: row.state === "INPROGRESS" ? "in_progress" : "completed",
      conclusion:
        row.state === "SUCCESSFUL"
          ? "success"
          : row.state === "FAILED"
            ? "failure"
            : row.state === "CANCELLED"
              ? "cancelled"
              : null,
    }));
  }

  async getReviews(ri: RepoIdentifier, number: number): Promise<Review[]> {
    const row = await this.request<Json>(this.prUrl(ri, number));
    return (row.reviewers ?? []).map((reviewer: Json) => ({
      author: reviewer.user?.name ?? "",
      state:
        reviewer.status === "NEEDS_WORK"
          ? "CHANGES_REQUESTED"
          : reviewer.approved || reviewer.status === "APPROVED"
            ? "APPROVED"
            : "COMMENTED",
      body: "",
    }));
  }

  private async comments(ri: RepoIdentifier, number: number): Promise<Json[]> {
    const activities = await this.page<Json>(`${this.prUrl(ri, number)}/activities`, 200);
    return activities.filter((activity) => activity.comment).map((activity) => activity.comment);
  }

  async getInlineComments(ri: RepoIdentifier, number: number): Promise<InlineComment[]> {
    const comments = await this.comments(ri, number);
    return comments
      .filter((comment) => comment.anchor?.path)
      .map((comment) => ({
        author: comment.author?.name ?? "",
        path: comment.anchor.path,
        line: comment.anchor.line ?? null,
        body: comment.text ?? "",
        createdAt: new Date(comment.createdDate ?? 0).toISOString(),
      }));
  }

  async getIssueComments(ri: RepoIdentifier, number: number): Promise<IssueComment[]> {
    return this.getPullRequestComments(ri, number);
  }

  async getPullRequestComments(ri: RepoIdentifier, number: number): Promise<IssueComment[]> {
    const comments = await this.comments(ri, number);
    return comments
      .filter((comment) => !comment.anchor)
      .map((comment) => ({
        author: comment.author?.name ?? "",
        body: comment.text ?? "",
        createdAt: new Date(comment.createdDate ?? 0).toISOString(),
      }));
  }

  async mergePullRequest(
    ri: RepoIdentifier,
    number: number,
    method: "merge" | "squash" | "rebase",
    expectedHeadSha?: string,
  ): Promise<void> {
    const current = await this.request<Json>(this.prUrl(ri, number));
    if (expectedHeadSha && current.fromRef?.latestCommit !== expectedHeadSha) {
      throw new Error("Bitbucket pull request head changed before merge");
    }
    const url = new URL(`${this.prUrl(ri, number)}/merge`);
    url.searchParams.set("version", String(current.version));
    await this.request<Json>(url.toString(), {
      method: "POST",
      body: JSON.stringify({
        version: current.version,
        ...(method !== "merge" ? { strategyId: method === "squash" ? "squash" : "rebase" } : {}),
      }),
    });
  }

  async submitReview(
    ri: RepoIdentifier,
    number: number,
    review: {
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
      body: string;
      comments?: { path: string; line?: number; side?: string; body: string }[];
      commitId?: string;
    },
  ): Promise<{ url: string }> {
    const current = await this.getPullRequest(ri, number);
    if (review.commitId && current.headSha !== review.commitId) {
      throw new Error("Bitbucket pull request head changed before review");
    }
    for (const comment of review.comments ?? []) {
      await this.request<Json>(`${this.prUrl(ri, number)}/comments`, {
        method: "POST",
        body: JSON.stringify({
          text: comment.body,
          anchor: {
            path: comment.path,
            line: comment.line,
            lineType: comment.side === "LEFT" ? "REMOVED" : "ADDED",
            fileType: "TO",
          },
        }),
      });
    }
    await this.request<Json>(`${this.prUrl(ri, number)}/review`, {
      method: "PUT",
      body: JSON.stringify({
        participantStatus:
          review.event === "APPROVE"
            ? "APPROVED"
            : review.event === "REQUEST_CHANGES"
              ? "NEEDS_WORK"
              : "UNAPPROVED",
        commentText: review.body,
        lastReviewedCommit: current.headSha,
      }),
    });
    return { url: current.url };
  }

  async listIssues(_ri: RepoIdentifier): Promise<Issue[]> {
    return [];
  }
  async createLabel(): Promise<void> {
    throw new Error("Bitbucket Server / Data Center does not support issue labels");
  }
  async addLabelsToIssue(): Promise<void> {
    throw new Error("Bitbucket Server / Data Center does not support issues");
  }
  async createIssueComment(): Promise<void> {
    throw new Error("Bitbucket Server / Data Center does not support issues");
  }
  async closeIssue(): Promise<void> {
    throw new Error("Bitbucket Server / Data Center does not support issues");
  }

  async getRepoMetadata(ri: RepoIdentifier): Promise<RepoMetadata> {
    const repo = await this.request<Json>(this.repoUrl(ri));
    const branch = await this.request<Json>(`${this.repoUrl(ri)}/default-branch`);
    return {
      fullName: `${repo.project?.key ?? ri.owner}/${repo.slug ?? ri.repo}`,
      defaultBranch: branch.displayId ?? branch.id?.replace(/^refs\/heads\//, "") ?? "main",
      isPrivate: !repo.public,
    };
  }

  async listRepoContents(ri: RepoIdentifier, path = ""): Promise<RepoContent[]> {
    const suffix = path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : "";
    const result = await this.request<Json>(`${this.repoUrl(ri)}/browse${suffix}?limit=100`);
    return (result.children?.values ?? []).map((item: Json) => ({
      name: String(item.path?.name ?? ""),
      type: item.type === "DIRECTORY" ? "dir" : "file",
    }));
  }

  async listBranches(
    ri: RepoIdentifier,
    opts?: { search?: string; perPage?: number },
  ): Promise<Branch[]> {
    const search = opts?.search ? `&filterText=${encodeURIComponent(opts.search)}` : "";
    const rows = await this.page<Json>(
      `${this.repoUrl(ri)}/branches?details=true${search}`,
      opts?.perPage ?? 100,
    );
    return rows.map((row) => ({
      name: row.displayId ?? row.id?.replace(/^refs\/heads\//, "") ?? "",
      default: Boolean(row.isDefault),
      protected: Boolean(row.isLocked),
    }));
  }

  async browseRepositories(
    query: string,
    at: PlatformLocation,
    opts?: { perPage?: number },
  ): Promise<BrowsableRepository[]> {
    const limit = Math.min(opts?.perPage ?? 50, 100);
    const projects = await this.page<Json>(`${at.apiBaseUrl}/projects`, 100);
    const results: BrowsableRepository[] = [];
    for (const project of projects) {
      const repos = await this.page<Json>(
        `${at.apiBaseUrl}/projects/${encodeURIComponent(project.key)}/repos`,
        100,
      );
      for (const repo of repos) {
        const fullName = `${project.key}/${repo.slug}`;
        if (query && !fullName.toLowerCase().includes(query.toLowerCase())) continue;
        const cloneUrl =
          repo.links?.clone?.find((link: Json) => link.name === "http")?.href ??
          `https://${at.host}/scm/${project.key}/${repo.slug}.git`;
        results.push({
          fullName,
          cloneUrl,
          htmlUrl:
            repo.links?.self?.[0]?.href ??
            `https://${at.host}/projects/${project.key}/repos/${repo.slug}`,
          defaultBranch: repo.defaultBranch ?? "main",
          isPrivate: !repo.public,
          description: repo.description ?? null,
          pushedAt: null,
        });
        if (results.length >= limit) return results;
      }
    }
    return results;
  }
}
