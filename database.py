# database.py
import sqlite3
import os

def get_db():
    """
    Erstellt eine Verbindung zur SQLite-Datenbank im 'data' Ordner.
    Diese Funktion kann nun von überall im Projekt importiert werden.
    """
    # 1. Finde heraus, wo sich diese Datei gerade befindet
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 2. Setze den Pfad zusammen: aktueller Ordner -> data -> eve.db
    db_path = os.path.join(base_dir, "data", "eve.db")
    
    # 3. Verbinde mit der Datenbank
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row 
    try:
        yield conn
    finally:
        conn.close()