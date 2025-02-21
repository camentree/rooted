import sqlite3
from contextlib import contextmanager


@contextmanager
def client(path):
    connection = sqlite3.connect(path)
    connection.row_factory = dict_factory
    cursor = connection.cursor()
    try:
        yield cursor
        connection.commit()
    except Exception as error:
        connection.rollback()
        print(f"SQLite Error: {error}")
        raise
    finally:
        connection.close()


def dict_factory(cursor, row):
    fields = [column[0] for column in cursor.description]
    return dict(zip(fields, row))
