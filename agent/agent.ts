import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-5-mini",
  // Deal judgements don't need deep reasoning; "low" cut meeting-review latency roughly in half in testing.
  reasoning: "low",
});
