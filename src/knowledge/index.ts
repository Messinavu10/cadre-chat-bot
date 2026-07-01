import { overview } from "./overview";
import { services } from "./services";
import { maturityIndex } from "./maturity-index";
import { portal } from "./portal";
import { booking } from "./booking";
import { securityAndLlm } from "./security-and-llm";
import { caseStudies } from "./case-studies";

/**
 * The bot's entire source of truth. It is small and bounded by design, so it is injected directly
 * into the system prompt rather than retrieved via a vector store. See plan.md for the "no RAG"
 * decision and the conditions under which we'd revisit it.
 */
export const KNOWLEDGE_BASE = [
  overview,
  services,
  maturityIndex,
  portal,
  booking,
  securityAndLlm,
  caseStudies,
]
  .map((section) => section.trim())
  .join("\n\n");
