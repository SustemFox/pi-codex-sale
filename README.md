# pi-codex-sale

A [Pi](https://pi.dev) provider extension for the **Codex Sale** inference API
(`https://codex.sale/v1`).

Codex Sale speaks the OpenAI Responses API, so this extension registers a
`codexsale` provider, discovers the available models at runtime, and maps them
into Pi's model format.

This is a fork of
[`pi-experientiallabs`](https://ampcode.com/@xyenon/pi-experientiallabs) by
[XYenon](https://github.com/XYenon), adapted for the `codex.sale` endpoint and
hardened against upstream API changes. See [Credits](#credits) and
[Changes from upstream](#changes-from-upstream).

## Install

```sh
pi install npm:pi-codex-sale
```

or point Pi at a local checkout:

```sh
pi install /path/to/pi-codex-sale
```

Then set the API key (the extension reads `CODEXSALE_API_KEY`):

```sh
export CODEXSALE_API_KEY='your_api_key'
```

Restart Pi afterwards — configuration is read at startup.

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `CODEXSALE_API_KEY` | *(none)* | API key. Required. |
| `CODEXSALE_BASE_URL` | `https://codex.sale/v1` | API base URL. `/v1` is appended automatically if missing. |

You can also store the key in Pi's credential store instead of the environment:

```sh
pi auth check --provider codexsale
```

## Models

Models are fetched from `GET /v1/models` and mapped to Pi models. A model is
exposed only if it is an agent model:

- `supported_params.tools` must not be `false`,
- `status`, when present, must be `active`,
- batch variants (ids ending in `-batch`) are excluded,
- image-only models (`gpt-image-*`, DALL·E, Flux, …) are excluded, because they
  cannot do tool calls.

Capabilities are read from the response when the API provides them. The
upstream `metadata` object has been dropped at least once, so the extension
falls back to a built-in registry for `context_window`, input modalities and
reasoning levels, and assumes `tools: true` for unknown ids. This means a model
newly added by the API shows up in Pi automatically, without editing this
extension.

## Usage

```sh
pi --provider codexsale --model gpt-5.6-luna
pi --list-models codexsale
```

Thinking levels follow the model's `supported_reasoning_levels`, for example:

```sh
pi --provider codexsale --model gpt-6-astra:high
```

## Credits

The upstream Experiential Labs extension shows the account balance in the
status bar by polling `/api/v1/credits`. **Codex Sale has no such endpoint** —
every reasonable path returns 404:

```
404  /api/v1/credits
404  /v1/credits
404  /v1/me, /v1/usage, /v1/balance, /v1/user, /v1/keys, /v1/auth/me
```

For that reason the credits/balance status is removed from this fork. The
account balance is only visible in the Codex Sale web UI.

## Changes from upstream

- **Catalog parsing without `metadata`.** The API stopped sending the
  `metadata` object. The upstream parser read `metadata.supports_parallel_tool_calls`
  to decide `tools`, so every model was discarded and the provider reported no
  models at all. This fork tolerates both response shapes and enriches from a
  built-in model registry.
- **Reasoning levels in both shapes.** Accepts `[{ effort: "high" }]` and
  `["high"]`.
- **Image-only models filtered out** instead of being exposed as text models.
- **Credits status removed** — `src/credits.ts` is gone, `creditsUrl` and
  `originPath` were dropped from `src/urls.ts`. No more 404 request on every
  model switch.

## Development

No build step — Pi loads the TypeScript sources directly.

```sh
node --experimental-strip-types --check src/*.ts
```

## License

MIT. See [LICENSE](./LICENSE). Original work © XYenon; this fork is distributed
under the same terms.
