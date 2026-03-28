from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Aplicando Programación Orientada a Objetos (POO)
class RegaloSorpresa:
    def __init__(self, destinatario, remitente, edad):
        self.destinatario = destinatario
        self.remitente = remitente
        self.edad = edad
        self.mensajes = []

    def agregar_mensaje(self, mensaje):
        self.mensajes.append(mensaje)

    def empaquetar_regalo(self):
        # Este método prepara los datos para enviarlos a JavaScript
        return {
            "titulo": f"¡Feliz Cumpleaños número {self.edad}, {self.destinatario}! 🎉",
            "mensajes": self.mensajes,
            "firma": f"Con mucho cariño, {self.remitente}"
        }

mi_regalo = RegaloSorpresa(destinatario="Luyuromo", remitente="frank", edad=22)
mi_regalo.agregar_mensaje("Eres una persona increíble y te mereces lo mejor.")
mi_regalo.agregar_mensaje("Que este nuevo año de vida esté lleno de éxitos, código sin bugs y mucha felicidad.")
mi_regalo.agregar_mensaje("¡Disfruta tu día al máximo!")


@app.route('/')
def index():
    # Sirve el archivo HTML
    return render_template('index.html')

@app.route('/api/abrir_regalo')
def abrir_regalo():
    # Retorna los datos del objeto en formato JSON para que JS los lea
    return jsonify(mi_regalo.empaquetar_regalo())

if __name__ == '__main__':
    app.run(debug=True)