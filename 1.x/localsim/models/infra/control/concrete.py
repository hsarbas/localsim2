import base
from localsim.analysis import matrices

"""
NOTES:
- Sum of a stoplight's red, green, and yellow times corresponds to the cycle time
- Current goal is to change the timings every n cycle times (making cycle time dynamic)
- Function that achieves current goal must be able to do so for all stoplights
- *IMPORTANT* The animation for stoplights is static and will not reflect any changes
made to the timings, HOWEVER since the animation for agents is dynamic, they will respond
to the changes made to the stoplights.
"""
class StopLight(base.AbstractDynamicControl):
    RED = 0
    GREEN = 1
    YELLOW = 2
    STATES = [RED, GREEN, YELLOW]

    """
    'phase' is the list containing the duration of each color
    self.phase[0] corresponds to the red time, 1 to green time and 2 to yellow time
    """
    def __init__(self, road, pos, lane, phase, state=None, start=0):
        state = state if state else StopLight.RED
        super(StopLight, self).__init__(road, pos, lane, state, start)
        self.phase = list(phase)

        self.cycle_count = 0 #This is for counting the cycles
        self.state_list = [] #This is for storing outputs from linear solver
        self.epoch = 0 #This is for counting TSO runs; for syncing

        # For testing purposes; REMOVE ONCE FINISHED
        self.state_list = [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]

    def trigger(self, curr_pos, curr_lane, ssd=0.0):
        if self.lane == curr_lane and curr_pos <= self.pos <= curr_pos + ssd:
            if self.state[0] in [StopLight.RED, StopLight.YELLOW]:
                return dict(type=self.__class__.__name__, entrydist=self.pos - curr_pos, state=self.state[0],
                            id=self.id, lane=self.lane)
        return None

    '''
    This function is meant to replace def update().
    This function is called per second.
    This function changes the state of a traffic light depending on the input from the linear solver
    in the form of a number (0 - RED, 1 - GREEN, 2- YELLOW)) then appends that number
    to the stoplight object's list.
    '''
    def update_controlled(self):
        if self.state_index >= len(self.state_list):
            # Increments the number of cycles; resets the state index to 0 (first state)
            self.cycle_count += 1
            self.state_index = 0

        # FIRE 'recompute' HERE IF cycle_count REACHES SOME THRESHOLD
        # epoch here will be updated
        if (self.cycle_count >= 3):
            self.fire('recompute')
            self.cycle_count = 0

        self.phase = [1,1,1] #Sets phase timings to 1 second
        print("{}: at state {}".format(self.road.label, self.state_index))
        self.state =  [StopLight.STATES[self.state_list[self.state_index]], 0]

    def update(self):
        ###This is for updating the state of a traffic signal (see: base.py _signal_callback in AbstractDynamicControl)
        if self.state[1] >= self.phase[self.state[0]]:
            self.state = [StopLight.STATES[(self.state[0] + 1) % len(StopLight.STATES)], 0]

            # print("Current timings: {}".format(self.phase))
            # print("State {} at time {}".format(self.state[0], self.state[1]))
            # print("{} Cycles".format(self.cyclecount))
            # print("~~~")

    '''
    UNUSED
    Updates phasing (whether by changing the phase times, or the actual green times) depending on whether or not the setting for it is enabled
    '''
    def update_phase(self):
        '''
        Counts the number of cycles. After 2 cycles, the count is reset and new phase timings are sent.
        '''
        if self.state == [self.init_state[0], 0] and self.cyclecount < 2:
            self.cyclecount = self.cyclecount + 1
        if self.cyclecount == 2:
            self.cyclecount = 0
            self.alter_phase([60,1,1])


    '''
    Call this function to alter the phase times of a traffic signal; this is modeled after the update function
    '''
    def alter_phase(self, new_timings):
        self.phase = new_timings

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [self.road, self.pos, self.lane, list(self.phase)]
        kwargs = dict(state=self.init_state[0], start=self.init_state[1])
        return [fullpath, args, kwargs]


class Stop(base.AbstractStaticControl):
    def __init__(self, road, pos, lane):
        super(Stop, self).__init__(road, pos, lane, 0)

    def trigger(self, curr_pos, curr_lane, ssd=0.0):
        if self.lane == curr_lane and curr_pos <= self.pos <= curr_pos + ssd:
            return dict(type=self.__class__.__name__, entrydist=self.pos - curr_pos, id=self.id, lane=self.lane)
        return None

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [self.road, self.pos, self.lane]
        kwargs = {}
        return [fullpath, args, kwargs]


class Yield(base.AbstractStaticControl):
    def __init__(self, road, pos, lane):
        super(Yield, self).__init__(road, pos, lane, 0)

    def trigger(self, curr_pos, curr_lane, ssd=0.0):
        if self.lane == curr_lane and curr_pos <= self.pos <= curr_pos + ssd:
            return dict(type=self.__class__.__name__, entrydist=self.pos - curr_pos, id=self.id, lane=self.lane)
        return None

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [self.road, self.pos, self.lane]
        kwargs = {}
        return [fullpath, args, kwargs]


class SpeedLimitZone(base.AbstractStaticControl):
    def __init__(self, road, pos, lane, zone, limit):
        super(SpeedLimitZone, self).__init__(road, pos, lane, zone)
        self.limit = limit

    def trigger(self, curr_pos, curr_lane, ssd=0.0):
        if self.lane == curr_lane and curr_pos < self.pos <= curr_pos + ssd:
            return dict(type=self.__class__.__name__, limit=self.limit, entrydist=self.pos - curr_pos,
                        exitdist=self.exit - curr_pos, id=self.id, lane=self.lane)
        elif self.lane == curr_lane and self.pos <= curr_pos <= self.exit:
            return dict(type=self.__class__.__name__, limit=self.limit, entrydist=0.0, id=self.id, lane=self.lane)
        return None

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])

        args = [self.road, self.pos, self.lane, self.zone, self.limit]
        kwargs = {}
        return [fullpath, args, kwargs]


class TypeRestrictionZone(base.AbstractStaticControl):
    def __init__(self, road, pos, lane, zone, bias, *white_list):
        super(TypeRestrictionZone, self).__init__(road, pos, lane, zone)
        self.white_list = list(white_list)
        self.bias = bias

    def trigger(self, curr_pos, curr_lane, ssd=0.0):
        if self.lane == curr_lane and curr_pos < self.pos <= curr_pos + ssd:
            return dict(type=self.__class__.__name__,
                        restrict=list(self.white_list),
                        entrydist=self.pos - curr_pos,
                        lane=self.lane, id=self.id,
                        bias=self.bias)
        elif self.lane == curr_lane and self.pos <= curr_pos <= self.exit:
            return dict(type=self.__class__.__name__,
                        restrict=list(self.white_list),
                        entrydist=0.0,
                        lane=self.lane,
                        id=self.id,
                        bias=self.bias)
        return None

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])

        args = [self.road, self.pos, self.lane, self.zone, self.bias] + list(self.white_list)

        kwargs = {}
        return [fullpath, args, kwargs]


class BusTerminalZone(base.AbstractStaticControl):
    def __init__(self, road, pos, lane, zone, label, mean, std_dev):
        super(BusTerminalZone, self).__init__(road, pos, lane, zone)
        self.label = label

        self.mean = mean
        self.std_dev = std_dev

    def update_matrix(self, new_matrix):
        pass

    def trigger(self, curr_pos, curr_lane, ssd=0.0):
        if self.lane == curr_lane and curr_pos < self.pos <= curr_pos + ssd:
            return dict(type=self.__class__.__name__,
                        entrydist=self.pos - curr_pos,
                        exitdist=self.exit - curr_pos,
                        mean=self.mean,
                        std_dev=self.std_dev,
                        id=self.id,
                        label=self.label,
                        lane=self.lane)
        elif self.lane == curr_lane and self.pos <= curr_pos <= self.exit:
            return dict(type=self.__class__.__name__,
                        velocity=0,
                        entrydist=0,
                        exitdist=self.exit - curr_pos,
                        mean=self.mean,
                        std_dev=self.std_dev,
                        id=self.id,
                        label=self.label,
                        lane=self.lane)

        return None

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [self.road, self.pos, self.lane, self.zone, self.label, self.mean, self.std_dev]
        kwargs = {}
        return [fullpath, args, kwargs]
