import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { searchDetaineeSchema, type Detainee } from "@shared/schema";
import { Search as SearchIcon, Eye, Edit, User, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { z } from "zod";

// Advanced search schema
const advancedSearchSchema = z.object({
  fullName: z.string().optional(),
  cedula: z.string().optional(),
  state: z.string().optional(),
  municipality: z.string().optional(),
  parish: z.string().optional(),
});

export default function Search() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchResults, setSearchResults] = useState<Detainee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchType, setSearchType] = useState<"simple" | "advanced">("simple");
  const resultsPerPage = 10;

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

  const simpleForm = useForm({
    resolver: zodResolver(searchDetaineeSchema),
    defaultValues: {
      cedula: "",
    },
  });

  const advancedForm = useForm({
    resolver: zodResolver(advancedSearchSchema),
    defaultValues: {
      fullName: "",
      cedula: "",
      state: "",
      municipality: "",
      parish: "",
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = searchType === "simple" ? "/api/search" : "/api/search/advanced";
      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setHasSearched(true);
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activities"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Ha sido desconectado. Iniciando sesión nuevamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo realizar la búsqueda. Inténtelo nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onSimpleSubmit = (data: { cedula: string }) => {
    setIsSearching(true);
    setSearchType("simple");
    searchMutation.mutate(data);
    setIsSearching(false);
  };

  const onAdvancedSubmit = (data: any) => {
    setIsSearching(true);
    setSearchType("advanced");
    // Filter out empty fields
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value && value.toString().trim() !== "")
    );
    searchMutation.mutate(filteredData);
    setIsSearching(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const getStateName = (stateCode: string) => {
    const stateMap: { [key: string]: string } = {
      'distrito-capital': 'Distrito Capital',
      'amazonas': 'Amazonas',
      'anzoategui': 'Anzoátegui',
      'apure': 'Apure',
      'aragua': 'Aragua',
      'barinas': 'Barinas',
      'bolivar': 'Bolívar',
      'carabobo': 'Carabobo',
      'cojedes': 'Cojedes',
      'delta-amacuro': 'Delta Amacuro',
      'falcon': 'Falcón',
      'guarico': 'Guárico',
      'lara': 'Lara',
      'merida': 'Mérida',
      'miranda': 'Miranda',
      'monagas': 'Monagas',
      'nueva-esparta': 'Nueva Esparta',
      'portuguesa': 'Portuguesa',
      'sucre': 'Sucre',
      'tachira': 'Táchira',
      'trujillo': 'Trujillo',
      'vargas': 'Vargas',
      'yaracuy': 'Yaracuy',
      'zulia': 'Zulia',
    };
    return stateMap[stateCode] || stateCode;
  };

  // Pagination logic
  const totalPages = Math.ceil(searchResults.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const currentResults = searchResults.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Buscar Registros</h2>
          <p className="text-muted-foreground">Busque registros por número de cédula</p>
        </div>

      {/* Search Forms */}
      <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SearchIcon className="h-5 w-5" />
              Búsqueda de Registros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="simple" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="simple">Búsqueda Simple</TabsTrigger>
                <TabsTrigger value="advanced">
                  <Filter className="h-4 w-4 mr-2" />
                  Búsqueda Avanzada
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="simple" className="mt-6">
                <Form {...simpleForm}>
                  <form onSubmit={simpleForm.handleSubmit(onSimpleSubmit)} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <FormField
                        control={simpleForm.control}
                        name="cedula"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Cédula</FormLabel>
                            <FormControl>
                              <Input placeholder="V-12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="submit" 
                        disabled={searchMutation.isPending}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                      >
                        {searchMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Buscando...
                          </>
                        ) : (
                          <>
                            <SearchIcon className="h-4 w-4 mr-2" />
                            Buscar
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="advanced" className="mt-6">
                <Form {...advancedForm}>
                  <form onSubmit={advancedForm.handleSubmit(onAdvancedSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={advancedForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Ingrese nombre completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={advancedForm.control}
                        name="cedula"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Cédula</FormLabel>
                            <FormControl>
                              <Input placeholder="V-12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={advancedForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="distrito-capital">Distrito Capital</SelectItem>
                                <SelectItem value="amazonas">Amazonas</SelectItem>
                                <SelectItem value="anzoategui">Anzoátegui</SelectItem>
                                <SelectItem value="apure">Apure</SelectItem>
                                <SelectItem value="aragua">Aragua</SelectItem>
                                <SelectItem value="barinas">Barinas</SelectItem>
                                <SelectItem value="bolivar">Bolívar</SelectItem>
                                <SelectItem value="carabobo">Carabobo</SelectItem>
                                <SelectItem value="cojedes">Cojedes</SelectItem>
                                <SelectItem value="delta-amacuro">Delta Amacuro</SelectItem>
                                <SelectItem value="falcon">Falcón</SelectItem>
                                <SelectItem value="guarico">Guárico</SelectItem>
                                <SelectItem value="lara">Lara</SelectItem>
                                <SelectItem value="merida">Mérida</SelectItem>
                                <SelectItem value="miranda">Miranda</SelectItem>
                                <SelectItem value="monagas">Monagas</SelectItem>
                                <SelectItem value="nueva-esparta">Nueva Esparta</SelectItem>
                                <SelectItem value="portuguesa">Portuguesa</SelectItem>
                                <SelectItem value="sucre">Sucre</SelectItem>
                                <SelectItem value="tachira">Táchira</SelectItem>
                                <SelectItem value="trujillo">Trujillo</SelectItem>
                                <SelectItem value="vargas">Vargas</SelectItem>
                                <SelectItem value="yaracuy">Yaracuy</SelectItem>
                                <SelectItem value="zulia">Zulia</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={advancedForm.control}
                        name="municipality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Municipio</FormLabel>
                            <FormControl>
                              <Input placeholder="Ingrese municipio" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={advancedForm.control}
                        name="parish"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parroquia</FormLabel>
                            <FormControl>
                              <Input placeholder="Ingrese parroquia" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={searchMutation.isPending}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                      >
                        {searchMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Buscando...
                          </>
                        ) : (
                          <>
                            <Filter className="h-4 w-4 mr-2" />
                            Buscar Avanzado
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Resultados de Búsqueda</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasSearched
                  ? `${searchResults.length} registro${searchResults.length !== 1 ? 's' : ''} encontrado${searchResults.length !== 1 ? 's' : ''}`
                  : "Realice una búsqueda para ver los resultados"
                }
              </p>
            </div>

            {hasSearched ? (
              searchResults.length > 0 ? (
                <>
                  {/* Results Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Foto</TableHead>
                          <TableHead>Nombre Completo</TableHead>
                          <TableHead>Cédula</TableHead>
                          <TableHead>Fecha Nacimiento</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha Registro</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentResults.map((detainee) => (
                          <TableRow key={detainee.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                {detainee.photoUrl ? (
                                  <img 
                                    src={detainee.photoUrl} 
                                    alt="Detainee" 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-foreground">{detainee.fullName}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-foreground">{detainee.cedula}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-foreground">{formatDate(detainee.birthDate)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-foreground">{getStateName(detainee.state)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-muted-foreground">
                                {detainee.createdAt ? formatDate(detainee.createdAt.toString()) : "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    toast({
                                      title: "Información",
                                      description: "Funcionalidad de vista detallada en desarrollo",
                                    });
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                  onClick={() => {
                                    toast({
                                      title: "Información",
                                      description: "Funcionalidad de edición en desarrollo",
                                    });
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Mostrando{" "}
                        <span className="font-medium">{startIndex + 1}</span>{" "}
                        a{" "}
                        <span className="font-medium">{Math.min(endIndex, searchResults.length)}</span>{" "}
                        de{" "}
                        <span className="font-medium">{searchResults.length}</span>{" "}
                        resultados
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Anterior
                        </Button>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          const isCurrentPage = page === currentPage;
                          return (
                            <Button
                              key={page}
                              variant={isCurrentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className={isCurrentPage ? "bg-blue-600 hover:bg-blue-700" : ""}
                            >
                              {page}
                            </Button>
                          );
                        })}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                        >
                          Siguiente
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron resultados</h3>
                  <p className="text-gray-600">
                    No hay registros que coincidan con la cédula proporcionada.
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Realizar búsqueda</h3>
                <p className="text-gray-600">
                  Ingrese un número de cédula para buscar registros.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
