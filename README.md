# pi-codex-sale

A [Pi](https://pi.dev) provider extension for the **Codex Sale** inference API
([codex.sale](https://codex.sale/), `https://codex.sale/v1`).

[Русская версия](./README.ru.md)

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

API keys are available in the Codex Sale dashboard at
[codex.sale](https://codex.sale/). Setup guides for other clients live at
[codex.sale/docs](https://codex.sale/docs).

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `CODEXSALE_API_KEY` | *(none)* | API key. Required. |
| `CODEXSALE_BASE_URL` | `https://codex.sale/v1` | API base URL. `/v1` is appended automatically if missing. |

For compatibility with the official install scripts on
[codex.sale/docs](https://codex.sale/docs), `CODEX_SALE_API_KEY` and the legacy
`CODEX_LB_API_KEY` are also accepted for the API key, and
`CODEX_SALE_BASE_URL` for the base URL. The `CODEXSALE_*` names take priority.

You can also store the key in Pi's credential store instead of the environment:

```sh
pi auth check --provider codexsale
```

## Models

Models are fetched from `GET /v1/models` and mapped to Pi models. A model is
exposed only if it is an agent model:

- tool support must not be disabled (it defaults to enabled when the API omits
  the field),
- `status`, when present, must be `active`,
- batch variants (ids ending in `-batch`) are excluded,
- image-only models (`gpt-image-*`, DALL·E, Flux, …) are excluded, because they
  cannot do tool calls.

The endpoint currently returns only `id`, `type`, `display_name` and
`created_at` per model. When richer fields are present they are used directly;
otherwise the extension fills `context_window`, input modalities and reasoning
levels from a built-in registry and assumes tool support. A model newly added by
the API therefore shows up in Pi automatically, without editing this extension.

## Usage

```sh
pi --provider codexsale --model gpt-5.6-luna
pi --list-models codexsale
```

Thinking levels are exposed for models capable of reasoning. The API currently
reports none, so they come from the built-in registry — for example:

```sh
pi --provider codexsale --model gpt-6-astra:high
```

## Account balance

Codex Sale exposes no credits or balance endpoint, so the extension registers
none and sends no such request when switching models. The account balance is
only visible in the Codex Sale web UI. Billing is metered in calculated tokens,
with a single balance shared by GPT and GLM models.

## Design notes

- **Tolerant catalog parsing.** The parser accepts both the flat `data[]` list
  the endpoint returns today and a richer `models[]` shape with per-provider
  capabilities, using whichever fields are present.
- **Reasoning levels in both shapes.** Accepts `[{ effort: "high" }]` and
  `["high"]`.
- **Image-only models filtered out**, because they cannot make tool calls.

## Development

No build step — Pi loads the TypeScript sources directly (via jiti).

```sh
npm install        # installs dev deps and links Pi's peer type declarations
npm run typecheck  # tsc --noEmit
npm test           # unit tests
npm run check      # typecheck + tests
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
