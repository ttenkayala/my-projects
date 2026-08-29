import os
from urllib.parse import quote_plus

user = 'ttenkayala@turo.com'
password = os.environ['RS_PASS']
host = 'redshift.int.turo.com'
port = 5439
database = 'dev'

uri = f"redshift+redshift_connector://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{database}"
print(uri)
