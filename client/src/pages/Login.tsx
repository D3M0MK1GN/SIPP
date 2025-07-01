import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loginSchema } from "@shared/schema";

export default function Login() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido, ${data.user.firstName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // The auth check will automatically redirect to dashboard
    },
    onError: (error: any) => {
      // Extraer el mensaje de error sin el código de estado
      let errorMessage = "Usuario o Contraseña Incorrectos";
      let errorTitle = "Error de autenticación";
      
      if (error.message) {
        // Si el mensaje contiene el patrón "409: mensaje", es un conflicto de sesión
        if (error.message.includes("409:")) {
          errorTitle = "Sesión Activa Detectada";
          const match = error.message.match(/^\d+:\s*(.+)$/);
          if (match) {
            errorMessage = match[1];
          }
        } else if (error.message.includes("401:")) {
          // Extraer el mensaje de error 401
          const match = error.message.match(/^\d+:\s*(.+)$/);
          if (match) {
            errorMessage = match[1];
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: { username: string; password: string }) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative">
      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <Card className="w-full max-w-md mx-4 shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Sistema Policial
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Gestión de Registros Policiales
          </p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ingrese su usuario" 
                        autoComplete="username"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Ingrese su contraseña"
                          autoComplete="current-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <p className="font-medium">Credenciales por defecto:</p>
              <p>Usuario: <span className="font-mono">admin</span></p>
              <p>Contraseña: <span className="font-mono">123456</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}