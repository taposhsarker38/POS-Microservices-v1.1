// services/ws-gateway/tracing.js
import opentelemetry from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";

// Only enable if configured
if (process.env.ENABLE_TRACING === "True") {
  const traceExporter = new OTLPTraceExporter({
    url: "http://jaeger:4318/v1/traces", // http/protobuf endpoint
    headers: {},
  });

  const sdk = new opentelemetry.NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: "ws-gateway",
  });

  sdk.start();
  console.log("OpenTelemetry Tracing initialized for ws-gateway");

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => console.log("Tracing terminated"))
      .catch((error) => console.log("Error terminating tracing", error))
      .finally(() => process.exit(0));
  });
} else {
  console.log("Tracing disabled via env");
}
