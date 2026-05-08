# device/device_a.py
#
# This simulates a real device (sensor, machine, etc.)
# It generates fake readings and sends them to the OTel Collector.
#
# In a real project, you'd replace the random values with
# actual sensor reads (GPIO pins, serial port, MQTT, etc.)

import time
import random
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# ─── 1. Connect to the OTel Collector ─────────────────────────────────────────
#
# The collector is running on localhost:4317 (gRPC protocol)
exporter = OTLPMetricExporter(
    endpoint="http://localhost:4317",
    insecure=True
)

# Export metrics every 3 seconds
reader = PeriodicExportingMetricReader(
    exporter,
    export_interval_millis=3000
)

provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

# ─── 2. Define all the metrics this device produces ───────────────────────────
#
# A "meter" is like a namespace for your metrics.
# Think of it as the device's identity.
meter = metrics.get_meter("device-a", version="1.0.0")

# # Gauge = a value that can go up or down (like temperature)
temperature = meter.create_gauge(
    name="device.temperature",
    unit="celsius",
    description="Current temperature reading from zone sensor"
)

pressure = meter.create_gauge(
    name="device.pressure",
    unit="bar",
    description="Atmospheric pressure reading"
)

# These two will be FILTERED OUT by the collector — they never reach the UI
battery_level = meter.create_gauge(
    name="device.battery_level",
    unit="percent",
    description="Battery charge level"
)

# Counter = only goes up (like a total error count)
error_count = meter.create_counter(
    name="device.errors",
    unit="errors",
    description="Total error events since startup"
)

# ─── 3. Simulate sensor readings in a loop ────────────────────────────────────
#
# Attributes are key/value labels attached to each reading.
# The collector can filter or group by these too.
DEVICE_ATTRS = {"device_id": "A", "location": "zone-1", "model": "SensorPro-X"}

print("Device A started — sending metrics every 3 seconds")
print("Press Ctrl+C to stop\n")

# Start values (realistic-ish starting points)
temp_base = 68.0
pres_base = 1.013
battery   = 94.0
errors    = 0

try:
    while True:
        # Simulate gradual drift + small random noise
        temp_base  += random.uniform(-0.8, 0.8)
        temp_base   = max(55.0, min(85.0, temp_base))   # clamp 55–85°C

        pres_base  += random.uniform(-0.005, 0.005)
        pres_base   = max(0.95, min(1.08, pres_base))   # clamp realistic range

        battery    -= random.uniform(0.0, 0.05)          # slow drain
        battery     = max(0.0, battery)

        # Occasionally simulate an error (10% chance per cycle)
        if random.random() < 0.10:
            errors += 1
            print(f"  ⚠  Error event #{errors} generated (will be filtered by collector)")

        # Record all four metrics
        temperature.set(round(temp_base, 2), DEVICE_ATTRS)
        pressure.set(round(pres_base, 4),    DEVICE_ATTRS)
        battery_level.set(round(battery, 1), DEVICE_ATTRS)
        error_count.add(0, DEVICE_ATTRS)      # add 0 to report current counter

        print(
            f"  → temp={temp_base:.1f}°C  "
            f"pressure={pres_base:.4f}bar  "
            f"battery={battery:.1f}%  "
            f"errors={errors}"
        )

        time.sleep(3)

except KeyboardInterrupt:
    print("\nDevice A stopped.")
