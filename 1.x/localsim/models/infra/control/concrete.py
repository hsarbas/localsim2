import base
from localsim.analysis import matrices


class StopLight(base.AbstractDynamicControl):
    RED = 0
    GREEN = 1
    YELLOW = 2
    STATES = [RED, GREEN, YELLOW]

    def __init__(self, road, pos, lane, phase, state=None, start=0):
        state = state if state else StopLight.RED
        super(StopLight, self).__init__(road, pos, lane, state, start)
        self.phase = list(phase)

    def trigger(self, curr_pos, curr_lane, ssd=0.0):
        if self.lane == curr_lane and curr_pos <= self.pos <= curr_pos + ssd:
            if self.state[0] in [StopLight.RED, StopLight.YELLOW]:
                return dict(type=self.__class__.__name__, entrydist=self.pos - curr_pos, state=self.state[0],
                            id=self.id, lane=self.lane)
        return None

    def update(self):
        if self.state[1] == self.phase[self.state[0]]:
            self.state = [StopLight.STATES[(self.state[0] + 1) % len(StopLight.STATES)], 0]

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
