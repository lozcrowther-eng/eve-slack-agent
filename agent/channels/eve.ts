import { localDev, vercelOidc, vercelSubject } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

// The Deal Pulse dashboard (Vercel project se-sentiment-dashboard) calls this agent from its
// server with its own Vercel OIDC token: production, plus development for its local `next dev`.
// Tokens minted for this agent's own project are also accepted, so `eve remote invoke` with
// this project's .env.local keeps working.
const dashboard = { teamSlug: "lawrencecrowther-5014", projectName: "se-sentiment-dashboard" };

export default eveChannel({
  auth: [
    vercelOidc({
      subjects: [
        vercelSubject({ ...dashboard, environment: "production" }),
        vercelSubject({ ...dashboard, environment: "development" }),
      ],
    }),
    localDev(),
  ],
});
