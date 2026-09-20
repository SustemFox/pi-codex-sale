// Links the pi-provided peer packages (`@earendil-works/pi-ai`,
// `@earendil-works/pi-coding-agent`) from the installed `pi` CLI into this
// project's node_modules so `tsc` can resolve their type declarations.
//
// At runtime these packages are supplied by pi itself, so they are declared as
// optional peer dependencies and are not installed by `npm install`. This
// script only makes them available to the local type checker.
//
// Resolution order:
//   1. PI_PACKAGE_ROOT environment variable, if set (a node_modules directory)
//   2. globally installed `pi` (via `npm root -g`)
//
// The script is intentionally non-fatal: if pi cannot be found, it prints a
// warning and exits successfully so `npm install`/`npm publish` still work.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const PEERS = ["@earendil-works/pi-coding-agent", "@earendil-works/pi-ai"];

function globalNodeModules() {
	if (process.env.PI_PACKAGE_ROOT) {
		return process.env.PI_PACKAGE_ROOT;
	}
	try {
		return execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
	} catch {
		return undefined;
	}
}

/** Build the on-disk directory for a package specifier under a node_modules root. */
function packageDir(root, name) {
	return join(root, ...name.split("/"));
}

/**
 * Find a package directory. pi-ai is nested inside pi-coding-agent's own
 * node_modules, so try both the flat and the nested location.
 */
function findPackageDir(root, name) {
	const candidates = [
		packageDir(root, name),
		join(root, "@earendil-works", "pi-coding-agent", "node_modules", ...name.split("/")),
	];
	return candidates.find((candidate) => existsSync(join(candidate, "package.json")));
}

const root = globalNodeModules();
if (!root) {
	console.warn("[pi-codex-sale] could not locate the global npm root; skipping peer type linking");
	process.exit(0);
}

const destDir = join(process.cwd(), "node_modules", "@earendil-works");
const linked = [];

for (const name of PEERS) {
	const shortName = name.split("/").at(-1);
	const source = findPackageDir(root, name);
	if (!source) {
		console.warn(`[pi-codex-sale] ${name} not found under ${root}; skipping`);
		continue;
	}

	const dest = join(destDir, shortName);
	if (source === dest) {
		continue;
	}

	mkdirSync(destDir, { recursive: true });
	if (existsSync(dest)) {
		rmSync(dest, { recursive: true, force: true });
	}
	symlinkSync(source, dest, process.platform === "win32" ? "junction" : "dir");
	linked.push(shortName);
}

if (linked.length > 0 && process.env.npm_config_json !== "true") {
	console.log(`[pi-codex-sale] linked peer types: ${linked.join(", ")}`);
}
