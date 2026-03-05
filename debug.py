# debug.py
from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import get_db  # Importiert unsere Datenbankverbindung

# Initialisiere den Router. 
# prefix="/debug" sorgt dafür, dass alle Endpunkte hier automatisch mit /debug anfangen.
router = APIRouter(
    prefix="/debug",
    tags=["Debug"]
)

@router.get("/tables")
def list_database_tables(db: sqlite3.Connection = Depends(get_db)):
    """
    Liest alle Tabellennamen aus der SQLite-Datenbank aus.
    """
    cursor = db.cursor()
    # Fragt die interne Struktur der SQLite-Datenbank ab
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row["name"] for row in cursor.fetchall()]
    
    if not tables:
        raise HTTPException(status_code=404, detail="Keine Tabellen gefunden. Falsche Datenbank?")
        
    return {"tables": tables}

@router.get("/tables/{table_name}")
def get_table_columns(table_name: str, db: sqlite3.Connection = Depends(get_db)):
    """
    Liest alle Spalten (Columns) einer spezifischen Tabelle aus.
    Gibt den Namen und den Datentyp der Spalte zurück.
    """
    cursor = db.cursor()
    # PRAGMA table_info ist ein spezieller SQLite-Befehl, der die Struktur einer Tabelle zeigt
    cursor.execute(f"PRAGMA table_info({table_name});")
    rows = cursor.fetchall()
    
    if not rows:
         raise HTTPException(status_code=404, detail=f"Tabelle '{table_name}' existiert nicht.")
    
    # Wir erstellen eine schöne Übersicht aus Spaltenname und Datentyp
    columns = [{"name": row["name"], "type": row["type"]} for row in rows]
    
    return {
        "table": table_name, 
        "columns": columns
    }