from abc import ABCMeta, abstractmethod
from localsim.utils import signal
import weakref
import itertools

_id_counter = itertools.count()


class AbstractStaticControl(signal.Signal):
    __metaclass__ = ABCMeta

    events = ['move', 'destroy']

    def __init__(self, road, pos, lane, zone):
        self.id = 'scontrol-' + hex(_id_counter.next())
        self._road = weakref.ref(road)
        self._lane = lane  # lane it was created
        self._zone = zone  # area of effect of control
        self._pos = pos  # distance from source node


        self.exit = self.pos + self.zone
        self.road.connect('change', self._signal_callback)
        self.road.connect('move', self._signal_callback)

    @abstractmethod
    def deconstruct(self):
        pass

    @property
    def road(self):
        return self._road()

    def _signal_callback(self, event, source, **kwargs):
        if event in ['move', 'change']:
            self.fire('move')

    @abstractmethod
    def trigger(self, curr_pos, curr_lane, ssd):
        pass

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
    def lane(self):
        return self._lane

    @lane.setter
    def lane(self, new_lane):
        if new_lane != self._lane:
            self._lane = new_lane
            self.fire('move', value='lane')

    def __del__(self):
        self.fire('destroy')


class AbstractDynamicControl(signal.Signal):
    events = ['move', 'update', 'destroy']

    def __init__(self, road, pos, lane, state, start, controlled=False):
        self.id = 'dcontrol-' + hex(_id_counter.next())
        self._road = weakref.ref(road)
        self._pos = pos
        self._lane = lane
        self._init_state = [state, start]

        self._state = [self.init_state[0], 0]

        self._clock = None
        self._init_pass = True

        self.road.connect('change', self._signal_callback)
        self.road.connect('move', self._signal_callback)

        # For dynamic stoplights
        self.controlled = controlled
        self.state_index = -1 #This is the index for iterating through state_list; starts at -1 because it increments /before/ the update

    # Everytime the clock signals 'coarse', updates the state of the traffic signal
    def _signal_callback(self, event, source, **extras):
        if event in ['change', 'move']:  # road signal
            self.fire('move')
        elif event == 'coarse':  # clock signal
        # Ensures updates only happen at or after the start time
            if (self.clock.now / 1000) >= self.init_state[1]:
                if self._init_pass:
                    self.state = [1, 0]
                    self._init_pass = False
                self._state[1] += 1 # Increments the time of the current state
                if self.controlled:
                    self.state_index += 1 # Increments the current state (for controlled)
                    self.update_controlled()
                else:
                    self.update()
                    # self.update_phase()
        elif event == 'stop':  # clock signal
            self.reset()

    # Sets the control's clock; Connects callbacks to clock events 'coarse' and 'stop'
    def run(self, clock):
        self.reset()
        self.clock = clock
        self.clock.connect('coarse', self._signal_callback)
        self.clock.connect('stop', self._signal_callback)

    @property
    def clock(self):
        if self._clock is None:
            return None
        else:
            return self._clock()

    @clock.setter
    def clock(self, new_clock):
        self._clock = weakref.ref(new_clock)
        self.reset()

    @property
    def state(self):
        return list(self._state)

    @state.setter
    def state(self, new_state):
        if new_state != self._state:
            self._state = list(new_state)
            self.fire('update')

    @property
    def init_state(self):
        return list(self._init_state)

    @init_state.setter
    def init_state(self, new_init_state):
        if new_init_state != self._init_state:
            self._init_state = list(new_init_state)

            self._state = self._init_state  # bypass change state event firing
            self.fire('update')

    def reset(self):
        if self.clock is not None:
            self.clock.disconnect('coarse', self._signal_callback)
            self.clock.disconnect('stop', self._signal_callback)
        self.state = [self.init_state[0], 0]
        self._init_pass = True

    @abstractmethod
    def deconstruct(self):
        pass

    @property
    def road(self):
        return self._road()

    @abstractmethod
    def update(self):
        pass

    @abstractmethod
    def update_controlled(self):
        pass

    @abstractmethod
    def trigger(self, curr_pos, curr_lane, ssd):
        pass

    @abstractmethod
    def update_phase(self):
        pass

    @property
    def pos(self):
        return self._pos

    @pos.setter
    def pos(self, new_pos):
        if new_pos != self._pos:
            self._pos = new_pos
            self.fire('move', value='pos')

    @property
    def lane(self):
        return self._lane

    @lane.setter
    def lane(self, new_lane):
        if new_lane != self._lane:
            self._lane = new_lane
            self.fire('move', value='lane')

    def __del__(self):
        self.fire('destroy')
