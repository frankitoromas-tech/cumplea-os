from .base_service import ServicioBase
from models.mensaje import MensajeCapsula

class ServicioCapsula(ServicioBase):
    def __init__(self):
        # Le pasa la ruta del JSON al padre
        super().__init__('data/capsula.json') 

    def guardar_mensaje_futuro(self, contenido, fecha_apertura):
        # Creamos el objeto del modelo
        nuevo_mensaje = MensajeCapsula(contenido, fecha_apertura)
        
        # Usamos los métodos heredados del ServicioBase
        datos_actuales = self.leer_datos()
        datos_actuales.append(nuevo_mensaje.to_dict())
        self.guardar_datos(datos_actuales)