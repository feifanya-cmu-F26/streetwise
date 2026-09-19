import type { Page } from "@browserbasehq/stagehand";
import type { LiveReport } from "@/schemas/live";

// Verified against the official AskMV form. Never guess a category or click Submit.
export const ASK_MV_TOPICS: Record<string, [number, number, number]> = {
  pothole: [36, 2643, 11266], sidewalk: [36, 2643, 18005],
  street_light: [36, 2643, 10878], traffic_sign: [36, 2643, 10854],
  graffiti: [14, 3037, 10868], trash: [18, 4103, 16487],
  water_leak: [41, 2646, 10891], abandoned_vehicle: [30, 2649, 10952],
  other: [26, 2650, 10977],
};
export type PortalControl = { visible: boolean; disabled: boolean; value: string; checked: boolean; files: number };
export interface AskMvForm {
  read(selector: string): Promise<PortalControl | null>;
  click(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  waitEnabled(selector: string): Promise<void>;
  attach(): Promise<void>;
}
export function askMvForm(page: Page, attach: () => Promise<void>): AskMvForm {
  return {
    read: (selector) => page.evaluate((s) => {
      const e = document.querySelector<HTMLInputElement>(s);
      return e ? { visible: !!e.getClientRects().length, disabled: !!e.disabled,
        value: e.value || "", checked: !!e.checked, files: e.files?.length || 0 } : null;
    }, selector),
    click: (s) => page.locator(s).click(),
    fill: (s, value) => page.locator(s).fill(value),
    waitEnabled: async (s) => {
      if (!await page.waitForSelector(`${s}:not([disabled])`, { timeout: 10000 }))
        throw new Error("AskMV form did not enable after topic selection");
    },
    attach,
  };
}
export async function prepareAskMv(
  form: AskMvForm, report: LiveReport, check: () => Promise<void>,
): Promise<string | null> {
  const request = await form.read("#mailsent");
  if (!request) return "Open the AskMV request form, then resume.";
  if (request.disabled) {
    const topic = ASK_MV_TOPICS[report.report!.category];
    if (!topic) return "Choose the appropriate AskMV topic, then resume.";
    const [accordion, parent, child] = topic;
    const selector = `a[onclick*="updateTopicContent(${parent}, ${child})"]`;
    if (!(await form.read(selector))?.visible) {
      await check(); await form.click(`#accordionTopic_${accordion}`);
    }
    await check(); await form.click(selector);
    await form.waitEnabled("#mailsent");
  }
  // Reconcile the live form on every resume; checkpoints are not field readiness.
  const concern = 'input[name="fbtype"][value="1"]';
  if (!(await form.read('input[name="fbtype"]:checked'))) {
    await check(); await form.click(concern);
  }
  const nameParts = report.contact?.name.trim().split(/\s+/) || [];
  for (const [selector, value] of [
    ["#mailsent", `${report.report!.title}\n\n${report.report!.description}`],
    ["#generic", report.location.address || `${report.location.lat}, ${report.location.lng}`],
    ["#lstreetAddr", report.location.address?.split(",")[0] || ""],
    ...(report.contact?.portalReplyMode !== "anonymous" ? [
      ["#fname", nameParts[0] || ""], ["#lname", nameParts.slice(1).join(" ")],
      ["#email", report.contact?.email || ""], ["#phone", report.contact?.phone || ""],
    ] : []),
  ]) {
    const control = await form.read(selector);
    if (value && control?.visible && !control.disabled && !control.value.trim()) {
      await check(); await form.fill(selector, value);
    }
  }
  const attachment = await form.read('input[name="file1"]');
  if (attachment && !attachment.files) {
    if (!attachment.visible && (await form.read("#attachmentLink"))?.visible) {
      await check(); await form.click("#attachmentLink");
    }
    await check(); await form.attach();
  }
  if (report.contact?.portalReplyMode === "anonymous") {
    // Explicit per-report opt-out only; never downgrade a user to no replies by default.
    if (!(await form.read('input[name="autogen_user"][value="0"]'))?.visible) {
      await check(); await form.click("#tab3");
    }
    const noResponse = 'input[name="autogen_user"][value="0"]';
    if (!(await form.read(noResponse))?.checked) {
      await check(); await form.click(noResponse);
    }
  }
  if (report.contact?.portalReplyMode !== "anonymous" &&
      (await form.read('input[name="autogen_user"][value="0"]'))?.checked) {
    await check(); await form.click("#tab2");
    return "Sign in to AskMV for replies and tracking, then resume.";
  }
  const submit = await form.read("#sendrequestbutton");
  if (!submit || submit.disabled) {
    return report.contact?.portalReplyMode === "anonymous"
      ? "Complete the remaining verification in the browser, then resume."
      : "Your report is filled. Sign in to AskMV for replies, or choose anonymous without tracking.";
  }
  return null;
}
