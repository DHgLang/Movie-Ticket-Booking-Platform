import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import type { TrafficMetrics } from "../../../shared/types";

const REGION = process.env.AWS_REGION ?? "ap-southeast-1";
const RUM_APP = process.env.RUM_APP_MONITOR_NAME ?? "spirit-movie-rum";
const LAMBDA_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME ?? "";
const cw = new CloudWatchClient({ region: REGION });

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function querySum(params: {
  namespace: string;
  metricName: string;
  dimensions?: { Name: string; Value: string }[];
  days: number;
}): Promise<{ date: string; value: number }[]> {
  const end = new Date();
  const start = daysAgo(params.days);
  const res = await cw.send(
    new GetMetricDataCommand({
      StartTime: start,
      EndTime: end,
      MetricDataQueries: [
        {
          Id: "m1",
          MetricStat: {
            Metric: {
              Namespace: params.namespace,
              MetricName: params.metricName,
              Dimensions: params.dimensions,
            },
            Period: 86400,
            Stat: "Sum",
          },
          ReturnData: true,
        },
      ],
    })
  );

  const series = res.MetricDataResults?.[0];
  if (!series?.Timestamps?.length) return [];

  return series.Timestamps.map((ts, i) => ({
    date: dayKey(ts),
    value: series.Values?.[i] ?? 0,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function sumValues(rows: { value: number }[]) {
  return rows.reduce((s, r) => s + r.value, 0);
}

export async function getTrafficMetrics(days = 7): Promise<TrafficMetrics> {
  const to = dayKey(new Date());
  const from = dayKey(daysAgo(days));

  const [pageViewsByDay, sessionsByDay, lambdaInvocationsByDay, lambdaErrorsByDay] =
    await Promise.all([
      querySum({
        namespace: "AWS/RUM",
        metricName: "PageViewCount",
        dimensions: [{ Name: "application_name", Value: RUM_APP }],
        days,
      }).catch(() => []),
      querySum({
        namespace: "AWS/RUM",
        metricName: "SessionCount",
        dimensions: [{ Name: "application_name", Value: RUM_APP }],
        days,
      }).catch(() => []),
    LAMBDA_NAME
      ? querySum({
          namespace: "AWS/Lambda",
          metricName: "Invocations",
          dimensions: [{ Name: "FunctionName", Value: LAMBDA_NAME }],
          days,
        }).catch(() => [])
      : Promise.resolve([]),
    LAMBDA_NAME
      ? querySum({
          namespace: "AWS/Lambda",
          metricName: "Errors",
          dimensions: [{ Name: "FunctionName", Value: LAMBDA_NAME }],
          days,
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const apiRequestsByDay = lambdaInvocationsByDay;

  const pageViews = sumValues(pageViewsByDay);
  const sessions = sumValues(sessionsByDay);

  return {
    from,
    to,
    summary: {
      pageViews,
      sessions: sessions || pageViews,
      apiRequests: sumValues(apiRequestsByDay),
      lambdaInvocations: sumValues(lambdaInvocationsByDay),
      lambdaErrors: sumValues(lambdaErrorsByDay),
    },
    pageViewsByDay,
    apiRequestsByDay,
    lambdaInvocationsByDay,
    lambdaErrorsByDay,
  };
}
