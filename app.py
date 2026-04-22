from flask import Flask, render_template
from flask_cors import CORS

# Importaciones sincronizadas con tus archivos en /controllers
from controllers.api_mensajes import mensajes_module
from controllers.api_estadisticas import estadisticas_module
from controllers.api_constelaciones import creador_bp
from controllers.api_capsula import capsula_bp
from controllers.api_regalo import regalo_module
from controllers.api_contenido import contenido_module
from controllers.api_efectos import efectos_module

app = Flask(__name__)
CORS(app)

# Registro de Blueprints usando el atributo .bp de tus clases
app.register_blueprint(mensajes_module.bp)
app.register_blueprint(estadisticas_module.bp)
app.register_blueprint(regalo_module.bp)
app.register_blueprint(contenido_module.bp)
app.register_blueprint(efectos_module.bp)

# Registro de Blueprints clásicos
app.register_blueprint(creador_bp)
app.register_blueprint(capsula_bp)

@app.route('/')
def index():
    return render_template('index.html')

# Rutas para las páginas nuevas
@app.route('/aurora')
def aurora(): return render_template('aurora.html')

@app.route('/timeline')
def timeline(): return render_template('timeline.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)