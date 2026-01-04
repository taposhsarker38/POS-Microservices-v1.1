import uuid
import datetime

def generate_serial_number(product_prefix="FRZ"):
    """
    Generates a unique serial number for a product unit.
    Format: [PREFIX]-[YEAR][MONTH]-[RANDOM_HEX]
    Example: FRZ-202601-A4B2
    """
    now = datetime.datetime.now()
    year_month = now.strftime("%Y%m")
    unique_suffix = uuid.uuid4().hex[:4].upper()
    return f"{product_prefix}-{year_month}-{unique_suffix}"
