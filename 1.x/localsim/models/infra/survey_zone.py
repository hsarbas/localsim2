from abc import ABCMeta, abstractmethod
from localsim.utils import signal
import localsim
import weakref
import copy
import itertools

_id_counter = itertools.count()

config = localsim.conf()


class AbstractSurveyor(signal.Signal):
    __metaclass__ = ABCMeta
    events = ['move', 'update', 'destroy']

    def __init__(self, road, pos, lane, zone, is_on):
        self.id = hex(_id_counter.next()) + " - " + road.label
        self._road = weakref.ref(road)
        self._pos = pos
        self._zone = zone
        self._lane = lane
        self.exit = self.pos + self.zone
        self.active = True

        self._clock = None
        self._agent_manager = None

        self.road.connect('change', self._signal_callback)
        self.road.connect('move', self._signal_callback)

    def _signal_callback(self, event, source, **extras):
        if event in ['change', 'move']:  # road signal
            self.fire('move')

        elif event == 'fine' and self.active:  # clock signal
            self.update()

        elif event == 'stop' and self.active:  # clock signal
            self.reset()

    def run(self, agent_manager):
        self.clock = agent_manager.actual_clock
        self.agent_manager = agent_manager
        self.clock.connect('fine', self._signal_callback)
        self.clock.connect('stop', self._signal_callback)

    def clear(self):
        if self.clock is not None:
            self.clock.disconnect('coarse', self._signal_callback)
            self.clock.disconnect('stop', self._signal_callback)

    @property
    def clock(self):
        if self._clock is None:
            return None
        else:
            return self._clock()

    @clock.setter
    def clock(self, new_clock):
        self._clock = weakref.ref(new_clock)
        self.clear()

    @property
    def agent_manager(self):
        if self._agent_manager is None:
            return None
        else:
            return self._agent_manager()

    @agent_manager.setter
    def agent_manager(self, new_manager):
        self._agent_manager = weakref.ref(new_manager)
        self.clear()

    @property
    def road(self):
        return self._road()

    @property
    def pos(self):
        return self._pos

    @pos.setter
    def pos(self, new_pos):
        if new_pos != self._pos:
            self._pos = new_pos
            self.exit = self._pos + self._zone
            self.fire('move', value='pos')

    @property
    def zone(self):
        return self._zone

    @zone.setter
    def zone(self, new_zone):
        if new_zone != self._zone:
            self._zone = new_zone
            self.exit = self._pos + self._zone
            self.fire('move', value='zone')

    @property
    def zone_m(self):
        return config.to_m(self._zone)

    @property
    def lane(self):
        return self._lane

    @lane.setter
    def lane(self, new_lane):
        if new_lane != self._lane:
            self._lane = new_lane
            self.fire('move', value='lane')

    @abstractmethod
    def reset(self):
        pass

    @abstractmethod
    def deconstruct(self):
        pass

    @abstractmethod
    def update(self):
        pass

    @abstractmethod
    def result(self):
        pass

    def __del__(self):
        self.fire('destroy')


class SurveyZone(AbstractSurveyor):
    def __init__(self, road, pos, lane, zone, type_):
        super(SurveyZone, self).__init__(road, pos, lane, zone, False)
        self._agent_list = dict()
        self._unique_id = list()
        self.type = type_
        self.real_time = 1
        self.period = 1000
        self.count = dict()

    def update(self):
        # Get agents covered in the survey zone
        member_list = self.agent_manager.members(self.road, start=self.pos, end=self.exit)

        # Correct the clock unit
        t = self.clock.now / self.period + 1

        self.count[t] = len(member_list)

        if t not in self._agent_list:
            self._agent_list[t] = []

        for agent in member_list:
            if self.type == 'Unique' and self._agent_list:
                if agent.id not in self._agent_list[t] and agent.id not in self._unique_id:
                    self._agent_list[t].append(agent.id)
                    self._unique_id.append(agent.id)
                    # print 'Agent %s detected by zone %s' % (str(agent.id), self.id)

            elif self.type == 'Bus' and self._agent_list:
                if agent.__class__.__name__ == 'Bus' and agent.id not in self._agent_list[t]:
                    if agent.id not in self._agent_list[t]:
                        self._agent_list[t].append(agent.id)

            else:
                if agent.id not in self._agent_list[t]:
                    self._agent_list[t].append(agent.id)

        if self.type == 'Unique':
            member_id = [member.id for member in member_list]
            for agent in self._unique_id:
                if agent not in member_id:
                    self._unique_id.remove(agent)

    def result(self):
        agent_list = copy.deepcopy(self._agent_list)

        return agent_list

    def reset(self):
        if self.clock is not None:
            self.clock.disconnect('fine', self._signal_callback)
            self.clock.disconnect('stop', self._signal_callback)
        self._agent_list = dict()
        self.real_time = 1

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [self.road, self.pos, self.lane, self.zone, self.type]
        kwargs = {}
        return [fullpath, args, kwargs]
