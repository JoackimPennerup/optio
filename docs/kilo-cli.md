# Kilo CLI runtime

Select **Kilo CLI** as the task or local agent runtime. The base agent image
installs `@kilocode/cli`, and pod runs use `kilo run --format json --auto`.
Set a `KILO_API_KEY` secret for Kilo Gateway access. A custom OpenAI compatible
endpoint can instead be configured through the runtime's base URL option.

The model, agent, and base URL fields are shared with OpenCode in Optio's
current task settings. Kilo uses its own `~/.config/kilo/kilo.json` configuration
and rules file. Optio streams Kilo's JSON events using the OpenCode event parser.

For the base image, `AGENT_CLIS=kilo` installs Kilo alone. Local runs require
the Kilo CLI to be installed on the user's machine.
