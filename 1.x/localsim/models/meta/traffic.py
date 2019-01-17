from localsim.analysis import matrices
import weakref
from localsim.utils import signal
from localsim.models.agent import dists, const
from localsim.models.infra.road import const as rconst
import localsim
from localsim.utils import tools
import collections
from random import choice


config = localsim.conf()


class Entry(signal.Signal):
    events = ['dispatch']

    def __init__(self, uroad, flow_rates, obs_matrix=None, dta_matrix=None):
        self._uroad = weakref.ref(uroad)

        _flow_rates = dict()
        _vehicle_counts = dict()

        if flow_rates:
            for k in flow_rates.keys():
                k_string = k.encode('ascii', 'ignore')
                v = int([x.strip() for x in k_string.split(',')][0])
                _vehicle_counts[v] = float(flow_rates[k][0])
                _flow_rates[v] = float(flow_rates[k][1])

        _dta_matrix = dict()

        if dta_matrix:
            for k in dta_matrix.keys():
                k_string = k.encode('ascii', 'ignore')
                _dta_matrix[k_string] = float(dta_matrix[k])
        else:
            _dta_matrix = {'None': 1.0}

        self.vehicle_counts = _vehicle_counts
        self.flow_rates = _flow_rates

        self.dta_matrix = _dta_matrix
        self.destination_generator = matrices.random_event_generator(self.dta_matrix)

        self.changed_flow_rate = False
        self._agent_manager = None
        self.arrival_iter = []
        self.next_trigger = []
        self.queue = [0] * self.uroad.lanes

        self.distributions = None
        self.default_dist = None
        self.obs_matrix = obs_matrix
        self.var_keyword = 'road'

        self._route_list = []
        self._dest_list = []

        self.update_matrix(obs_matrix)

    @property
    def route_list(self):
        return self._route_list

    @route_list.setter
    def route_list(self, new_route_list):
        self._route_list = new_route_list

    @property
    def dest_list(self):
        return self._dest_list

    @dest_list.setter
    def dest_list(self, new_dest_list):
        self._dest_list = new_dest_list

    @property
    def agent_manager(self):
        if self._agent_manager is None:
            return None
        else:
            return self._agent_manager()

    def update_matrix(self, new_matrix):
        self.distributions = dict()

        if new_matrix and self._check_data_integrity(new_matrix):
            self.obs_matrix = new_matrix
            self.distributions = matrices.random_event_generator({'bus': new_matrix['bus'], 'car': new_matrix['car'],
                                                                  'motorcycle': new_matrix['motorcycle'],
                                                                  'jeep': new_matrix['jeep'],
                                                                  'truck': new_matrix['truck'],
                                                                  'tricycle': new_matrix['tricycle']})
        else:
            self.distributions = None
            self.obs_matrix = None

        self.default_dist = matrices.random_event_generator({'bus': const.BUS_DEFAULT_DIST,
                                                             'car': const.CAR_DEFAULT_DIST,
                                                             'motorcycle': const.MOTORCYCLE_DEFAULT_DIST,
                                                             'jeep': const.JEEP_DEFAULT_DIST,
                                                             'truck': const.TRUCK_DEFAULT_DIST,
                                                             'tricycle': const.TRICYCLE_DEFAULT_DIST})

    def _check_data_integrity(self, matrix):
        return isinstance(matrix, dict)

    def get_next_agent_type(self):
        if self.distributions:
            return self.distributions.next()
        else:
            return self.default_dist.next()

    def run(self, agent_manager):
        self.arrival_iter = []
        self.next_trigger = []
        self.queue = [0] * self.uroad.lanes

        if agent_manager:
            self._agent_manager = weakref.ref(agent_manager)
            self._agent_manager().actual_clock.connect('fine', self._signal_callback)
        else:
            self._agent_manager = None

    def _signal_callback(self, event, source, **extras):
        if not self.flow_rates:
            self.run(None)
            return

        if not self.arrival_iter:

            for lane in range(self.uroad.lanes):
                self.arrival_iter.append(dists.arrival_time(extras['time'], self.flow_rates[0]))
                self.next_trigger.append(self.arrival_iter[lane].next())

        for lane in range(self.uroad.lanes):
            dispatched_from_queue = False
            if self.queue[lane] > 0:
                clearance = self.spatial_clearance(lane)
                if clearance[0] > const.MIN_GAP_V0 * 1.25:
                    self.queue[lane] -= 1

                    velocity = min(clearance[1], self.uroad.speed_limit)
                    acceleration = clearance[2]
                    route_list = self.route_list
                    destination = None or self.destination_generator.next()
                    agent_type = self.get_next_agent_type()
                    agent_class = tools.class_loader(const.AGENT_MODELS[agent_type])
                    self.fire('dispatch', road=self.uroad, lane=lane, velocity=velocity, agent_class=agent_class,
                              acceleration=acceleration, route_list=route_list, dstn=destination)
                    dispatched_from_queue = True

            if extras['time'] >= self.next_trigger[lane]:
                if self.queue[lane] > 0 or dispatched_from_queue:
                    self.queue[lane] += 1
                else:
                    clearance = self.spatial_clearance(lane)
                    if clearance[0] > const.MIN_GAP_V0 * 1.25:
                        velocity = min(clearance[1] * .75, self.uroad.speed_limit)
                        acceleration = clearance[2]
                        route_list = self.route_list
                        destination = None or self.destination_generator.next()
                        agent_type = self.get_next_agent_type()
                        agent_class = tools.class_loader(const.AGENT_MODELS[agent_type])
                        self.fire('dispatch', road=self.uroad, lane=lane, velocity=velocity, agent_class=agent_class,
                                  acceleration=acceleration, route_list=route_list, dstn=destination)
                    else:
                        self.queue[lane] += 1

                self.next_trigger[lane] = self.arrival_iter[lane].next()

        time = int(extras['time'] / 1000)

        if time in self.flow_rates.keys():
            if not self.changed_flow_rate:
                self.switch_flow_rates(extras['time'], time)
                self.changed_flow_rate = True
        else:
            self.changed_flow_rate = False

    def switch_flow_rates(self, time_long, time_int):
        self.arrival_iter = []
        self.next_trigger = []
        for lane in range(self.uroad.lanes):
            self.arrival_iter.append(dists.arrival_time(time_long, self.flow_rates[time_int]))
            self.next_trigger.append(self.arrival_iter[lane].next())

    def spatial_clearance(self, lane):
        nearest_rear = const.DISPATCH_REACH_MAX
        nearest_vel = const.LARGE_NUMBER
        nearest_acc = const.LARGE_NUMBER
        members = self.agent_manager.members(self.uroad, start=0.0,
                                             end=config.to_px(const.DISPATCH_REACH_MAX),
                                             lane=lane)
        for member in members:
            road, pos, lane = self.agent_manager.agents[member]
            pos = config.to_m(pos)
            rear = pos - member.length
            if nearest_rear > rear:
                nearest_rear = rear
                nearest_vel = member.vel
                nearest_acc = member.acc
        return nearest_rear, nearest_vel, nearest_acc

    @property
    def uroad(self):
        return self._uroad()

    def __repr__(self):
        return 'Next trigger: %s' % self.next_trigger

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [self.uroad, self.flow_rates]
        kwargs = dict()
        return [fullpath, args, kwargs]


class Route(object):
    MIN_ONSET = config.to_px(rconst.MIN_ONSET)
    MIN_EMERGENCY_STOP = config.to_px(rconst.EMERGENCY_STOP)
    MIN_OFFSET = config.to_px(rconst.MIN_OFFSET)

    def __init__(self, uroad, exits, obs_matrix=None, onset=None, emergency_stop=None, offset=None):
        self._uroad = weakref.ref(uroad)
        self._exits = []
        self.exits = list(exits)

        self.obs_matrix = obs_matrix
        self.var_keyword = 'agent'
        self._derived_onset = onset is None

        self._onset = onset or min(uroad.length, Route.MIN_ONSET)
        self.emergency_stop = emergency_stop or Route.MIN_EMERGENCY_STOP
        self.offset = offset or Route.MIN_OFFSET

        self.distributions = None  # initialized at update_matrix
        self.default_dist = None  # initialized at update_matrix
        # obs_matrix = {'car': {'a': 0, 'b': 1}, 'bus': {'a': 1, 'b': 0}, 'motorcycle': {'a': 0.5, 'b': 0.5}}
        self.update_matrix(obs_matrix)

    @property
    def onset(self):
        if self._derived_onset:
            self._onset = min(self.uroad.length, Route.MIN_ONSET)
        return self._onset

    @onset.setter
    def onset(self, new_onset):
        if 0.0 < new_onset <= self.uroad.length:
            self._derived_onset = False
            self._onset = new_onset

    @property
    def uroad(self):
        return self._uroad()

    @property
    def exits(self):
        return [road() for road in self._exits]

    @exits.setter
    def exits(self, exits):
        self._exits = [weakref.ref(road) for road in exits]

    def update_matrix(self, new_matrix):
        self.distributions = dict()

        if new_matrix and self._check_data_integrity(new_matrix):
            self.obs_matrix = new_matrix
            # for agent in self.obs_matrix.values(self.var_keyword):
            #     self.distributions[agent] = iter(self.obs_matrix.reduce(self.var_keyword, agent).
            #                                      marginalize(self.var_keyword))

            for agent in new_matrix.keys():
                self.distributions[agent] = matrices.random_event_generator(
                    dict(zip([road.label for road in self.exits],
                             [new_matrix[agent][road.label] for road in self.exits])))

        self.default_dist = matrices.random_event_generator(
            dict(zip([road.label for road in self.exits], [1.0/len(self.exits) for _ in range(len(self.exits))])))

    def _check_data_integrity(self, matrix):
        # return all(exit_road.label in matrix.values('road') for exit_road in self.exits)
        return True

    def deconstruct(self):
        fullpath = self.__class__.__module__ + '.' + self.__class__.__name__
        args = [self.uroad, self.exits, self.obs_matrix]
        kwargs = dict(onset=self.onset, emergency_stop=self.emergency_stop, offset=self.offset)
        return [fullpath, args, kwargs]

    def find_destination(self, type_):
        if type_ in self.distributions.keys():
            return self.distributions[type_].next()
        else:
            return self.default_dist.next()

    def trigger(self, road, pos, iroad):
        if road == self.uroad:
            return self._entry_trigger(pos)
        elif road == iroad:
            return dict(type='proper')
        elif iroad and road == iroad.dst_road:
            return self._exit_trigger(pos)
        return None

    def _entry_trigger(self, pos):
        src_emer_pos = self.uroad.length - self.emergency_stop
        src_onset_pos = self.uroad.length - self.onset

        if src_onset_pos <= pos < src_emer_pos:
            return dict(type='onset', estop_dist=abs(pos - src_emer_pos))
        elif src_emer_pos <= pos <= self.uroad.length:
            return dict(type='emergency_stop', estop_dist=0)
        else:
            return None

    def _exit_trigger(self, pos):
        return dict(type='offset') if pos <= self.offset else None

    def __str__(self):
        return 'Route for: ' + str(self.uroad) + '\n' + str(self.obs_matrix) + '\n'

    def __repr__(self):
        return self.__str__()
