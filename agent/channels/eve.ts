import { localDev, vercelOidc, vercelSubject } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

// The Deal Pulse dashboard (Vercel project se-sentiment-dashboard) calls this agent from its
// server with its own Vercel OIDC token. Tokens minted for this agent's own project are also
// accepted, so `eve remote invoke` with this project's .env.local keeps working.
export default eveChannel({
  auth: [
    vercelOidc({
      subjects: [vercelSubject({ teamSlug: "lawrencecrowther-5014", projectName: "se-sentiment-dashboard" })],
    }),
    localDev(),
  ],
});
