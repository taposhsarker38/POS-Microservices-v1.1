import random
import time
from django.core.management.base import BaseCommand
from apps.assets.models import Asset, AssetTelemetry
from django.utils import timezone

class Command(BaseCommand):
    help = 'Simulates IoT telemetry data for active assets'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=1, help='Number of telemetry sets per asset')
        parser.add_argument('--loop', action='store_true', help='Continuously generate data')

    def handle(self, *args, **options):
        count = options['count']
        loop = options['loop']

        self.stdout.write(self.style.SUCCESS('Starting IoT Simulation...'))

        while True:
            active_assets = Asset.objects.filter(status='active')
            if not active_assets.exists():
                self.stdout.write(self.style.WARNING('No active assets found to simulate.'))
                if not loop: break
                time.sleep(10)
                continue

            for asset in active_assets:
                for _ in range(count):
                    # Generate realistic-ish data
                    # Normal temp 40-60C, Vibration 0.1-0.5, Power 100-500W
                    # Anomaly injection: 5% chance of spike
                    is_anomaly = random.random() < 0.05
                    
                    temp = random.uniform(40, 60)
                    vib = random.uniform(0.1, 0.5)
                    
                    if is_anomaly:
                        temp += random.uniform(30, 50) # Overheat
                        vib += random.uniform(1.0, 2.0) # High vibration
                        self.stdout.write(self.style.NOTICE(f"Injecting anomaly for {asset.name}"))

                    AssetTelemetry.objects.create(
                        asset=asset,
                        temperature=temp,
                        vibration=vib,
                        power_usage=random.uniform(100, 800),
                        usage_hours=0.5, # Incremental
                        timestamp=timezone.now()
                    )
                
                self.stdout.write(f"Generated telemetry for {asset.name}")

            if not loop:
                break
            
            time.sleep(5) # Wait before next batch

        self.stdout.write(self.style.SUCCESS('IoT Simulation batch completed.'))
