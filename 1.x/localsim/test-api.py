from os import path
from localsim import simrequesthandler as API

api = API.API()

api.set_runner('overloaded')
api.load(path.join(path.dirname(__file__), '..', '..', 'cases', 'tri-leg-overloaded-proper.lmf'))

# run(centiseconds, routing_mode (static), random string, animated?)
api.run(36000, 'static', '_wjbowacwm', False)