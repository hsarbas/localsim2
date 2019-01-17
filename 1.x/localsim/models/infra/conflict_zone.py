from abc import ABCMeta, abstractmethod
from localsim.utils import signal
import weakref
import itertools
import localsim

_id_counter = itertools.count()

config = localsim.conf()


class ConflictZone(signal.Signal):
    __metaclass__ = ABCMeta
    events = ['move', 'destroy', 'change']

    def __init__(self, road=None, pos=None, lane=None, length=0.0, width=0, conflict_group=[], type_=None):
        self.id = road.label + '-' + str(lane) + '-' + '{0:.2f}'.format(round(pos, 2))
        self._road = weakref.ref(road)
        self._pos = pos
        self._lane = int(lane)
        self._length = float(length)
        self._width = int(width)
        self.zone = self.lane + self.width  # patterned after 'zone' attribute of survey_zone
        self.exit = self.pos + self.length
        self.lanes_affected = list()
        self.conflict_group = conflict_group
        self.type_ = type_
        self._locked = False

        self.road.connect('move', self._signal_callback)
        self.road.connect('change', self._signal_callback)
        self.road.connect('destroy', self._signal_callback)
        for i in range(self._lane, self._lane + self._width + 1):
            self.lanes_affected.append(i)

    def _signal_callback(self, event, source, **kwargs):
        if event == 'move':
            self.fire('move')
        elif event == 'destroy':
            self.fire('destroy')
        elif event == 'change' and 'value' in kwargs:
            if kwargs['value'] == 'priority':
                self.fire('change')

    @property
    def road(self):
        return self._road()

    @property
    def pos(self):
        return self._pos

    @pos.setter
    def pos(self, new_entry):
        if new_entry != self._pos:
            self._pos = new_entry
            self.exit = self._pos + self._length
            self.fire('move', value='entry')

    @property
    def length(self):
        return self._length

    @length.setter
    def length(self, new_length):
        if new_length != self._length:
            self._length = new_length
            self.exit = self._pos + self._length
            self.fire('move', value='length')

    @property
    def lane(self):
        return self._lane

    @lane.setter
    def lane(self, new_lane):
        if new_lane != self._lane:
            self._lane = new_lane
            self.lanes_affected = list()
            for i in range(self._lane, self._lane + self._width + 1):
                self.lanes_affected.append(i)
            self.fire('move', value='lane')

    @property
    def width(self):
        return self._width

    @width.setter
    def width(self, new_width):
        if new_width != self._length:
            self._lane = new_width
            self.lanes_affected = list()
            for i in range(self._lane, self._lane + self._width + 1):
                self.lanes_affected.append(i)
            self.fire('move', value='width')

    def __del__(self):
        self.fire('destroy')

    @property
    def locked(self):
        return self._locked

    @locked.setter
    def locked(self, lock):
        self._locked = lock

    def trigger(self, curr_entry, curr_lane, ssd=0.0, agent_length=0.0):
        if curr_lane in self.lanes_affected and curr_entry < self.pos <= curr_entry + ssd:
            return dict(type=self.__class__.__name__, entrydist=self.pos - curr_entry,
                        exitdist=self.exit - curr_entry - agent_length, id=self.id,
                        road=self.road, conftype=self.type_, confgroup=self.conflict_group, locked=self.locked)
        elif curr_lane in self.lanes_affected and self.pos <= curr_entry and curr_entry - agent_length <= self.exit:
            return dict(type=self.__class__.__name__, entrydist=0.0,
                        exitdist=self.exit - curr_entry - agent_length, id=self.id,
                        road=self.road, conftype=self.type_, confgroup=self.conflict_group, locked=self.locked)
        return None

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])

        args = [self.road, self.pos, self.lane, self.length, self.width]
        kwargs = {'conflict_group': self.conflict_group}
        return [fullpath, args, kwargs]

    def distance_from(self, pos, road, raw=False):
        if self.road == road:
            if raw:
                return dict(entry=self.pos - pos, exit=self.exit - pos)
            else:
                return dict(entry=config.to_m(self.pos) - pos, exit=config.to_m(self.exit) - pos)
        else:
            if raw:
                return dict(entry=self.entry + road.length - pos, exit=self.exit + road.length - pos)
            else:
                return dict(entry=config.to_m(self.pos) + road.length - pos, exit=config.to_m(self.exit) + road.length - pos)
