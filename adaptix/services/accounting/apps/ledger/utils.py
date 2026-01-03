from django.db import connection

def get_tenant_unit_ids(company_uuid):
    """
    Given a company_uuid (which might be a Tenant ID or a Unit ID),
    returns a list of all related Unit IDs (Company PKs) in that tenant.
    
    This works across schemas in Single DB mode.
    """
    if not company_uuid:
        return []
        
    try:
        with connection.cursor() as cursor:
            # Query the company schema's tenants_company table
            # We want all IDs that share the same auth_company_uuid as the provided ID,
            # or where the ID itself is the auth_company_uuid.
            query = """
                SELECT id, auth_company_uuid FROM company.tenants_company 
                WHERE auth_company_uuid = (
                    SELECT auth_company_uuid FROM company.tenants_company WHERE id = %s OR auth_company_uuid = %s LIMIT 1
                )
                OR auth_company_uuid = %s
                OR id = %s
            """
            cursor.execute(query, [company_uuid, company_uuid, company_uuid, company_uuid])
            rows = cursor.fetchall()
            ids = set()
            for row in rows:
                ids.add(str(row[0])) # unit id
                ids.add(str(row[1])) # tenant id
            
            ids = list(ids)
            
            # If no matches found in company table (maybe it's a test ID not in DB),
            # at least return the ID itself.
            if not ids:
                return [str(company_uuid)]
            return ids
    except Exception as e:
        # Fallback if company schema doesn't exist or other error
        print(f"Error resolving tenant units: {e}")
        return [str(company_uuid)]
