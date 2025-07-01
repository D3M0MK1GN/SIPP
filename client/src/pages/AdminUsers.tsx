import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { createUserSchema, updateUserSchema, suspendUserSchema, searchUserSchema } from "@shared/schema";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserX, 
  UserCheck, 
  Search, 
  Filter,
  Eye,
  Clock
} from "lucide-react";
import { z } from "zod";

type User = {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: string;
  status: string;
  suspendedUntil?: string;
  suspendedReason?: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminUsers() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Forms
  const searchForm = useForm({
    resolver: zodResolver(searchUserSchema),
    defaultValues: {
      username: "",
      role: "",
      status: ""
    }
  });

  const createForm = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "officer"
    }
  });

  const editForm = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "officer",
      status: "active"
    }
  });

  const suspendForm = useForm({
    resolver: zodResolver(suspendUserSchema),
    defaultValues: {
      suspendedUntil: "",
      suspendedReason: ""
    }
  });

  // Get all users query
  const usersQuery = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.role === 'admin'
  });

  // Search users mutation
  const searchMutation = useMutation({
    mutationFn: async (criteria: z.infer<typeof searchUserSchema>) => {
      return apiRequest("/api/admin/users/search", {
        method: "POST",
        body: JSON.stringify(criteria),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/admin/users"], data);
      setSearchDialogOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "No tienes permisos para realizar esta acción",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Error al buscar usuarios",
        variant: "destructive",
      });
    }
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof createUserSchema>) => {
      return apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Usuario creado exitosamente",
      });
      createForm.reset();
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "No tienes permisos para realizar esta acción",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Error al crear usuario",
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...userData }: { id: number } & z.infer<typeof updateUserSchema>) => {
      return apiRequest(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Usuario actualizado exitosamente",
      });
      editForm.reset();
      setEditDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "No tienes permisos para realizar esta acción",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Error al actualizar usuario",
        variant: "destructive",
      });
    }
  });

  // Suspend user mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ id, ...suspendData }: { id: number } & z.infer<typeof suspendUserSchema>) => {
      return apiRequest(`/api/admin/users/${id}/suspend`, {
        method: "POST",
        body: JSON.stringify(suspendData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Usuario suspendido exitosamente",
      });
      suspendForm.reset();
      setSuspendDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "No tienes permisos para realizar esta acción",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Error al suspender usuario",
        variant: "destructive",
      });
    }
  });

  // Reactivate user mutation
  const reactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/users/${id}/reactivate`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Usuario reactivado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "No tienes permisos para realizar esta acción",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Error al reactivar usuario",
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Usuario eliminado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "No tienes permisos para realizar esta acción",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Error al eliminar usuario",
        variant: "destructive",
      });
    }
  });

  const onSearch = (criteria: z.infer<typeof searchUserSchema>) => {
    searchMutation.mutate(criteria);
  };

  const onCreateUser = (userData: z.infer<typeof createUserSchema>) => {
    createMutation.mutate(userData);
  };

  const onUpdateUser = (userData: z.infer<typeof updateUserSchema>) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, ...userData });
    }
  };

  const onSuspendUser = (suspendData: z.infer<typeof suspendUserSchema>) => {
    if (selectedUser) {
      suspendMutation.mutate({ id: selectedUser.id, ...suspendData });
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role as "admin" | "officer",
      status: user.status as "active" | "suspended"
    });
    setEditDialogOpen(true);
  };

  const handleSuspend = (user: User) => {
    setSelectedUser(user);
    suspendForm.reset();
    setSuspendDialogOpen(true);
  };

  const handleReactivate = (user: User) => {
    reactivateMutation.mutate(user.id);
  };

  const handleDelete = (user: User) => {
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.username}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const clearSearch = () => {
    searchForm.reset();
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
  };

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

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta sección</p>
        </div>
      </div>
    );
  }

  const users = usersQuery.data || [];

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administrar usuarios del sistema</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateUser)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario *</FormLabel>
                        <FormControl>
                          <Input placeholder="nombre_usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Contraseña" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido *</FormLabel>
                          <FormControl>
                            <Input placeholder="Apellido" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="officer">Oficial</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creando..." : "Crear Usuario"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Buscar Usuarios</DialogTitle>
              </DialogHeader>
              <Form {...searchForm}>
                <form onSubmit={searchForm.handleSubmit(onSearch)} className="space-y-4">
                  <FormField
                    control={searchForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <Input placeholder="Buscar por usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={searchForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos los roles" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Todos los roles</SelectItem>
                            <SelectItem value="officer">Oficial</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={searchForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos los estados" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Todos los estados</SelectItem>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="suspended">Suspendido</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" disabled={searchMutation.isPending}>
                      {searchMutation.isPending ? "Buscando..." : "Buscar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={clearSearch}>
                      Limpiar
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuarios del Sistema ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando usuarios...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No se encontraron usuarios</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userRow: User) => (
                      <TableRow key={userRow.id}>
                        <TableCell className="font-medium">{userRow.username}</TableCell>
                        <TableCell>
                          {userRow.firstName && userRow.lastName 
                            ? `${userRow.firstName} ${userRow.lastName}` 
                            : "N/A"}
                        </TableCell>
                        <TableCell>{userRow.email || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={userRow.role === 'admin' ? 'default' : 'secondary'}>
                            {userRow.role === 'admin' ? 'Administrador' : 'Oficial'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={userRow.status === 'active' ? 'default' : 'destructive'}>
                              {userRow.status === 'active' ? 'Activo' : 'Suspendido'}
                            </Badge>
                            {userRow.status === 'suspended' && userRow.suspendedUntil && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                Hasta: {new Date(userRow.suspendedUntil).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(userRow.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(userRow)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            
                            {userRow.status === 'active' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSuspend(userRow)}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReactivate(userRow)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {userRow.id !== user?.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(userRow)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onUpdateUser)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input placeholder="nombre_usuario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input placeholder="Apellido" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="officer">Oficial</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Actualizando..." : "Actualizar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Suspend User Dialog */}
        <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Suspender Usuario</DialogTitle>
            </DialogHeader>
            <Form {...suspendForm}>
              <form onSubmit={suspendForm.handleSubmit(onSuspendUser)} className="space-y-4">
                <FormField
                  control={suspendForm.control}
                  name="suspendedUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suspender Hasta *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={suspendForm.control}
                  name="suspendedReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo de Suspensión *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe el motivo de la suspensión..." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={suspendMutation.isPending}>
                    {suspendMutation.isPending ? "Suspendiendo..." : "Suspender"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}