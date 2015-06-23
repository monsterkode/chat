from twisted.internet.defer import inlineCallbacks

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

import MySQLdb, json
from db import connectDB

class AppSession(ApplicationSession):

    @inlineCallbacks
    def onJoin(self, details):
        idowner = ""
        name = ""
        idroom = ""
        password = ""
        # prosedur untuk membuat room
        def create_room(idowner, name, idroom):
            # simpan ke database
            db, cursor = connectDB()
            cursor.execute("""INSERT INTO room (name, owner, idroom) VALUES (%s, %s, %s)""", (name, idowner, idroom))
            db.commit()
            return "success"

        # prosedur untuk menghapus room
        def delete_room(idroom):
            # hapus room
            db, cursor = connectDB()
            cursor.execute("""DELETE FROM room WHERE idroom={0}""".format(idroom))
            db.commit()
            return "success"

        # prosedur untuk mengambil list room
        def list_room():
            db, cursor = connectDB(True)
            cursor.execute("""SELECT * FROM room""")
            rows = cursor.fetchall()
            return json.dumps(rows, ensure_ascii=False)

        # REGISTER a procedure for remote calling
        self.register(create_room, 'room.create')
        self.register(list_room, 'room.list')
        self.register(delete_room, 'room.delete')

        
