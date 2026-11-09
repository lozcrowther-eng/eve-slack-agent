# Merlion Logistics: technical call notes

## 2026-10-29: Demo and architecture discussion

**Attendees:** Benjamin Goh (VP Engineering), Aisha Rahman (Frontend Lead); Wei Ling Tan (SA), Arjun Mehta (AE)

**Summary:** Merlion runs shipper and carrier portals for 6 SEA markets (SG, MY, ID, TH, VN, PH). Currently on AWS Amplify, with Cognito for auth.

**Buying signals**
- Aisha: "Adding a market takes us a sprint because of how we handle localized builds. ISR with i18n routing would make it a config change."
- Amplify builds are hitting 18-25 minutes; developers batch changes to avoid waiting.
- Team was impressed by Vercel Analytics speed insights showing Jakarta and Manila latency.

**Risks**
- Benjamin: "Amplify is basically free for us inside our AWS commit. Show me why paying more is worth it."
- Cognito integration needs to keep working; they don't want to migrate identity.
- No forcing event; current setup "works, just slowly."

**Next steps**
- TCO comparison vs Amplify (build minutes, bandwidth, developer hours lost to builds).
- Demo Cognito integration with Next.js middleware.

## 2026-11-04: Follow-up with frontend team

**Attendees:** Aisha Rahman, three frontend engineers; Wei Ling Tan (SA)

**Summary:** Hands-on session; team deployed one portal to a Vercel trial.

**Buying signals**
- Cognito auth worked in the trial with no changes to their user pools.
- Engineers measured builds at under 3 minutes vs 22 on Amplify.

**Risks**
- Benjamin did not attend; Aisha says he's focused on a cost-reduction mandate from the CFO this quarter.
- Thailand subsidiary runs separate IT and may want its own decision.

**Product gap and workaround**
- Thailand subsidiary's data-residency rule requires carrier PII to be processed in Thailand; there is no Bangkok compute region.
- Workaround: keep the TH carrier API in AWS ap-southeast-7 (Bangkok) and render the TH portal pages without PII, calling that API from the browser. Aisha's team validated it in the trial; TH IT still needs to sign off.

**Next steps**
- Aisha to walk TH IT through the data-residency workaround.
- Wei Ling to send TCO model to Benjamin by 2026-11-11.
- Aisha to write up developer-productivity findings for Benjamin.
