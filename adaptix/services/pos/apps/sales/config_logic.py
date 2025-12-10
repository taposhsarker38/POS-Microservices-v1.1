def get_pos_config(company_settings):
    """
    Determines the POS configuration based on company feature flags.
    Returns a dict with UI flags.
    """
    feature_flags = company_settings.get("feature_flags", {})
    
    config = {
        "show_tables": feature_flags.get("table_management", False),
        "show_kitchen_display": feature_flags.get("kitchen_display", False),
        "show_modifiers": feature_flags.get("modifiers", False),
        "show_variants": feature_flags.get("variants", False),
        "show_expiry": feature_flags.get("expiry_tracking", False),
        "show_appointments": feature_flags.get("appointments", False),
        "enable_weighing_scale": feature_flags.get("weight_scale", False),
    }
    
    # Defaults based on business type logic could also go here if flags are missing
    
    return config
