import { localDev, vercelOidc, vercelSubject } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

import { recordedAudience } from "../lib/observability.ts";

// The Deal Pulse dashboard (Vercel project se-sentiment-dashboard) calls this agent from its
// production server with its own Vercel OIDC token. Tokens minted for this agent's own project
// are also accepted, so `eve remote invoke` with this project's .env.local keeps working.
// eve never accepts another project's CLI-pulled development tokens, so a local dashboard
// should point EVE_AGENT_URL at a local `eve dev` instead.
export default eveChannel({
  auth: [
    vercelOidc({
      subjects: [vercelSubject({ teamSlug: "lawrencecrowther-5014", projectName: "se-sentiment-dashboard" })],
    }),
    localDev(),
  ],
  audience: recordedAudience,
});
