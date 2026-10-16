import duckdb
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.config import DATABASE_URL, DUCKDB_PATH

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import backend.app.models.schema_models # ensure models are registered
    Base.metadata.create_all(bind=engine)

init_db()

def get_duckdb_conn():
    """Returns a DuckDB connection to the local analytical warehouse."""
    conn = duckdb.connect(database=str(DUCKDB_PATH), read_only=False)
    return conn
