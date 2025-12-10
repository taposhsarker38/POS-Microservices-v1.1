# Main Categories
FMCG = 'fmcg'
FOOD_EXPO = 'food_expo'
COFFEE_TEA = 'coffee_tea'
FASHION = 'fashion'
CLOTHING = 'clothing'
TAILOR = 'tailor'
LAUNDRY = 'laundry'
LUGGAGE = 'luggage'
SPORTS = 'sports'
PHARMACY = 'pharmacy'
EYEWEAR = 'eyewear'
HEALTHCARE = 'healthcare'
BEAUTY_SPA = 'beauty_spa'
FOOTWEAR = 'footwear'
ELECTRONICS = 'electronics'
IT_MOBILE = 'it_mobile'
AUTOMOTIVE = 'automotive'
HARDWARE = 'hardware'
FURNITURE = 'furniture'
JEWELRY = 'jewelry'
BLACKSMITH = 'blacksmith'
STATIONERY = 'stationery'
LEGAL = 'legal'
MATRIMONIAL = 'matrimonial'
FREELANCING = 'freelancing'
STUDIO = 'studio'
DESIGN_HOUSE = 'design_house'
CONSTRUCTION = 'construction'
CUSTOMER_SERVICE = 'customer_service'
CONVENTION_HALL = 'convention_hall'
PARKING = 'parking'
FUNERAL = 'funeral'
PET_SHOP = 'pet_shop'
FINANCE = 'finance'
TOYS = 'toys'
HELIPAD = 'helipad'
AGRO = 'agro'
COURIER = 'courier'
ENTERTAINMENT = 'entertainment'

BUSINESS_TYPE_CHOICES = (
    (FMCG, 'FMCG (Dairy, Bakery, Grocery, Fish/Meat)'),
    (FOOD_EXPO, 'Food Expo (Restaurant, Fast Food)'),
    (COFFEE_TEA, 'Coffee & Tea Corner'),
    (FASHION, 'FitFat (Fashion - RMG)'),
    (CLOTHING, 'Clothing (Fabrics, Home Tex)'),
    (TAILOR, "Tailor's Shop"),
    (LAUNDRY, 'Laundry Shop'),
    (LUGGAGE, 'CarryOne (Luggage & Baggage)'),
    (SPORTS, 'Toss (Sports, Kids Zone)'),
    (PHARMACY, 'PharmaTech (Medicine)'),
    (EYEWEAR, 'LensLine (Eyeware)'),
    (HEALTHCARE, 'Day Care / Doctor Point'),
    (BEAUTY_SPA, 'Beauty Care (Spa & Saloon)'),
    (FOOTWEAR, 'Footwear Shop'),
    (ELECTRONICS, 'Electronics Products'),
    (IT_MOBILE, 'IT and Mobile Phone'),
    (AUTOMOTIVE, 'Torque Automobiles'),
    (HARDWARE, 'Lock & Hook (Hardware)'),
    (FURNITURE, 'Joratali (Furniture)'),
    (JEWELRY, 'Gold Stone (Jewelry)'),
    (BLACKSMITH, 'Black Smith'),
    (STATIONERY, 'Clips (Books & Stationery)'),
    (LEGAL, 'Law Firm'),
    (MATRIMONIAL, 'KajerKazi (Matrimonial)'),
    (FREELANCING, 'Freelancing Studio'),
    (STUDIO, 'Aloadhari (Studio)'),
    (DESIGN_HOUSE, 'ThemeSketch (Design House)'),
    (CONSTRUCTION, 'SandsBricks (Construction)'),
    (CUSTOMER_SERVICE, 'ThikThak (Customer Service)'),
    (CONVENTION_HALL, 'Convention Hall'),
    (PARKING, 'Parking'),
    (FUNERAL, 'Funeral Shop'),
    (PET_SHOP, 'Pet Shop'),
    (FINANCE, 'Finance and Banking'),
    (TOYS, 'Toys Shop'),
    (HELIPAD, 'Helipad'),
    (AGRO, 'Agro and Plantation'),
    (COURIER, 'Courier Service'),
    (ENTERTAINMENT, 'Theatre and Cineplex'),
)

# Feature Flags Mapping
# This defines what modules are enabled for each business type
DEFAULT_FEATURES = {
    FMCG: ['pos', 'inventory', 'expiry_tracking', 'weight_scale'],
    FOOD_EXPO: ['pos', 'inventory', 'table_management', 'kitchen_display', 'recipe_management'],
    COFFEE_TEA: ['pos', 'inventory', 'table_management', 'modifiers'],
    FASHION: ['pos', 'inventory', 'variants', 'barcoding', 'alterations'],
    CLOTHING: ['pos', 'inventory', 'variants', 'measurement_recording'],
    TAILOR: ['pos', 'inventory', 'measurements', 'appointments', 'job_cards'],
    LAUNDRY: ['pos', 'tracking', 'sms_notifications', 'delivery'],
    HEALTHCARE: ['appointments', 'prescriptions', 'patient_history', 'billing'],
    BEAUTY_SPA: ['appointments', 'resource_scheduling', 'membership', 'billing'],
    FINANCE: ['accounting', 'investments', 'loans', 'verification'],
    AGRO: ['crop_management', 'weather_tracking', 'inventory', 'yield_analysis'],
    ENTERTAINMENT: ['ticketing', 'seat_booking', 'event_management'],
    # Add defaults for others...
}
