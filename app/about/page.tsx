import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About this repo",
  description:
    "This site is the payload, not the point. Protocol Academy is a proof of concept for autonomous, gated agentic software engineering: an author agent and an adversarial reviewer agent shipping reviewed, production-deployed software from a plain-language GitHub issue.",
};

const docsUrl = (path: string) => `${SITE.repoUrl}/blob/main/${path}`;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="term-panel mb-10 px-5 py-6 sm:px-8 sm:py-8">
        <p className="mb-3 text-xs text-term-dim">
          <span className="text-term-green">root@academy</span>
          <span className="text-term-dim">:</span>
          <span className="text-term-cyan">~</span>
          <span className="text-term-dim">$</span> cat ABOUT.md
        </p>
        <h1 className="font-display text-4xl leading-tight tracking-wide text-term-green text-glow sm:text-5xl">
          This site is the payload,
          <br />
          not the point.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-term-fg/90 sm:text-base">
          Everything you&apos;ve clicked through so far &mdash; the OAuth flows, the
          JWT decoders, the sequence diagrams &mdash; is real, working
          educational content. But it&apos;s not what this repository is actually
          for. The real subject is underneath it: a proof of concept for{" "}
          <strong className="text-term-fg">
            autonomous, gated agentic software engineering
          </strong>
          .
        </p>
      </section>

      <div className="prose-flow space-y-8">
        <section>
          <h2>The actual question</h2>
          <p>
            Most &ldquo;AI writes code&rdquo; demos stop at a snippet in a chat
            window. The operational question is harder: can a coding agent
            push <em>real, reviewed</em> work into production, safely and
            repeatably, with a human approving the result instead of typing
            it? This project is the answer, built by actually running the
            loop, not just designing it.
          </p>
          <p>
            A contributor opens a GitHub issue in plain language &mdash; a
            protocol name and a sentence about what it should teach. An
            author agent researches the spec, writes the flow, and opens a
            pull request. An independent, adversarial reviewer agent fact-checks
            that PR against the primary spec before any human sees it. CI,
            the reviewer, and a Vercel preview all run in parallel. A human
            reads the review, clicks through the preview, and merges &mdash;
            or doesn&apos;t. That&apos;s the whole loop, and it&apos;s the same loop this
            page went through.
          </p>
        </section>

        <section>
          <h2>Why IAM protocols, specifically</h2>
          <p>
            The domain had to be non-trivial enough that getting it wrong
            would be embarrassing and getting it right would be provable
            against a primary source. IAM/security protocols fit: OAuth 2.0,
            OIDC, SAML, SPIFFE and friends are precisely specified in RFCs and
            standards documents, so an agent&apos;s output can be checked
            word-for-word against a citable section, not just &ldquo;does it
            look plausible.&rdquo; The educational app is the concrete,
            checkable domain used to prove the pipeline works &mdash; it is
            the payload the pipeline was built to deliver, not the thing being
            demonstrated.
          </p>
        </section>

        <section>
          <h2>Two agents, different jobs</h2>
          <p>
            An <strong>author agent</strong> implements the request: it never
            touches the rendering engine, only a typed data file (
            <code>steps.ts</code>) and prose (<code>content.mdx</code>) that a
            Zod schema validates. A second, independent{" "}
            <strong>Security Architect reviewer agent</strong> is adversarial
            to the author&apos;s output &mdash; it fetches the flow&apos;s cited specs
            with WebFetch and checks the content against those primary
            sources, flagging fabricated parameters, wrong
            required/optional designations, and mislabeled security
            properties. It&apos;s advisory, not a merge block: the human stays the
            decision-maker.
          </p>
        </section>

        <section>
          <h2>Proof it actually works</h2>
          <ul>
            <li>
              <strong>An agent-authored feature is live in production.</strong>{" "}
              The OAuth 2.0 Client Credentials flow was specified in an issue,
              built by the author agent, gated, and merged &mdash; it&apos;s the{" "}
              <code>/oauth2/client-credentials/</code> page on this site right
              now.
            </li>
            <li>
              <strong>The reviewer catches real inaccuracies.</strong> In a
              deliberate test, a planted falsehood (&ldquo;PKCE requires an{" "}
              <code>S512</code> method&rdquo;) was flagged by the reviewer with
              citations to RFC 7636 &sect;6.2.2 and &sect;4.2 &mdash; it even
              caught the internal contradiction with the flow&apos;s own labels.
            </li>
            <li>
              <strong>It generalizes to domains it&apos;s never seen.</strong> A
              SPIFFE/SPIRE X.509-SVID flow &mdash; a protocol the engine had
              no prior content for &mdash; was authored by the agent and
              passed a spec-grounded accuracy review against the SPIFFE
              standards.
            </li>
          </ul>
        </section>

        <section>
          <h2>What&apos;s real vs. illustrative (two different honesties)</h2>
          <p>
            Don&apos;t conflate these. The <em>pipeline</em> is real: the agent
            runs, the PRs are real PRs, the reviewer is a real second model
            checking real citations, and the merges are real production
            deploys gated by real CI. The <em>payload data</em> inside each
            protocol flow &mdash; tokens, client secrets, request bodies
            &mdash; is deliberately fake, illustrative, and non-live, so
            nobody mistakes a teaching example for a credential. The site
            footer&apos;s &ldquo;payloads are illustrative&rdquo; disclaimer is
            about that content, not about whether the pipeline that shipped it
            is real.
          </p>
        </section>

        <section>
          <h2>What&apos;s still a POC, honestly</h2>
          <p>
            The accuracy reviewer is advisory, not a required check &mdash; a
            human still has to read it and decide. Trigger authorization is
            gated on GitHub&apos;s <code>author_association</code> so only
            trusted collaborators can spawn a run on a public repo; anyone can
            file a request, not everyone can spend the API budget. Both agent
            runs are bounded by <code>--max-turns</code> as a cost backstop.
            None of that is hidden &mdash; it&apos;s written up in detail in the
            docs linked below, along with the real production bugs hit along
            the way (a Vercel build skipping codegen, a YAML form silently
            falling back to a blank editor, a bot-to-bot permission gap) and
            how each was fixed.
          </p>
        </section>

        <section>
          <h2>Read the source of truth</h2>
          <p>
            This page is a summary. The full spec &mdash; the pipeline
            end-to-end, the content engine and schema contract, the design
            decisions, and the operations runbook &mdash; lives in the repo&apos;s{" "}
            <code>docs/</code> folder:
          </p>
          <ul>
            <li>
              <a href={docsUrl("docs/README.md")} target="_blank" rel="noreferrer">
                docs/README.md
              </a>{" "}
              &mdash; the thesis and the proof points, in one page
            </li>
            <li>
              <a
                href={docsUrl("docs/The-Agentic-Pipeline.md")}
                target="_blank"
                rel="noreferrer"
              >
                docs/The-Agentic-Pipeline.md
              </a>{" "}
              &mdash; issue &rarr; author agent &rarr; PR &rarr; gates &rarr;
              reviewer agent &rarr; production, stage by stage
            </li>
            <li>
              <a
                href={docsUrl("docs/The-Content-Engine.md")}
                target="_blank"
                rel="noreferrer"
              >
                docs/The-Content-Engine.md
              </a>{" "}
              &mdash; why &ldquo;a feature is data, not code&rdquo; is what
              makes the agent&apos;s work safe to delegate
            </li>
            <li>
              <a
                href={docsUrl("docs/Design-Decisions-and-Lessons.md")}
                target="_blank"
                rel="noreferrer"
              >
                docs/Design-Decisions-and-Lessons.md
              </a>{" "}
              &mdash; the real bugs hit shipping this, and how each was fixed
            </li>
            <li>
              <a
                href={docsUrl("docs/Operations-and-Extending.md")}
                target="_blank"
                rel="noreferrer"
              >
                docs/Operations-and-Extending.md
              </a>{" "}
              &mdash; the runbook: secrets, gates, costs, how to add a flow
            </li>
          </ul>
          <p>
            Or go straight to the code:{" "}
            <a href={SITE.repoUrl} target="_blank" rel="noreferrer">
              github.com/koherenc3/protocol-academy
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
