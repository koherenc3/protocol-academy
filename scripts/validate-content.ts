/**
 * Content validator — the CI gate that guards agent-authored flows.
 *
 * Loads every flow via the registry (which parses each one through the Zod
 * schema) and reports precise, located errors. Exits non-zero on any problem
 * so CI fails the PR before it can merge.
 *
 * Run with: npm run validate-content
 */
import { ZodError } from "zod";

async function main() {
  let registry: typeof import("../content/registry");
  try {
    registry = await import("../content/registry");
  } catch (err) {
    reportError(err);
    process.exit(1);
  }

  const protocols = registry.getAllProtocols();
  const flowCount = protocols.reduce((n, p) => n + p.flows.length, 0);

  if (protocols.length === 0) {
    console.error("✖ No protocols found. Did you add content under content/protocols/?");
    process.exit(1);
  }

  console.log(
    `✓ Content valid: ${protocols.length} protocol(s), ${flowCount} flow(s).`,
  );
  for (const p of protocols) {
    for (const f of p.flows) {
      console.log(`  ✓ ${p.id}/${f.id} — ${f.steps.length} step(s)`);
    }
  }
}

function reportError(err: unknown) {
  if (err instanceof ZodError) {
    console.error("✖ Content validation failed:\n");
    for (const issue of err.issues) {
      const path = issue.path.join(".") || "(root)";
      console.error(`  • ${path}: ${issue.message}`);
    }
  } else if (err instanceof Error) {
    console.error(`✖ Content validation failed:\n  ${err.message}`);
  } else {
    console.error("✖ Content validation failed with an unknown error:", err);
  }
}

main().catch((err) => {
  reportError(err);
  process.exit(1);
});
