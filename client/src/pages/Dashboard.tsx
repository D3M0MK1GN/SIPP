import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Search, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to home if not authenticated or not admin
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
    
    if (!isLoading && isAuthenticated && user && user.role !== 'admin') {
      toast({
        title: "Acceso Denegado",
        description: "Solo los administradores pueden acceder al dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/search";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-700 dark:text-gray-200 mb-2">Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400">Resumen de actividades del sistema</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-600 dark:border-l-blue-400">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Registros</p>
                <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                  {statsLoading ? "..." : stats?.totalRecords?.toLocaleString() || "0"}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Users className="text-blue-600 dark:text-blue-400 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 dark:border-l-green-400">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Usuarios Activos</p>
                <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                  {statsLoading ? "..." : stats?.activeUsers?.toLocaleString() || "0"}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <UserCheck className="text-green-600 dark:text-green-400 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 dark:border-l-purple-400">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Búsquedas Hoy</p>
                <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                  {statsLoading ? "..." : stats?.todaySearches?.toLocaleString() || "0"}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <Search className="text-purple-600 dark:text-purple-400 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-400">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Registros Hoy</p>
                <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                  {statsLoading ? "..." : stats?.todayRegistrations?.toLocaleString() || "0"}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <PlusCircle className="text-orange-600 dark:text-orange-400 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Actividades Recientes</h3>
            <div className="space-y-4">
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : activities && activities.length > 0 ? (
                activities.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${getActivityTypeColor(activity.action)}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getActivityDescription(activity.action)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.createdAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  <p className="text-sm">No hay actividades recientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Actividad Semanal</h3>
            <div className="space-y-3">
              {weeklyLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : weeklyActivity && weeklyActivity.length > 0 ? (
                weeklyActivity.map((day: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{day.day}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((day.count / 10) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{day.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  <p className="text-sm">No hay datos de actividad semanal</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}