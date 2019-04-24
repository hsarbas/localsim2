import os
from localsim import simrequesthandler as API

traffic_demand = range(450,901,50)
stoplight_cycle = range(50,301,50)
api = API.API()

for demand in traffic_demand:
    for cycle in stoplight_cycle:
        os.system("python test-api.py {} {} {}".format(demand, cycle, "_wjbowacwm"))
        print("\n~~~\nDone with {} {}!\n~~~\n".format(demand, cycle))