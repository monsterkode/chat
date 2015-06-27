from twisted.internet.defer import inlineCallbacks

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

import MySQLdb, json
from db import connectDB

class AppSession(ApplicationSession):

    @inlineCallbacks
    def onJoin(self, details):


        # prosedur untuk membuat room
        def create_room(idroom, name, idowner, username):
            # simpan ke database
            db, cursor = connectDB()
            cursor.execute("""INSERT INTO room (id, name, idowner, username) VALUES (%s, %s, %s, %s)""", (idroom, name, idowner, username))
            db.commit()
            self.publish('chat.on_room_created', 'success')
            return "success"

        # prosedur untuk menghapus room
        def delete_room(idroom):
            # hapus room
            db, cursor = connectDB()
            cursor.execute("""DELETE FROM room WHERE id={0}""".format(idroom))
            db.commit()
            self.publish('chat.on_room_deleted', 'success')
            return "success"

        # prosedur untuk mengambil list room
        def list_room():
            db, cursor = connectDB(True)
            cursor.execute("""SELECT * FROM room""")
            rows = cursor.fetchall()
            return json.dumps(rows, ensure_ascii=False)

        # REGISTER a procedure for remote calling
        reg_create_room = yield self.register(create_room, 'chat.room.create')
        print("procedure create_room registered")

        reg_list_room = yield self.register(list_room, 'chat.room.list')
        print("procedure list_room registered")
        
        reg_delete_room = yield self.register(delete_room, 'chat.room.delete')
        print("procedure delete_room registered")

        
