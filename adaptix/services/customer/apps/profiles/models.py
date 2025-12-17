import uuid
from django.db import models

class Customer(models.Model):
    class Tier(models.TextChoices):
        SILVER = 'SILVER', 'Silver'
        GOLD = 'GOLD', 'Gold'
        PLATINUM = 'PLATINUM', 'Platinum'
        ELITE = 'ELITE', 'Elite'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    loyalty_points = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tier = models.CharField(
        max_length=20, 
        choices=Tier.choices, 
        default=Tier.SILVER
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_tier(self):
        """Update tier based on points"""
        points = float(self.loyalty_points)
        old_tier = self.tier
        
        if points >= 2000:
            self.tier = self.Tier.ELITE
        elif points >= 1000:
            self.tier = self.Tier.PLATINUM
        elif points >= 500:
            self.tier = self.Tier.GOLD
        else:
            self.tier = self.Tier.SILVER
            
        if old_tier != self.tier:
            self.save(update_fields=['tier'])

    def __str__(self):
        return f"{self.name} ({self.phone}) - {self.tier}"
