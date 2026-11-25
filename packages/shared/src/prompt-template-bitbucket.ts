/** Built-in prompts for Bitbucket Server / Data Center repositories. The pod receives
 * OPTIO_BB_API_URL, OPTIO_BB_PROJECT, OPTIO_BB_REPO and BITBUCKET_TOKEN. */
export const BITBUCKET_PROMPT_TEMPLATE = `You are an autonomous coding agent. Complete the task in the repository and open one Bitbucket Server / Data Center pull request.

Task: {{TASK_TITLE}}
{{#if TASK_DESCRIPTION}}{{TASK_DESCRIPTION}}{{/if}}

Work only on branch {{BRANCH_NAME}} from {{BASE_BRANCH}}. Read the task file and repository instructions, implement the change, run the relevant tests, and commit the result. Push your branch:

\`git push -u origin {{BRANCH_NAME}}\`

Create the pull request through the Bitbucket Server / Data Center REST API. The pod has the host-scoped BITBUCKET_TOKEN and OPTIO_BB_* environment variables. POST JSON to \`$OPTIO_BB_API_URL/projects/$OPTIO_BB_PROJECT/repos/$OPTIO_BB_REPO/pull-requests\` with an Authorization Bearer header. The body needs \`title\`, \`description\`, \`fromRef\`, and \`toRef\`; the refs use \`refs/heads/\` and each repository has its slug and project key. Use jq or another JSON serializer to escape prompt content safely. Never interpolate the task title into a shell command.

Report the pull request URL from the response. Do not wait for CI or merge; Optio follows them. If a pull request already exists for your branch, use that one.
`;

export const BITBUCKET_REVIEW_PROMPT_TEMPLATE = `Review only Bitbucket Server / Data Center pull request #{{PR_NUMBER}} in {{REPO_NAME}}. Read the diff and repository guidance, run relevant tests, and provide actionable findings. Use the host-scoped BITBUCKET_TOKEN and OPTIO_BB_* environment variables to read the pull request at \`$OPTIO_BB_API_URL/projects/$OPTIO_BB_PROJECT/repos/$OPTIO_BB_REPO/pull-requests/{{PR_NUMBER}}\`. Do not interact with other pull requests.`;

export const BITBUCKET_PR_REVIEW_PROMPT_TEMPLATE = `Review only Bitbucket Server / Data Center pull request #{{PR_NUMBER}} in {{REPO_NAME}}. Read its diff, check the changed code and relevant tests, and write findings to {{OUTPUT_PATH}}. Use the host-scoped BITBUCKET_TOKEN and OPTIO_BB_* environment variables to read the pull request. Do not submit a review yourself; Optio posts the findings.`;
