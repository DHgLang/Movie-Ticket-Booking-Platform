import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { bookingApi } from "./functions/booking-api/resource";
import { bookingWorker } from "./functions/booking-worker/resource";
import { Duration, Stack, RemovalPolicy } from "aws-cdk-lib";
import { CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { EventSourceMapping } from "aws-cdk-lib/aws-lambda";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { CfnAppMonitor } from "aws-cdk-lib/aws-rum";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

const backend = defineBackend({
  auth,
  data,
  bookingApi,
  bookingWorker,
});

// Same stack as Lambda — avoids circular dependency between nested stacks
const apiStack = Stack.of(backend.bookingApi.resources.lambda);

const dlq = new Queue(apiStack, "BookingDLQ");

const bookingQueue = new Queue(apiStack, "BookingQueue", {
  visibilityTimeout: Duration.seconds(60),
  deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
});

const storeTable = new Table(apiStack, "BookingStoreTable", {
  partitionKey: { name: "pk", type: AttributeType.STRING },
  sortKey: { name: "sk", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: "ttl",
});

const posterBucket = new Bucket(apiStack, "MoviePosterBucket", {
  blockPublicAccess: new BlockPublicAccess({
    blockPublicAcls: false,
    ignorePublicAcls: false,
    blockPublicPolicy: false,
    restrictPublicBuckets: false,
  }),
  publicReadAccess: true,
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const identityPoolId = backend.auth.resources.cfnResources.cfnIdentityPool.ref;
const rumGuestRole = backend.auth.resources.unauthenticatedUserIamRole;
const rumAuthRole = backend.auth.resources.authenticatedUserIamRole;
const rumMonitorName = "spirit-movie-rum";

const rumPutEvents = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["rum:PutRumEvents"],
  resources: [
    `arn:aws:rum:${apiStack.region}:${apiStack.account}:appmonitor/${rumMonitorName}`,
  ],
});

rumGuestRole.addToPrincipalPolicy(rumPutEvents);
rumAuthRole.addToPrincipalPolicy(rumPutEvents);

const rumMonitor = new CfnAppMonitor(apiStack, "SpiritMovieRum", {
  name: rumMonitorName,
  domainList: [
    "main.d2zv6ka00i1nyo.amplifyapp.com",
    "localhost",
    "127.0.0.1",
  ],
  appMonitorConfiguration: {
    allowCookies: true,
    sessionSampleRate: 1,
    telemetries: ["performance", "errors", "http"],
    identityPoolId,
    guestRoleArn: rumGuestRole.roleArn,
  },
});

const httpApi = new HttpApi(apiStack, "BookingHttpApi", {
  apiName: "movie-booking-api",
  corsPreflight: {
    allowOrigins: ["*"],
    allowMethods: [CorsHttpMethod.ANY],
    allowHeaders: ["*"],
  },
});

const tmdbApiKey = process.env.TMDB_API_KEY ?? "";

backend.bookingApi.addEnvironment("BOOKING_QUEUE_URL", bookingQueue.queueUrl);
backend.bookingApi.addEnvironment("STORE_TABLE_NAME", storeTable.tableName);
backend.bookingApi.addEnvironment("TMDB_API_KEY", tmdbApiKey);
backend.bookingApi.addEnvironment("POSTER_BUCKET_NAME", posterBucket.bucketName);
backend.bookingApi.addEnvironment(
  "POSTER_CDN_BASE",
  `https://${posterBucket.bucketRegionalDomainName}`
);
backend.bookingApi.addEnvironment("RUM_APP_MONITOR_NAME", rumMonitor.name);
backend.bookingApi.addEnvironment("VNPAY_TMN_CODE", process.env.VNPAY_TMN_CODE ?? "");
backend.bookingApi.addEnvironment("VNPAY_HASH_SECRET", process.env.VNPAY_HASH_SECRET ?? "");
backend.bookingApi.addEnvironment(
  "VNPAY_URL",
  process.env.VNPAY_URL ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
);
backend.bookingApi.addEnvironment(
  "FRONTEND_URL",
  process.env.FRONTEND_URL ?? "https://main.d2zv6ka00i1nyo.amplifyapp.com"
);
backend.bookingApi.addEnvironment(
  "VNPAY_RETURN_URL",
  process.env.VNPAY_RETURN_URL ??
    `${process.env.FRONTEND_URL ?? "https://main.d2zv6ka00i1nyo.amplifyapp.com"}/payment/result`
);
backend.bookingWorker.addEnvironment("STORE_TABLE_NAME", storeTable.tableName);

bookingQueue.grantSendMessages(backend.bookingApi.resources.lambda);
storeTable.grantReadWriteData(backend.bookingApi.resources.lambda);
storeTable.grantReadWriteData(backend.bookingWorker.resources.lambda);
posterBucket.grantReadWrite(backend.bookingApi.resources.lambda);

backend.bookingApi.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["cloudwatch:GetMetricData"],
    resources: ["*"],
  })
);

const integration = new HttpLambdaIntegration(
  "BookingApiIntegration",
  backend.bookingApi.resources.lambda
);

httpApi.addRoutes({
  path: "/{proxy+}",
  methods: [HttpMethod.ANY],
  integration,
});

httpApi.addRoutes({
  path: "/health",
  methods: [HttpMethod.GET],
  integration,
});

bookingQueue.grantConsumeMessages(backend.bookingWorker.resources.lambda);

new EventSourceMapping(apiStack, "BookingWorkerMapping", {
  target: backend.bookingWorker.resources.lambda,
  eventSourceArn: bookingQueue.queueArn,
  batchSize: 5,
});

backend.addOutput({
  custom: {
    apiUrl: httpApi.url ?? "",
    bookingQueueUrl: bookingQueue.queueUrl,
    posterBucketName: posterBucket.bucketName,
    posterCdnBase: `https://${posterBucket.bucketRegionalDomainName}`,
    rumAppMonitorId: rumMonitor.attrId,
    rumAppMonitorName: rumMonitor.name,
    cloudwatchRumConsoleUrl: `https://ap-southeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-southeast-1#rum:app-monitor/${rumMonitor.name}`,
  },
});
