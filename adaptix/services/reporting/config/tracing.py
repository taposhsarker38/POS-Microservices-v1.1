from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME

def setup_tracing(service_name):
    resource = Resource(attributes={
        SERVICE_NAME: service_name
    })

    trace.set_tracer_provider(TracerProvider(resource=resource))
    
    otlp_exporter = OTLPSpanExporter(endpoint="http://jaeger:4317", insecure=True)
    
    span_processor = BatchSpanProcessor(otlp_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)

    from opentelemetry.instrumentation.django import DjangoInstrumentor
    from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor

    DjangoInstrumentor().instrument()
    Psycopg2Instrumentor().instrument(skip_dep_check=True)
    RequestsInstrumentor().instrument()
