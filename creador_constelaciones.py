from flask import Blueprint, request, jsonify
import json
import os

creador_bp = Blueprint('creador', __name__)
ARCHIVO_CONSTELACIONES = 'data/constelaciones_creadas.json'

@creador_bp.route('/api/guardar_constelacion', methods=['POST'])
def guardar():
    datos = request.json
    nombre = datos.get('nombre', 'Constelación sin nombre')
    puntos = datos.get('puntos', [])
    
    # Asegurarnos de que el archivo exista
    if not os.path.exists(ARCHIVO_CONSTELACIONES):
        with open(ARCHIVO_CONSTELACIONES, 'w') as f:
            json.dump([], f)
            
    # Leer, agregar y guardar
    with open(ARCHIVO_CONSTELACIONES, 'r') as f:
        historico = json.load(f)
        
    historico.append({
        "nombre": nombre,
        "estrellas": puntos
    })
    
    with open(ARCHIVO_CONSTELACIONES, 'w') as f:
        json.dump(historico, f, indent=4)
        
    return jsonify({"status": "ok", "mensaje": f"La constelación '{nombre}' ha sido registrada en el universo."})