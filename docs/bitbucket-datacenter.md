# Bitbucket Server / Data Center repositories

Set `BITBUCKET_HOSTS` to a comma-separated list of Bitbucket Server / Data Center
hosts, including a port when required. Add a `BITBUCKET_TOKEN` secret, or a
host-specific `BITBUCKET_TOKEN_<HOST>` secret (uppercase, with punctuation
replaced by underscores). Optio also accepts these variables in the API
environment. The host must be listed before Optio sends it a token.

In **Repositories → Add Repository**, choose **Bitbucket Server / Data Center** and
browse projects or paste an HTTPS clone URL such as
`https://bitbucket.example/scm/PROJ/service.git`. Web URLs of the form
`https://bitbucket.example/projects/PROJ/repos/service` also work. Optio
uses the Server / Data Center REST API for repository, branch, pull request,
review, comment and build status operations. For HTTPS clones and pushes,
Optio sends the HTTP access token in a host-scoped Bearer header. This works
with user, project and repository tokens on Bitbucket 8.9. A workspace or
deployment token is needed for the shared repository pod's initial clone;
individual runs can use their own token afterward.

During initial setup, choose **Bitbucket Server / Data Center** in the **Git Provider**
step, enter the listed host and access token, then validate it. The setup
wizard can suggest repositories from projects the token can access.

Bitbucket Server / Data Center has no built-in issue tracker, so issue operations
are unavailable. Atlassian's 8.9 documentation says HTTP access tokens cannot
merge pull requests; merge in the Bitbucket web UI with a user account and
leave Optio auto-merge off for these repositories. For a private host, also allow outbound access with
`OPTIO_OUTBOUND_ALLOWED_HOSTS` as described in the deployment network policy.

The 8.9 Server and Data Center editions use the same REST API. The 8.9
documentation is at [Atlassian's Bitbucket Server / Data Center guide](https://confluence.atlassian.com/bitbucketserver089/bitbucket-data-center-and-server-documentation-1236435396.html),
with [HTTP token behavior](https://confluence.atlassian.com/bitbucketserver089/http-access-tokens-1236435579.html)
and [REST endpoints](https://developer.atlassian.com/server/bitbucket/rest/v809/).
