import { slackChannel } from "eve/channels/slack";

import { slackCredentials } from "../lib/slack-credentials.ts";

export default slackChannel({
  credentials: slackCredentials,
});
