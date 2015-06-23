import MySQLdb
import MySQLdb.cursors

def connectDB(dictionary = False):
    if dictionary:
        db = MySQLdb.connect(host="localhost", port=3306, user="root", passwd="", db="chat", cursorclass=MySQLdb.cursors.DictCursor)
        cursor = db.cursor()
        return db, cursor
    else:
        db = MySQLdb.connect(host="localhost", port=3306, user="root", passwd="", db="chat")
        cursor = db.cursor()
        return db, cursor