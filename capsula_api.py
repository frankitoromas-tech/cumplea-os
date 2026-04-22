from flask import Blueprint, jsonify
from datetime import datetime

# Creamos un "módulo" separado para la cápsula
capsula_bp = Blueprint('capsula', __name__)

@capsula_bp.route('/api/capsula')
def verificar_capsula():
    # Define la fecha exacta en la que se abrirá (Año, Mes, Día, Hora, Minuto)
    fecha_apertura = datetime(2026, 4, 15, 0, 0) # Cámbiala a tu gusto
    ahora = datetime.now()
    
    if ahora >= fecha_apertura:
        # Si ya pasó la fecha, enviamos el secreto
        return jsonify({
            "estado": "abierta",
            "titulo": "✨ La cápsula se ha abierto",
            "mensaje": "Quería dejarte este mensaje para recordarte que, incluso semanas después de tu cumpleaños, mi amor por ti sigue creciendo...",
            "imagen_url": "/static/DEFAULT_RECUERDOS/foto_secreta.png" # Opcional
        })
    else:
        # Si no, Python bloquea el mensaje
        diferencia = fecha_apertura - ahora
        dias = diferencia.days
        return jsonify({
            "estado": "cerrada",
            "mensaje": f"Esta cápsula estelar se abrirá en {dias} días. Vuelve pronto."
        })