import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Search, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "No autorizado",
        description: "Iniciando sesión nuevamente...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/dashboard/activities"],
    enabled: isAuthenticated,
  });

  const { data: weeklyActivity, isLoading: weeklyLoading } = useQuery({
    queryKey: ["/api/dashboard/weekly-activity"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const getActivityTypeColor = (action: string) => {
    switch (action) {
      case 'registration':
        return 'bg-green-500';
      case 'search':
        return 'bg-blue-500';
      case 'login':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getActivityDescription = (action: string) => {
    switch (action) {
      case 'registration':
        return 'Registro completado';
      case 'search':
        return 'Búsqueda realizada';
      case 'login':
        return 'Inicio de sesión';
      default:
        return 'Actividad';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-700 mb-2">Dashboard</h2>
          <p className="text-gray-600">Resumen de actividades del sistema</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Registros</p>
                  <p className="text-3xl font-bold text-gray-700">
                    {statsLoading ? "..." : stats?.totalRecords?.toLocaleString() || "0"}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="text-blue-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-gray-700">
                    {statsLoading ? "..." : stats?.activeUsers || "0"}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <UserCheck className="text-green-500 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Búsquedas Hoy</p>
                  <p className="text-3xl font-bold text-gray-700">
                    {statsLoading ? "..." : stats?.todaySearches || "0"}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Search className="text-yellow-500 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Registros Hoy</p>
                  <p className="text-3xl font-bold text-gray-700">
                    {statsLoading ? "..." : stats?.todayRegistrations || "0"}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <PlusCircle className="text-red-500 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Actividad Semanal</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {weeklyLoading ? (
                  <div className="w-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => {
                    const height = Math.max(8, Math.random() * 32); // Simplified chart representation
                    return (
                      <div
                        key={day}
                        className="bg-blue-600 rounded-t w-full flex items-end justify-center text-white text-xs pb-1"
                        style={{ height: `${height * 4}px` }}
                      >
                        {day}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Actividades Recientes</h3>
              <div className="space-y-4">
                {activitiesLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : activities && activities.length > 0 ? (
                  activities.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getActivityTypeColor(activity.action)}`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {getActivityDescription(activity.action)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.createdAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p className="text-sm">No hay actividades recientes</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
