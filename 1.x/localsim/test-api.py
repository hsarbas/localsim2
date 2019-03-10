from os import path
from localsim import simrequesthandler as API

api = API.API()

api.set_runner('test-api')
api.load(path.join(path.dirname(__file__), '..', '..', 'maps', 'tri-leg-loaded.lmf'))
api.run(36000, 'static', '_wjbowacwm', False)