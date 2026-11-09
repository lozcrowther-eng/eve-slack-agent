# Kestrel Travel Group: technical call notes

## 2026-10-28: POC check-in

**Attendees:** Marcus Lee (CTO), Hannah Brooks (Head of Frontend), Raj Patel (Platform Lead); Priya Raman (SA), Tom Gallagher (AE)

**Summary:** Mid-point review of the side-by-side POC. Kestrel's booking site is Next.js 16 on a self-managed container setup; marketing pages are on Netlify. They want one platform for both before the Black Friday fare sale.

**Buying signals**
- Hannah: "Our fare pages rebuild in 14 minutes on Netlify. On Vercel with ISR we're revalidating a single route in seconds. That's the whole ballgame for flash sales."
- Frontend team has already wired preview deployments into their Jira workflow on the Vercel POC.
- Raj confirmed Sydney region (syd1) for functions meets their data residency preference for customer PII.

**Risks**
- Marcus is anchored on Netlify's current contract price and asked for "a number that doesn't double our bill."
- Netlify has offered a 25% discount to renew and consolidate the booking site.
- Platform team has not yet load tested; Raj is sceptical about cold starts on fare search.

**Next steps**
- Load test fare search at 5x last year's Black Friday peak (owner: Priya + Raj).
- AE to share Enterprise pricing with a consolidated marketing + booking scope.

## 2026-11-06: Load test readout

**Attendees:** Hannah Brooks, Raj Patel; Priya Raman (SA)

**Summary:** Kestrel ran the load test on fare search and listing pages themselves.

**Buying signals**
- Raj: "p95 stayed under 220ms at 6x peak with Fluid compute. I was wrong about cold starts." He offered to present the results to Marcus.
- Hannah has drafted the internal recommendation for Vercel for both sites and wants it to the CTO by 2026-11-14.
- They asked for help with a migration plan for the Netlify marketing site (redirects, forms).

**Risks**
- Commercials are still unresolved; Marcus has not seen pricing yet.
- Netlify exec sponsor has requested a meeting with Marcus next week.

**Next steps**
- Joint session with Raj presenting load-test results to Marcus (target 2026-11-12).
- SA to deliver Netlify-to-Vercel migration plan for the marketing site.
