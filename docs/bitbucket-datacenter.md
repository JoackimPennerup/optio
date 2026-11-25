# Bitbucket Data Center repositories

Set `BITBUCKET_HOSTS` to a comma-separated list of Bitbucket Data Center
hosts, including a port when required. Add a `BITBUCKET_TOKEN` secret, or a
host-specific `BITBUCKET_TOKEN_<HOST>` secret (uppercase, with punctuation
replaced by underscores). Optio also accepts these variables in the API
environment. The host must be listed before Optio sends it a token.

In **Repositories → Add Repository**, choose **Bitbucket Data Center** and
browse projects or paste an HTTPS clone URL such as
`https://bitbucket.example/scm/PROJ/service.git`. Web URLs of the form
`https://bitbucket.example/projects/PROJ/repos/service` also work. Optio
uses the Data Center REST API for repository, branch, pull request, review,
comment and build status operations. Its git credential helper uses
`x-token-auth` with the access token for HTTPS clones and pushes.

During initial setup, choose **Bitbucket Data Center** in the **Git Provider**
step, enter the listed host and access token, then validate it. The setup
wizard can suggest repositories from projects the token can access.

Bitbucket Data Center has no built-in issue tracker, so issue operations
are unavailable. For a private host, also allow outbound access with
`OPTIO_OUTBOUND_ALLOWED_HOSTS` as described in the deployment network policy.
