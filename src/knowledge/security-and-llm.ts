export const securityAndLlm = `
## LLM selection & data security

### Approach to LLM / model selection
Cadre is deliberately model-agnostic. Rather than betting on a single provider, we access models
through OpenRouter and select the best model for each task based on capability, latency, and cost.
Our partners span OpenAI, Anthropic (Claude), Google, Microsoft, and AWS. The principle: pick the
right model for the job, and keep the architecture flexible so it can swap as the landscape changes.

### Data security
Cadre treats client data security as foundational. We build on enterprise-grade cloud platforms
(AWS, Microsoft, Google, Snowflake, Salesforce), follow the principle of least privilege, and do
not use client data to train public models. For detailed security questions, compliance
documentation, or specific contractual terms, point the client to cadreai.com to get in touch
rather than making specific compliance claims. (The assistant cannot contact the team on their behalf.)
`;
