import collections
import abc
import weakref
import copy
import localsim
from localsim.utils.tools import mps_to_kph

config = localsim.conf()


class AbstractObserver(object):
    __metaclass__ = abc.ABCMeta

    def __init__(self, agent_manager, scene, **extras):
        self._actual_clock = weakref.ref(agent_manager.actual_clock)
        self._scene = weakref.ref(scene)

    @property
    def actual_clock(self):
        return self._actual_clock()

    @property
    def scene(self):
        return self._scene()

    @abc.abstractmethod
    def result(self):
        pass


class Counter(AbstractObserver):
    def __init__(self, agent_manager, scene, **extras):
        super(Counter, self).__init__(agent_manager, scene, **extras)
        self.created = 0
        self.destroyed = 0

        agent_manager.connect('new_agent', self._observe)
        agent_manager.connect('kill_agent', self._observe)

    def result(self):
        return dict(created=self.created, destroyed=self.destroyed)

    def _observe(self, event, source, **kwargs):
        if event == 'new_agent':
            self.created += 1
        elif event == 'kill_agent':
            self.destroyed += 1


class TimeSpeedObserver(AbstractObserver):
    def __init__(self, agent_manager, scene, **extras):
        super(TimeSpeedObserver, self).__init__(agent_manager, scene, **extras)

        self.distance_observer = collections.defaultdict(float)
        self.time_observer = dict()
        self.result_dict = dict()
        self.ave_time_dict = dict()
        self.ave_speed_dict = dict()

        self.route_observer = collections.defaultdict(list)
        # route_list, _ = self.scene.build_route_list()

        self.route_list = []
        # for route in route_list:
        #     self.route_list.append(tuple(route))

        agent_manager.connect('new_agent', self._observe)
        agent_manager.connect('move_agent', self._observe)
        agent_manager.connect('kill_agent', self._observe)

    def _observe(self, event, source, **extras):
        if event in ['new_agent', 'move_agent']:
            agent = extras['agent']
            road = extras['road']
            self.distance_observer[agent.id] += config.to_m(road.length)
            self.route_observer[agent.id].append(str(road.label))

            if event == 'new_agent':
                self.time_observer[agent.id] = dict()
                self.time_observer[agent.id]['entry'] = road.label
        elif event == 'kill_agent':
            agent = extras['agent']
            time = extras['time']
            road = extras['road']

            self.time_observer[agent.id]['exit'] = road.label
            self.time_observer[agent.id]['time'] = time

    def result(self):
        if not self.result_dict:
            agent_count = 0.0
            time_sum = 0.0
            speed_sum = 0.0

            for val in self.time_observer.values():
                if 'time' in val:
                    agent_count += 1
                    time_sum += val['time']

            if agent_count > 0:
                time_ave = time_sum / agent_count
                for agent in self.time_observer:
                    if 'time' in self.time_observer[agent]:
                        speed_sum += self.distance_observer[agent] / self.time_observer[agent]['time']

                speed_ave = speed_sum / agent_count

                for agent in self.time_observer:
                    if 'time' in self.time_observer[agent]:
                        route = self.route_observer[agent]
                        if route not in self.route_list:
                            self.route_list.append(tuple(self.route_observer[agent]))

                for route in self.route_list:
                    time_sum = 0.0
                    speed_sum = 0.0
                    _agents = 0.0

                    for agent in self.time_observer:
                        if 'time' in self.time_observer[agent]:
                            if tuple(self.route_observer[agent]) == route:
                                time_sum += self.time_observer[agent]['time']
                                speed_sum += self.distance_observer[agent] / self.time_observer[agent]['time']
                                _agents += 1

                    if _agents:
                        r = list(route)
                        for b in range(0, len(r)):
                            r.insert(b*2, '-')
                        _ = r.pop(0)
                        route = tuple(r)
                        self.ave_time_dict[route] = {'Average time': time_sum / _agents}
                        self.ave_speed_dict[route] = {'Average speed': mps_to_kph(speed_sum / _agents)}

                self.result_dict['time_ave'] = round(time_ave, 2)
                self.result_dict['speed_ave'] = round(speed_ave, 2)

            else:
                self.result_dict['time_ave'] = 0.0
                self.result_dict['speed_ave'] = 0.0

        sorted_time = collections.OrderedDict()
        sorted_speed = collections.OrderedDict()

        for key in sorted(self.ave_time_dict.iterkeys()):
            sorted_time[key] = self.ave_time_dict[key]

        for key in sorted(self.ave_speed_dict.iterkeys()):
            sorted_speed[key] = self.ave_speed_dict[key]

        dc_result = copy.deepcopy(self.result_dict)
        dc_result_time = copy.deepcopy(sorted_time)
        dc_result_speed = copy.deepcopy(sorted_speed)

        return dc_result, dc_result_time, dc_result_speed


class RoadEntryExitObserver(AbstractObserver):
    def __init__(self, agent_manager, scene, **extras):
        super(RoadEntryExitObserver, self).__init__(agent_manager, scene, **extras)

        if 'road' in extras:
            roads = extras['road']

        self.observed_uroads = []
        self.running_log = collections.defaultdict(
            lambda: collections.defaultdict(lambda: {'entry': None, 'exit': None}, road_length=None))

        for i in range(0, len(roads)):
            if roads[i]:
                self.observed_uroads.append(roads[i])

        agent_manager.connect('new_agent', self._observe)
        agent_manager.connect('move_agent', self._observe)
        agent_manager.connect('kill_agent', self._observe)

    def _observe(self, event, source, **extras):
        road = extras['road']
        agent = extras['agent']
        time = float(self.actual_clock.now)/1000
        if road.label in self.observed_uroads:

            if self.running_log[road.label]['road_length'] is None:
                self.running_log[road.label]['road_length'] = config.to_m(road.length)
                self.running_log[road.label]['road_lanes'] = road.lanes

            if event == 'new_agent' or event == 'move_agent':
                self.running_log[road.label][agent.id]['entry'] = time
            elif event == 'kill_agent':
                self.running_log[road.label][agent.id]['exit'] = time

        if 'old_road' in extras.keys() and extras['old_road'].label in self.observed_uroads:
            old_road = extras['old_road']
            self.running_log[old_road.label][agent.id]['exit'] = time

    def result(self):
        log = copy.deepcopy(self.running_log)
        return dict(log=log, time_ended=self.actual_clock.now)


class SurveyEntryExitObserver(AbstractObserver):
    def __init__(self, agent_manager, scene, **extras):
        super(SurveyEntryExitObserver, self).__init__(agent_manager, scene, **extras)

        surveys = None

        if 'survey' in extras:
            surveys = extras['survey']

        self.observed_surveys = []
        ###FLORES ADDING EXIT COUNT###
        self.exit_observer = collections.defaultdict(int)
        ###END OF FLORES ADDED
        self.running_log = collections.defaultdict(
            lambda: collections.defaultdict(lambda: {'entry': None, 'exit': None}, survey_length=None))

        for i in range(0, len(surveys)):
            if surveys[i]:
                self.observed_surveys.append(surveys[i])

        agent_manager.connect('update_agent', self._observe)

    def _observe(self, event, source, **extras):
        road = extras['road']
        agent = extras['agent']
        time = float(self.actual_clock.now)/1000
        pos = extras['pos']

        for survey in self.observed_surveys:
            if road.label == survey().road.label:
                if self.running_log[survey().id]['survey_length'] is None:
                    self.running_log[survey().id]['survey_length'] = config.to_m(survey().zone)
                    self.running_log[survey().id]['survey_lanes'] = survey().road.lanes

                if pos and survey().pos < pos < survey().exit and self.running_log[survey().id][agent.id]['entry'] is None:
                    self.running_log[survey().id][agent.id]['entry'] = time
###needed for throughput:
                elif pos and pos > survey().exit and self.running_log[survey().id][agent.id]['entry'] is not None \
                        and self.running_log[survey().id][agent.id]['exit'] is None:
                    self.running_log[survey().id][agent.id]['exit'] = time
                    ###FLORES ADDED
                    self.exit_count[survey().id] += 1
                    ###END OF FLORES ADDED

    def result(self):
        log = copy.deepcopy(self.running_log)
        return dict(log=log, time_ended=self.actual_clock.now)

###FLROES ADDED
    def returnExitCount(self):
        throughputFlores = copy.deepcopy(self.exit_count)
        return throughputFlores
###END OF FLORES ADDED
