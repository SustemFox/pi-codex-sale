# pi-codex-sale

A [Pi](https://pi.dev) provider extension for the **Codex Sale** inference API
(`https://codex.sale/v1`).

Codex Sale speaks the OpenAI Responses API, so this extension registers a
`codexsale` provider, discovers the available models at runtime, and maps them
into Pi's model format. See [Credits](#credits) for provenance.

## Install

```sh
pi install git:github.com/SustemFox/pi-codex-sale
```

or point Pi at a local checkout:

```sh
pi install /path/to/pi-codex-sale
```

To try it without installing:

```sh
pi -e git:github.com/SustemFox/pi-codex-sale
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

Capabilities are read from the response when the API provides them. The Codex
Sale API stopped returning the `metadata` object at one point, so the extension
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

## Account balance

Codex Sale exposes no credits or balance endpoint — every reasonable path
returns 404:

```
404  /api/v1/credits
404  /v1/credits
404  /v1/me, /v1/usage, /v1/balance, /v1/user, /v1/keys, /v1/auth/me
```

The extension therefore polls for no balance and shows none in the status bar,
so switching models costs no extra round trip. The account balance is only
visible in the Codex Sale web UI.

## Design notes

- **Tolerant catalog parsing.** The API stopped sending the `metadata` object.
  A parser that reads `metadata.supports_parallel_tool_calls` to decide `tools`
  would discard every model and report an empty provider. This extension
  tolerates both response shapes and enriches from a built-in model registry.
- **Reasoning levels in both shapes.** Accepts `[{ effort: "high" }]` and
  `["high"]`.
- **Image-only models filtered out** instead of being exposed as text models.
- **No balance polling.** `src/credits.ts` is gone, and `creditsUrl` /
  `originPath` were dropped from `src/urls.ts`.

## Development

No build step — Pi loads the TypeScript sources directly (via jiti).

```sh
npm install        # installs dev deps and links Pi's peer type declarations
npm run typecheck  # tsc --noEmit
```

The packages `@earendil-works/pi-ai` and `@earendil-works/pi-coding-agent` are
provided by Pi at runtime, so they are declared as optional peer dependencies
and are not installed from npm. `npm install` runs
[`scripts/link-pi-types.mjs`](./scripts/link-pi-types.mjs), which symlinks their
type declarations from the installed `pi` CLI into `node_modules` so the type
checker can resolve them. Set `PI_PACKAGE_ROOT` to a `node_modules` directory to
point at a different Pi installation.

## Credits

This project is derived from
[`pi-experientiallabs`](https://ampcode.com/@xyenon/pi-experientiallabs) by
[XYenon](https://github.com/XYenon), adapted for the Codex Sale endpoint and
hardened against changes in the Codex Sale API.

## License

MIT. See [LICENSE](./LICENSE). Original work © XYenon; this project is
distributed under the same terms.
