# Coral Coast Insurance: technical call notes

## 2026-10-21: POC readout

**Attendees:** Mia Robertson (Head of Digital), Sam Nguyen (Lead Engineer); Daniel Okafor (SA), Sophie Tran (AE)

**Summary:** Readout of the 3-week POC rebuilding the motor quote journey on Next.js. Today's stack is WordPress for content plus Lambda functions for quoting, managed by Group IT.

**Buying signals**
- Sam: "Quote journey p95 went from 2.4 seconds to 600 milliseconds. Conversion on the test cohort is up 9%."
- Mia wants to roll the home insurance journey onto the same platform before the February campaign.
- Engineering team liked preview deployments for compliance sign-off on copy changes.

**Risks**
- Group Risk has not reviewed the platform yet; Mia expects questions about how quote PII is encrypted.
- Group IT prefers to consolidate on the existing AWS Enterprise Discount Program.

**Next steps**
- Security review with Group Risk (owner: Daniel).

## 2026-11-04: Group Risk security review

**Attendees:** Priyanka Shah (Head of Group Risk), Liam Walsh (Group IT Architect), Mia Robertson; Daniel Okafor (SA)

**Summary:** Group Risk reviewed how quote data (names, addresses, licence numbers, claims history) is handled.

**Blocker**
- Priyanka: "Our policy is that any system processing quote PII uses keys we control and can revoke. Without customer-managed keys this cannot go to production." This is a board-approved control with no exception process.
- Daniel proposed a workaround: tokenize PII in the browser and keep the raw data in their existing AWS KMS-backed quoting API, so Vercel only handles tokens. Priyanka rejected it: the quote journey still renders PII server-side for the summary page, and they will not accept a partial solution.
- Liam used the gap to argue for building the journey on AWS with their existing KMS setup: "We can have this on CloudFront and Lambda in a quarter."

**Buying signals**
- Mia is still pushing hard for Vercel and has asked her GM to sponsor an exception review if a roadmap date exists.

**Next steps**
- Daniel to escalate the BYOK requirement to product and bring a roadmap answer to Group Risk by 2026-11-18.
- Mia to brief her GM on the conversion results.
