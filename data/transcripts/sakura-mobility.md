# Sakura Mobility: technical call notes

## 2026-10-27: Discovery with digital marketing

**Attendees:** Yuki Tanaka (General Manager, Global Digital Marketing), Haruto Kobayashi (IT Architect); Kenji Watanabe (SA), Emily Sato (AE)

**Summary:** Sakura's global vehicle configurator and dealer locator serve 30 markets from S3 + CloudFront with a custom personalization layer. Digital marketing owns the budget; IT owns the platform.

**Buying signals**
- Yuki: "A new model campaign takes us six weeks to launch globally. I want two."
- Configurator personalization (pricing, trims per market) is currently done client-side and is slow on mobile.
- Yuki asked for a reference customer in automotive.

**Risks**
- Their long-standing SI partner has proposed a fully custom AWS build (Lambda@Edge + CloudFront) and is trusted by IT.
- Haruto is concerned about adding a new vendor outside the existing AWS contract.
- Japanese-language support and a local contract entity are requirements.

**Next steps**
- Reference architecture workshop with digital marketing and the SI.
- Share automotive references and Japanese support details.

## 2026-11-05: SI alignment call

**Attendees:** Haruto Kobayashi, two SI architects; Kenji Watanabe (SA)

**Summary:** Discussed how Vercel would fit next to the SI's proposal.

**Buying signals**
- SI architects acknowledged the custom Lambda@Edge build would take 5-6 months before the first market launches.
- Haruto was open to a pilot in one market (Australia) to compare.

**Risks**
- SI's revenue depends on the custom build; they may resist.
- No date set for a decision; digital marketing's budget cycle closes in March.

**Next steps**
- Propose a one-market pilot (AU) with success criteria.
- Kenji to explore SI partnership enablement so they can deliver on Vercel.
