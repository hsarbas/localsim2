from ..agent.const import P, ALMOST_STOP
from ..agent import movement_models
from math import sqrt


def can_proceed(perceiver=None, neighbor=None, n_phantom=0):

    same_priority = False
    if perceiver['priority'] == neighbor['priority']:
        # Offending vehicles have same priority
        same_priority = True

    elif perceiver['priority']:
        # Subject vehicle is on major road and not of same heirarchy
        return True
    else:
        # None of the above restraints pass
        pass

    p_time = passing_duration(perceiver['acc'], perceiver['entrydist'], perceiver['exitdist'],
                                       perceiver['vel'], perceiver['length'])

    n_time = passing_duration(neighbor['acc'], neighbor['entrydist'], neighbor['exitdist'],
                              neighbor['vel'], neighbor['length'])

    pi, po, ni, no = None, None, None, None

    if p_time:
        pi = p_time['time_in'] - perceiver['t_gap']
        po = p_time['time_out'] + perceiver['t_gap']

    if n_time:
        ni = n_time['time_in']
        no = n_time['time_out']

    if not same_priority:
        # For major/minor conflict
        # check if minor vehicle will reach conflict
        # if pi + perceiver['t_gap'] >= 0:
        if pi + perceiver['t_gap'] >= 0:
            # if minor will not reach conflict
            # check if major will reach conflict
            if ni is None:
                # major will not reach conflict, thus safe to proceed
                return True
            else:
                # major will reach conflict, thus minor must yield
                return False
        else:
            # minor will reach conflict, thus minor must yield
            return False

    else:
        # For same priority conflict
        # check if subject will reach conflict
        if pi is None:
            # subject will not reach conflict, thus subject will yield
            return False
        else:
            # check if neighbor arrives and subject will arrive first
            # subject will proceed based on this truth table:
            # neighbor arrives ------  subject arrives first ------ subject can proceed
            #        True                      True                        True
            #        True                      False                       False
            #        False                     True                        True
            #        False                     False                       True*
            if ni is None or pi < ni:
                return True
            else:
                return False

        # if pi is not None:
        #     if ni is None or pi < ni:
        #         return True
        #     else:
        #         return False
        # elif ni is not None and ni <= perceiver['t_gap']:
        #     return False
        # else:
        #     return True


def passing_duration(acc, entrydist, exitdist, vel, length):
    if acc == 0 and vel > ALMOST_STOP:
        # Subject vehicle can cross the area given current acceleration
        return dict(time_in=entrydist/vel, time_out=(exitdist+length)/vel)
    elif acc != 0 and (2*acc*entrydist + vel**2) > 0 and (sqrt(2*acc*entrydist + vel**2) - vel)/acc > 0:
        # Subject is accelerating / decelerating and will be inside the area in the next? time step
        try:
            return dict(time_in=(sqrt(2*acc*entrydist + vel**2) - vel)/acc,
                        time_out=(sqrt(2*acc*(exitdist+length) + vel**2) - vel)/acc)
        except ValueError:
            pass

    else:
        # Subject will never reach the area
        return None
