# 1. Wir nutzen ein offizielles, leichtgewichtiges Python-Image als Basis
FROM python:3.11-slim

# 2. Wir legen ein Arbeitsverzeichnis innerhalb des Containers an
WORKDIR /app

# 3. Wir kopieren zuerst nur die requirements.txt in den Container.
# Das ist ein Docker-Trick: So muss Docker die Pakete nicht jedes Mal 
# neu herunterladen, wenn du nur deinen Python-Code änderst (Caching).
COPY requirements.txt .

# 4. Installiere die benötigten Python-Pakete
RUN pip install --no-cache-dir -r requirements.txt

# 5. Kopiere den gesamten restlichen Code (inklusive dem 'data' Ordner mit eve.db) in den Container
COPY . .

# 6. Wir teilen Docker mit, dass unsere App über Port 8000 erreichbar ist
EXPOSE 8000

# 7. Der Befehl, der ausgeführt wird, wenn der Container startet.
# Wichtig: Wir nutzen "--host 0.0.0.0", damit die App von außerhalb des Containers erreichbar ist.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]