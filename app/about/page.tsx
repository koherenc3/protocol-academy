import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About this repo",
  description:
    "This site is the payload, not the point. I built it to prove out an autonomous, gated agentic software engineering pipeline: an author agent and an adversarial reviewer agent shipping reviewed, production-deployed software from a plain-language GitHub issue.",
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
          Everything you&apos;ve clicked through so far, the OAuth flows, the
          JWT decoders, the sequence diagrams, is real, working educational
          content. But that&apos;s not why I built this. I built it to
          answer a harder question: can a coding agent push real, reviewed
          work into production, safely and repeatably, with a human
          approving the result instead of typing it?
        </p>
      </section>

      <div className="prose-flow space-y-8">
        <section>
          <h2>Why I built this</h2>
          <p>
            Most &ldquo;AI writes code&rdquo; demos stop at a snippet in a
            chat window. I wanted to see if an agent could actually ship,
            through the same machinery a human&apos;s change has to earn its
            way through: GitHub issues, pull requests, CI, a second
            reviewing agent, preview deploys, and a human merge. So I built
            the loop and ran it for real, not just designed it.
          </p>
          <p>
            Here&apos;s how it works: a contributor opens a GitHub issue in
            plain language, a protocol name and a sentence about what it
            should teach. An author agent researches the spec, writes the
            flow, and opens a pull request. An independent, adversarial
            reviewer agent fact-checks that PR against the primary spec
            before I see it. CI, the reviewer, and a Vercel preview all run
            in parallel. I read the review, click through the preview, and
            merge or don&apos;t. That&apos;s the whole loop.
          </p>
        </section>

        <section>
          <h2>Why IAM protocols, specifically</h2>
          <p>
            I needed a domain where getting it wrong would be embarrassing
            and getting it right would be checkable, not just
            plausible-sounding. IAM and security protocols fit: OAuth 2.0,
            OIDC, SAML, SPIFFE, and the rest are precisely specified in RFCs
            and standards docs, so an agent&apos;s output can be checked
            word-for-word against a citable section. The educational app is
            the concrete domain I used to prove the pipeline works.
            It&apos;s the payload the pipeline was built to deliver, not the
            thing I&apos;m actually trying to show you.
          </p>
        </section>

        <section>
          <h2>Two agents, different jobs</h2>
          <p>
            An <strong>author agent</strong> implements the request. It
            never touches the rendering engine, only a typed data file
            (<code>steps.ts</code>) and prose (<code>content.mdx</code>)
            that a Zod schema validates. A second, independent{" "}
            <strong>Security Architect reviewer agent</strong> is
            adversarial to the author&apos;s output: it fetches the
            flow&apos;s cited specs with WebFetch and checks the content
            against those primary sources, flagging fabricated parameters,
            wrong required/optional designations, and mislabeled security
            properties. It&apos;s advisory, not a merge block. I stay the
            decision-maker.
          </p>
        </section>

        <section>
          <h2>Proof it actually works</h2>
          <ul>
            <li>
              <strong>An agent-authored feature is live in production.</strong>{" "}
              The OAuth 2.0 Client Credentials flow was specified in an
              issue, built by the author agent, gated, and merged.
              It&apos;s the <code>/oauth2/client-credentials/</code> page on
              this site right now.
            </li>
            <li>
              <strong>The reviewer catches real inaccuracies.</strong> I
              planted a falsehood on purpose (&ldquo;PKCE requires an{" "}
              <code>S512</code> method&rdquo;), and the reviewer flagged it
              with citations to RFC 7636 &sect;6.2.2 and &sect;4.2. It even
              caught the internal contradiction with the flow&apos;s own
              labels.
            </li>
            <li>
              <strong>It generalizes to domains it&apos;s never seen.</strong>{" "}
              A SPIFFE/SPIRE X.509-SVID flow, a protocol the engine had no
              prior content for, was authored by the agent and passed a
              spec-grounded accuracy review against the SPIFFE standards.
            </li>
          </ul>
          <p>
            I don&apos;t know how far this generalizes past IAM protocols.
            What I can say is it held up on three different specs, one of
            them completely new to the system, and the reviewer caught a
            mistake I put there on purpose.
          </p>
        </section>

        <section>
          <h2>
            Two different kinds of &ldquo;not real&rdquo;, don&apos;t mix
            them up
          </h2>
          <p>
            The pipeline is real: the agent runs, the PRs are real PRs, the
            reviewer is a real second model checking real citations, and the
            merges are real production deploys gated by real CI. The
            payload data inside each protocol flow, tokens, client secrets,
            request bodies, is deliberately fake and illustrative, so nobody
            mistakes a teaching example for a live credential. The
            footer&apos;s &ldquo;payloads are illustrative&rdquo; disclaimer
            is about that content. It has nothing to do with whether the
            pipeline that shipped it is real.
          </p>
        </section>

        <section>
          <h2>What&apos;s still a proof of concept, honestly</h2>
          <p>
            The accuracy reviewer is advisory, not a required check. A human
            still has to read it and decide. Trigger authorization is gated
            on GitHub&apos;s <code>author_association</code>, so only
            trusted collaborators can spawn a run on a public repo; anyone
            can file a request, not everyone can spend the API budget. Both
            agent runs are bounded by <code>--max-turns</code> as a cost
            backstop. None of that is hidden. It&apos;s written up in the
            docs, along with the real production bugs I hit shipping this (a
            Vercel build that skipped codegen, a YAML form that silently
            fell back to a blank editor, a bot-to-bot permission gap) and
            how I fixed each one.
          </p>
        </section>

        <section>
          <h2>Read the source of truth</h2>
          <p>
            This page is a summary. The full spec, the pipeline end-to-end,
            the content engine and schema contract, the design decisions,
            and the operations runbook, lives in the repo&apos;s{" "}
            <code>docs/</code> folder:
          </p>
          <ul>
            <li>
              <a href={docsUrl("docs/README.md")} target="_blank" rel="noreferrer">
                docs/README.md
              </a>{" "}
              - the thesis and the proof points, in one page
            </li>
            <li>
              <a
                href={docsUrl("docs/The-Agentic-Pipeline.md")}
                target="_blank"
                rel="noreferrer"
              >
                docs/The-Agentic-Pipeline.md
              </a>{" "}
              - issue to author agent to PR to gates to reviewer agent to
              production, stage by stage
            </li>
            <li>
              <a
                href={docsUrl("docs/The-Content-Engine.md")}
                target="_blank"
                rel="noreferrer"
              >
                docs/The-Content-Engine.md
              </a>{" "}
              - why &ldquo;a feature is data, not code&rdquo; is what makes
              the agent&apos;s work safe to delegate
            </li>
            <li>
              <a
                href={docsUrl("docs/Design-Decisions-and-Lessons.md")}
                target="_blank"
                rel="noreferrer"
              >
                docs/Design-Decisions-and-Lessons.md
              </a>{" "}
              - the real bugs I hit shipping this, and how I fixed each one
            </li>
            <li>
              <a
                href={docsUrl("docs/Operations-and-Extending.md")}
                target="_blank"
                rel="noreferrer"
              >
                docs/Operations-and-Extending.md
              </a>{" "}
              - the runbook: secrets, gates, costs, how to add a flow
            </li>
          </ul>
          <p>
            Or just go look at the code:{" "}
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
