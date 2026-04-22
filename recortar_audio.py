from pydub import AudioSegment

# 1. Pones el nombre de tu archivo con su extensión real (.m4a, .wav, .ogg)
nombre_original = "mi_audio_largo.m4a" 

print(f"Cargando {nombre_original}...")

# CAMBIO CLAVE: Usamos from_file en lugar de from_mp3
audio = AudioSegment.from_file(nombre_original) 

un_minuto = 60 * 1000
audio_recortado = audio[:un_minuto]
audio_recortado = audio_recortado.fade_out(3000)

# 2. El archivo de salida (export)
nombre_final = "mensaje_capsula.mp3"
audio_recortado.export(nombre_final, format="mp3", bitrate="128k")

print(f"¡Éxito! Tu audio se guardó como: {nombre_final}")