from flask import Flask, render_template, jsonify, request
from datetime import datetime
import os
import requests # Librería para conectarse con Telegram

app = Flask(__name__)

# --- PEGA TUS DATOS DE TELEGRAM AQUÍ ---
TELEGRAM_TOKEN = "8651973448:AAHUDVOSurQb5r0X_OJzmPurvelTVrw_wbI"
TELEGRAM_CHAT_ID = "6724969320"

# Configuración del tiempo
FECHA_NACIMIENTO = datetime(2004, 8, 30)
FECHA_APERTURA = datetime(2025, 8, 30, 00, 0, 0) # Cambia el año para hacer pruebas

class RegaloSorpresa:
    def __init__(self, destinatario, remitente, edad):
        self.destinatario = destinatario
        self.remitente = remitente
        self.edad = edad
        self.mensajes = []

    def agregar_mensaje(self, mensaje):
        self.mensajes.append(mensaje)

    def empaquetar_regalo(self):
        dias_vividos = (datetime.now() - FECHA_NACIMIENTO).days
        return {
            "titulo": f"¡Feliz Cumpleaños número {self.edad}, {self.destinatario}! 🎉",
            "estadisticas": f"✨ Has completado {self.edad} órbitas al sol y has vivido exactamente {dias_vividos} días maravillosos en este universo. ✨",
            "mensajes": self.mensajes,
            "firma": f"Con mucho cariño, {self.remitente}"
        }

mi_regalo = RegaloSorpresa(destinatario="Luyuromo", remitente="frank", edad=23)
mi_regalo.agregar_mensaje("Eres una persona increíble y te mereces lo mejor.")
mi_regalo.agregar_mensaje("Que este nuevo año de vida esté lleno de éxitos, código sin bugs y mucha felicidad.")
mi_regalo.agregar_mensaje("¡Disfruta tu día al máximo!")

@app.route('/')
def index():
   return render_template('index.html')

@app.route('/api/estado')
def estado_regalo():
    ahora = datetime.now()
    if ahora >= FECHA_APERTURA:
        return jsonify({"bloqueado": False})
    else:
        faltan = FECHA_APERTURA - ahora
        return jsonify({
            "bloqueado": True,
            "segundos_faltantes": faltan.total_seconds()
        })

@app.route('/api/abrir_regalo')
def abrir_regalo():
    return jsonify(mi_regalo.empaquetar_regalo())

@app.route('/api/responder', methods=['POST'])
def responder():
    datos = request.json
    mensaje = datos.get('mensaje', '')
    
    if mensaje.strip():
        # 1. Guarda copia en archivo .txt (Respaldo)
        with open('buzon_secreto.txt', 'a', encoding='utf-8') as archivo:
            fecha_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            archivo.write(f"[{fecha_str}] Luyuromo dice: {mensaje}\n")
            
       # 2. Enviar a Telegram
        if TELEGRAM_TOKEN != "PEGA_AQUI_TU_TOKEN":
            url_api = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
            texto_telegram = f"💌 ¡NUEVO MENSAJE DE LUYUROMO!\n\nElla dice:\n«{mensaje}»"
            
            try:
                requests.post(url_api, json={'chat_id': TELEGRAM_CHAT_ID, 'text': texto_telegram})
            except Exception as e:
                print("Error enviando Telegram:", e)
            
        return jsonify({"status": "ok", "respuesta": "¡Mensaje enviado a las estrellas (y a Frank)! 🚀"})
    
    return jsonify({"status": "error"}), 400

if __name__ == '__main__':
    app.run(debug=True)