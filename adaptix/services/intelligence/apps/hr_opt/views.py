from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
import pandas as pd
from .models import AttritionPrediction

class AttritionRiskView(APIView):
    def post(self, request):
        # 1. Fetch HR Data (Attendance and Employee info)
        # Note: hrms schema table 'attendance_attendance' and 'hrms_employee'
        # We check last 30 days attendance
        
        query = """
            SELECT 
                e.id as employee_uuid,
                COUNT(a.id) as days_present,
                SUM(EXTRACT(EPOCH FROM (a.check_out - a.check_in))/3600) as total_hours
            FROM hrms.employees_employee e
            LEFT JOIN hrms.attendance_attendance a ON e.id = a.employee_id
            WHERE a.date >= NOW() - INTERVAL '30 days'
            GROUP BY e.id
        """
        
        try:
            df = pd.read_sql(query, connection)
            if df.empty:
                return Response({"message": "No HR data available for analysis"}, status=400)

            # 2. Heuristic Logic (ML model placeholder)
            # Factors: Low attendance (high absenteeism), Overwork (very high hours)
            # Assumption: Standard work hours = 160 hours/month (8*20)
            
            STANDARD_HOURS = 160
            predictions = []
            AttritionPrediction.objects.all().delete()
            
            for index, row in df.iterrows():
                hours = row['total_hours'] if pd.notna(row['total_hours']) else 0
                days = row['days_present'] if pd.notna(row['days_present']) else 0
                
                # Risk Calculation Logic
                risk_score = 0.1 # Base risk
                
                # High Risk: Too low attendance (Quiet Quitting?)
                if days < 15:
                    risk_score += 0.4
                    
                # High Risk: Burnout (Overwork)
                if hours > 220:
                    risk_score += 0.3
                    
                risk_level = "Low"
                if risk_score > 0.7:
                    risk_level = "High"
                elif risk_score > 0.4:
                    risk_level = "Medium"
                    
                predictions.append(AttritionPrediction(
                    employee_uuid=row['employee_uuid'],
                    risk_score=round(risk_score, 2),
                    risk_level=risk_level,
                    avg_monthly_hours=int(hours),
                    absenteeism_rate=round((20-days)/20.0, 2) if days < 20 else 0
                ))
            
            AttritionPrediction.objects.bulk_create(predictions)
            
            return Response({
                "message": "Attrition risk analysis completed",
                "employees_analyzed": len(predictions)
            })

        except Exception as e:
             return Response({"error": str(e)}, status=500)

    def get(self, request):
        items = AttritionPrediction.objects.all().order_by('-risk_score')
        data = [
            {
                "employee": items.employee_uuid,
                "risk": items.risk_level,
                "score": items.risk_score,
                "hours": items.avg_monthly_hours
            }
            for items in items
        ]
        return Response(data)
