from numpy import random as nprand
import const


def arrival_time(time, flow_rate):
    if flow_rate > 0:
        flow_rate = 1. / flow_rate
    else:
        flow_rate = 1.0 / const.ALMOST_ZERO

    while True:
        time += nprand.exponential(flow_rate) * 1000
        yield int(time)


def politeness(pfactor_seed=const.P):
    while True:
        rand = nprand.uniform()
        politeness_factor = (pfactor_seed + rand) * 0.5
        yield politeness_factor
