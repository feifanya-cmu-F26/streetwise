// Read-only integration probe: opens official portals; never fills or submits a form.
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import Browserbase from "@browserbasehq/sdk";
const apiKey = process.env.BROWSERBASE_API_KEY;
const sdk = new Browserbase({ apiKey });
const projectId =
  process.env.BROWSERBASE_PROJECT_ID || (await sdk.projects.list())[0]?.id;
if (!projectId) throw new Error("Browserbase project missing");
let browser, stagehand;
try {
  browser = await browserbase.launch({
    apiKey,
    projectId,
    keepAlive: true,
    api_timeout: 180,
  });
  stagehand = await Stagehand.create({
    browser,
    model: { modelName: "openai/gpt-5.4-mini" },
    logging: { level: "off" },
  });
  const page = await browser.context.activePage();
  for (const [name, url] of [
    ["Mountain View", "https://clients.comcate.com/newrequest.php?id=128"],
    ["County Roads", "https://santaclara.maintstar.co/portal/#/workRequestAdd"],
    ["Caltrans", "https://csr.dot.ca.gov/"],
  ]) {
    await page.goto(url);
    console.log(
      JSON.stringify({
        portal: name,
        url: await page.url(),
        title: await page.title(),
      }),
    );
  }
  const { data } = await stagehand.extract(
    "What is the page title and is there a service request form? Do not take any action.",
  );
  console.log(JSON.stringify({ extraction: data }));
  const live = await sdk.sessions.debug(browser.sessionId);
  console.log(
    JSON.stringify({ liveViewAvailable: !!live.debuggerFullscreenUrl }),
  );
} finally {
  if (stagehand) {
    const rpc = stagehand.rpcClient;
    try {
      await stagehand.close();
    } finally {
      rpc?.close(undefined, { closeTransport: true });
    }
  }
  if (browser) await browser.close();
}
