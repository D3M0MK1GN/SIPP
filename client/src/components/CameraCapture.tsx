import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, RotateCcw, AlertCircle } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onFileUpload: (file: File) => void;
  preview?: string;
  className?: string;
  captureText?: string;
  uploadText?: string;
}

export function CameraCapture({
  onCapture,
  onFileUpload,
  preview,
  className = "",
  captureText = "Capturar",
  uploadText = "Subir"
}: CameraCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check camera support on mount
  useEffect(() => {
    if (!navigator.mediaDevices) {
      setError("Su navegador no soporta acceso a la cámara");
      setHasPermission(false);
    }
  }, []);

  const startCapture = useCallback(async () => {
    setError("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      setIsCapturing(true);
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Force play the video immediately
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.error("Error playing video:", playError);
          setError("Error al reproducir el video de la cámara");
        }
        
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
        };
        videoRef.current.onerror = (e) => {
          console.error("Video error:", e);
          setError("Error al cargar el video de la cámara");
        };
      }
    } catch (error: any) {
      console.error("Error accessing camera:", error);
      const errorMessage = error.name === 'NotAllowedError' 
        ? "Permiso de cámara denegado. Por favor, permita el acceso a la cámara en su navegador."
        : error.name === 'NotFoundError'
        ? "No se encontró ninguna cámara disponible en su dispositivo."
        : error.name === 'NotReadableError'
        ? "La cámara está siendo usada por otra aplicación."
        : "No se pudo acceder a la cámara. Verifique los permisos del navegador.";
      
      setError(errorMessage);
      setHasPermission(false);
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Wait for video to be ready
      if (video.readyState < 2) {
        alert("La cámara aún está cargando. Espere un momento e inténtelo nuevamente.");
        return;
      }
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        onCapture(imageData);
        stopCapture();
      }
    }
  }, [onCapture, stopCapture]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  if (isCapturing) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            controls={false}
            className="w-full h-64 bg-black rounded-lg object-cover"
            style={{ transform: 'scaleX(-1)' }}
            onCanPlay={() => console.log("Video can play")}
            onPlaying={() => console.log("Video is playing")}
            onLoadStart={() => console.log("Video load started")}
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700">
            <Camera className="w-4 h-4 mr-2" />
            Capturar
          </Button>
          <Button onClick={stopCapture} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="w-full h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <div className="text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Sin fotografía</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={startCapture} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={hasPermission === false}
        >
          <Camera className="w-4 h-4 mr-2" />
          {captureText}
        </Button>
        <Button onClick={() => fileInputRef.current?.click()} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          {uploadText}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
