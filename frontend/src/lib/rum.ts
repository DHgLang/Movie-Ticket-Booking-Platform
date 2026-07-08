import outputs from "../../../amplify_outputs.json";
import type { AwsRum } from "aws-rum-web";

type CustomOutputs = {
  rumAppMonitorId?: string;
  rumAppMonitorName?: string;
};

let rumClient: AwsRum | null = null;

export async function initAwsRum() {
  if (rumClient) return rumClient;

  const custom = (outputs as { custom?: CustomOutputs }).custom;
  const appMonitorId = custom?.rumAppMonitorId;
  const identityPoolId = outputs.auth?.identity_pool_id;
  const region = outputs.auth?.aws_region ?? "ap-southeast-1";

  if (!appMonitorId || !identityPoolId || appMonitorId === "REPLACE_ME") {
    return null;
  }

  try {
    const { AwsRum } = await import("aws-rum-web");
    rumClient = new AwsRum(appMonitorId, "1.0.0", region, {
      sessionSampleRate: 1,
      identityPoolId,
      endpoint: `https://dataplane.rum.${region}.amazonaws.com`,
      telemetries: ["performance", "errors", "http"],
      allowCookies: true,
      enableXRay: false,
      disableAutoPageView: true,
    });
    return rumClient;
  } catch (e) {
    console.warn("CloudWatch RUM unavailable:", e);
    return null;
  }
}

export async function recordRumPageView(pageId?: string) {
  const client = rumClient ?? (await initAwsRum());
  if (!client) return;

  client.recordPageView(pageId ?? window.location.pathname);
}

export function getRumConsoleUrl(): string | undefined {
  const custom = (outputs as { custom?: CustomOutputs }).custom;
  return (custom as { cloudwatchRumConsoleUrl?: string })?.cloudwatchRumConsoleUrl;
}
