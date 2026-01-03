import os

class ServiceRegistry:
    """
    Central registry for service URLs.
    Resolves base URLs for microservices, allowing for environment-based overrides.
    """
    
    # Default Docker Compose service names and ports
    _DEFAULTS = {
        "auth": "http://auth-service:8000",
        "company": "http://company:8000",
        "asset": "http://asset:8000",
        "customer": "http://customer:8000",
        "product": "http://product:8000",
        "pos": "http://pos:8000",
        "inventory": "http://inventory:8000",
        "purchase": "http://purchase:8000",
        "hrms": "http://hrms-service:8000",
        "accounting": "http://accounting:8000",
        "notification": "http://notification:8000",
        "reporting": "http://reporting:8000",
        "promotion": "http://promotion:8000",
        "payment": "http://payment:8000",
        "intelligence": "http://ai-service:8000",
        "quality": "http://quality-service:8000",
        "logistics": "http://logistics-service:8000",
    }

    @classmethod
    def get_url(cls, service_name: str) -> str:
        """
        Get the base URL for a service.
        
        Args:
            service_name (str): The name of the service (e.g., 'inventory', 'auth').
            
        Returns:
            str: The base URL, e.g., 'http://inventory:8000'
            
        Raises:
            ValueError: If the service is not known and no env var is provided.
        """
        service_key = service_name.lower()
        
        # 1. Check for specific Environment Variable (e.g. INVENTORY_SERVICE_URL)
        env_var_name = f"{service_key.upper()}_SERVICE_URL"
        env_url = os.environ.get(env_var_name)
        if env_url:
            return env_url.rstrip("/")
            
        # 2. Return Default from Registry
        default_url = cls._DEFAULTS.get(service_key)
        if default_url:
            return default_url
            
        # 3. Fallback/Error
        raise ValueError(f"Service '{service_name}' not found in registry. Please set {env_var_name}.")

    @classmethod
    def get_api_url(cls, service_name: str) -> str:
        """Returns the full API base URL (e.g., http://inventory:8000/api/inventory)"""
        service_key = service_name.lower()
        base = cls.get_url(service_key)
        # Standard convention: /api/{service_name}
        return f"{base}/api/{service_key}"
