# Indus Mart: technical call notes

## 2026-10-31: Festive-season retrospective

**Attendees:** Ananya Krishnan (Head of Commerce), Vikram Rao (Platform Lead), Sneha Pillai (Engineering Manager, Storefront); Rohan Iyer (SA), Kavya Nair (AE)

**Summary:** Retro on last year's festive sale outage. Storefront is a headless Next.js app on self-managed EKS behind CloudFront.

**Buying signals**
- Ananya: "We lost an estimated ₹18 crore in the four hours the storefront was down. I can't go into the January sale with the same setup."
- Sneha's team spends roughly 30% of sprint capacity on infrastructure instead of features.
- Ananya owns the budget and has executive backing from the CEO after the outage.

**Risks**
- Vikram: "The outage was an autoscaling misconfiguration. We've fixed it. We don't need a new platform." He wants to stay on AWS.
- Data localization: order data must stay in India; need clarity on what runs in bom1 vs globally.
- Decision deadline is the January sale planning freeze (2026-12-15).

**Next steps**
- Joint load test at 10x festive peak on product listing and search pages.
- SA to document data flows and regions (bom1) for the localization review.

## 2026-11-07: Load test planning

**Attendees:** Vikram Rao, Sneha Pillai; Rohan Iyer (SA)

**Summary:** Agreed test plan for the joint load test.

**Buying signals**
- Vikram agreed to run the same 10x test against their tuned EKS setup, as a fair comparison.
- Sneha has a branch of the storefront already deploying to Vercel previews.

**Risks**
- Vikram's team will own running the AWS side of the test; risk of a biased comparison.
- Payment gateway team hasn't been looped in on the checkout path.

**Next steps**
- Run both load tests the week of 2026-11-16.
- Kavya to set up exec readout with Ananya after results.
