import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CameraCapture } from "@/components/CameraCapture";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { insertDetaineeSchema } from "@shared/schema";
import { IdCard, Camera, RotateCcw } from "lucide-react";

const venezuelanStates = [
  { value: "distrito-capital", label: "Distrito Capital" },
  { value: "amazonas", label: "Amazonas" },
  { value: "anzoategui", label: "Anzoátegui" },
  { value: "apure", label: "Apure" },
  { value: "aragua", label: "Aragua" },
  { value: "barinas", label: "Barinas" },
  { value: "bolivar", label: "Bolívar" },
  { value: "carabobo", label: "Carabobo" },
  { value: "cojedes", label: "Cojedes" },
  { value: "delta-amacuro", label: "Delta Amacuro" },
  { value: "falcon", label: "Falcón" },
  { value: "guarico", label: "Guárico" },
  { value: "lara", label: "Lara" },
  { value: "merida", label: "Mérida" },
  { value: "miranda", label: "Miranda" },
  { value: "monagas", label: "Monagas" },
  { value: "nueva-esparta", label: "Nueva Esparta" },
  { value: "portuguesa", label: "Portuguesa" },
  { value: "sucre", label: "Sucre" },
  { value: "tachira", label: "Táchira" },
  { value: "trujillo", label: "Trujillo" },
  { value: "vargas", label: "Vargas" },
  { value: "yaracuy", label: "Yaracuy" },
  { value: "zulia", label: "Zulia" },
];

export default function Register() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [detaineePhoto, setDetaineePhoto] = useState<string>("");
  const [idDocument, setIdDocument] = useState<string>("");
  const [detaineePhotoFile, setDetaineePhotoFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);

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

  const form = useForm({
    resolver: zodResolver(insertDetaineeSchema),
    defaultValues: {
      fullName: "",
      cedula: "",
      birthDate: "",
      state: "",
      municipality: "",
      parish: "",
      address: "",
      registro: "",
      phone: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      
      // Add form fields
      Object.keys(data).forEach(key => {
        if (data[key]) {
          formData.append(key, data[key]);
        }
      });

      // Add files
      if (detaineePhotoFile) {
        formData.append('photo', detaineePhotoFile);
      }
      if (idDocumentFile) {
        formData.append('idDocument', idDocumentFile);
      }

      const response = await fetch('/api/detainees', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Registro de detenido completado exitosamente",
      });
      form.reset();
      setDetaineePhoto("");
      setIdDocument("");
      setDetaineePhotoFile(null);
      setIdDocumentFile(null);
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
        description: "No se pudo completar el registro. Inténtelo nuevamente.",
        variant: "destructive",
      });
    },
  });

  const ocrMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Auto-fill form with OCR data
      if (data.fullName) form.setValue('fullName', data.fullName);
      if (data.cedula) form.setValue('cedula', data.cedula);
      if (data.birthDate) form.setValue('birthDate', data.birthDate);
      
      toast({
        title: "Documento procesado",
        description: `Datos extraídos con ${Math.round(data.confidence * 100)}% de confianza`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo procesar el documento",
        variant: "destructive",
      });
    }
  });

  const handleDetaineePhotoCapture = (imageData: string) => {
    setDetaineePhoto(imageData);
    // Convert base64 to file
    try {
      fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'detainee-photo.jpg', { type: 'image/jpeg' });
          setDetaineePhotoFile(file);
          toast({
            title: "Foto capturada",
            description: "La foto del detenido se ha capturado correctamente",
          });
        })
        .catch(error => {
          console.error("Error processing captured photo:", error);
          toast({
            title: "Error",
            description: "No se pudo procesar la foto capturada",
            variant: "destructive",
          });
        });
    } catch (error) {
      console.error("Error converting image:", error);
      toast({
        title: "Error",
        description: "Error al procesar la imagen",
        variant: "destructive",
      });
    }
  };

  const handleDetaineePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setDetaineePhoto(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setDetaineePhotoFile(file);
  };

  const handleIdDocumentCapture = (imageData: string) => {
    setIdDocument(imageData);
    // Convert base64 to file and process with OCR
    try {
      fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'id-document.jpg', { type: 'image/jpeg' });
          setIdDocumentFile(file);
          toast({
            title: "Documento capturado",
            description: "Procesando documento para extraer datos...",
          });
          ocrMutation.mutate(file);
        })
        .catch(error => {
          console.error("Error processing captured document:", error);
          toast({
            title: "Error",
            description: "No se pudo procesar el documento capturado",
            variant: "destructive",
          });
        });
    } catch (error) {
      console.error("Error converting document image:", error);
      toast({
        title: "Error",
        description: "Error al procesar la imagen del documento",
        variant: "destructive",
      });
    }
  };

  const handleIdDocumentUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setIdDocument(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setIdDocumentFile(file);
    ocrMutation.mutate(file);
  };

  const onSubmit = (data: any) => {
    registerMutation.mutate(data);
  };

  const resetForm = () => {
    form.reset();
    setDetaineePhoto("");
    setIdDocument("");
    setDetaineePhotoFile(null);
    setIdDocumentFile(null);
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

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Registrar Detenido</h2>
          <p className="text-muted-foreground">Complete el formulario con los datos del detenido</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Personal Information */}
            <div className="lg:col-span-2">
              <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-6">Información Personal</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre Completo *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ingrese nombre completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cedula"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cédula *</FormLabel>
                            <FormControl>
                              <Input placeholder="V-12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Nacimiento *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {venezuelanStates.map((state) => (
                                  <SelectItem key={state.value} value={state.value}>
                                    {state.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="municipality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Municipio *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ingrese municipio" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="parish"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parroquia *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ingrese parroquia" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dirección *</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Ingrese dirección completa" rows={3} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="registro"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registro</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Ingrese información de registro" rows={3} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Teléfono</FormLabel>
                            <FormControl>
                              <Input placeholder="0414-1234567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Photo Capture */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-6">Fotografía del Detenido</h3>
                    <CameraCapture
                      onCapture={handleDetaineePhotoCapture}
                      onFileUpload={handleDetaineePhotoUpload}
                      preview={detaineePhoto}
                    />
                  </CardContent>
                </Card>

                {/* ID Document Capture */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-6">Documento de Identidad</h3>
                    
                    <div className="space-y-4">
                      <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        {idDocument ? (
                          <img src={idDocument} alt="ID Document" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="text-center">
                            <IdCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Sin documento</p>
                          </div>
                        )}
                      </div>

                      <CameraCapture
                        onCapture={handleIdDocumentCapture}
                        onFileUpload={handleIdDocumentUpload}
                        captureText="Capturar Cédula"
                        uploadText="Subir Cédula"
                        className="space-y-3"
                      />

                      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-md">
                        <div className="flex items-start space-x-2">
                          <IdCard className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>El sistema extraerá automáticamente los datos del documento</span>
                        </div>
                      </div>

                      {ocrMutation.isPending && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-md">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            <span>Procesando documento...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={resetForm}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
              <Button 
                type="submit" 
                disabled={registerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {registerMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registrando...
                  </>
                ) : (
                  "Registrar Detenido"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
