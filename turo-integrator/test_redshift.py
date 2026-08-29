import redshift_connector
import os

conn = redshift_connector.connect(
    user='ttenkayala@turo.com',
    password=os.environ['RS_PASS'],
    host='redshift.int.turo.com',
    port=5439,
    database='dev'
)
print('Connected successfully!')
conn.close()
