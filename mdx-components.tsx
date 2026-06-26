import type { MDXComponents } from "mdx/types";

// Required by @next/mdx for the App Router. Lets us style MDX prose and
// inject custom components into educational content if needed later.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
