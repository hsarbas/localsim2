from localsim.models.agent import base, senses
from localsim.models.infra.control import concrete as control
from localsim.models.meta import observer, analyzer, conflict_manager
from localsim.utils.tools import mps_to_kph
from localsim.models import tso_controller
import localsim
import collections


config = localsim.conf()


class Engine(object):
    """The actual simulator engine class. Contains methods for step incrementing, callback firing, and processing the analyzers and data."""

    def __init__(self, sim_clock, scene, agent_manager=None, **extras):
        self.scene = scene
        self.tso_controller = tso_controller.TSO(self.scene)
        self.agent_manager = agent_manager if agent_manager else base.AgentManager()
        self.sim_clock = sim_clock
        self.conflict_manager = conflict_manager.ConflictManager(sim_clock, scene, self.agent_manager)

        self.sim_clock.connect('stop', self._stop_callback)

        if 'uroad' in extras:
            self.active_roads = extras['uroad']
        if 'uroad_survey' in extras:
            self.uroad_survey = extras['uroad_survey']
        if 'iroad_survey' in extras:
            self.iroad_survey = extras['iroad_survey']
        if 'stoplight' in extras:
            self.stop_survey = extras['stoplight']

        self.agent_counter = observer.Counter(self.agent_manager, self.scene)
        self.observer = observer.TimeSpeedObserver(self.agent_manager, self.scene)
        self.u_observer = observer.SurveyEntryExitObserver(self.agent_manager, self.scene, survey=self.uroad_survey)
        self.los_observer = observer.RoadEntryExitObserver(self.agent_manager, self.scene, road=self.active_roads)

        for road, entry in self.scene.dispatcher.items():
            entry.run(self.agent_manager)
            entry.connect('dispatch', self._signal_callback)

        # Add the agent manager's clock into the control (see control/base.py for function definition)
        for c_list in list(self.scene.controls.values()):
            for c in c_list:
                if isinstance(c, control.StopLight):
                    c.run(self.agent_manager.actual_clock)

        for road in self.scene.surveyors:
            for survey in self.scene.surveyors[road]:
                survey.run(self.agent_manager)

    def _signal_callback(self, event, src, **extras):
        agent = extras['agent_class'](vel=extras['velocity'], acc=extras['acceleration'],
                                      route_list=extras['route_list'], dstn=extras['dstn'])

        sensor = senses.Sensor(agent, self.agent_manager, self.scene)
        actuator = senses.Actuator(agent, self.agent_manager)

        agent.sensor = sensor
        agent.actuator = actuator

        self.agent_manager.add_agent(agent, extras['road'], 0.0, extras['lane'])

    def step(self):
        try:
            time = self.sim_clock.next()
        except StopIteration:
            return None

        return [time, self.agent_manager.step()]

    def active_agents(self):
        return len(self.agent_manager.agents)

    def _stop_callback(self, event, source):

        self.data = collections.OrderedDict()

        des = 'Description'
        val = 'Values'
        route = 'Route'
        travel_time = 'Average time'
        travel_speed = 'Average speed'
        time_elapsed = self.sim_clock.end / 1000
        # agents = self.agent_counter.result()
        time_speed_total, ave_time, ave_speed = self.observer.result()
        rows_dict = collections.OrderedDict()

        rows_dict['Observation period (s)'] = {val: time_elapsed*10}
        rows_dict['Average speed (kph)'] = {val: mps_to_kph(time_speed_total['speed_ave'])}
        rows_dict['Average travel time (s)'] = {val: time_speed_total['time_ave']}

        self.data['Summary'] = dict(col_names=[des, val], rows=rows_dict)
        self.data['Travel time'] = dict(col_names=[route, travel_time], rows=ave_time)
        self.data['Travel speed'] = dict(col_names=[route, travel_speed], rows=ave_speed)

        if self.active_roads:
            los_analyzer = analyzer.LOSAnalyzer(self.los_observer)

            self.data['los'] = los_analyzer.result()

        if self.uroad_survey:
            q_analyzer = analyzer.VolumeAnalyzer(self.uroad_survey, self.agent_manager.actual_clock.now)
            k_analyzer = analyzer.DensityAnalyzer(self.uroad_survey, self.agent_manager.actual_clock.now)
            u_analyzer = analyzer.SpaceMeanSpeedAnalyzer(self.u_observer)

            self.data['q'] = q_analyzer.result()
            self.data['k'] = k_analyzer.result()
            self.data['u'] = u_analyzer.result()

            delay_analyzer = analyzer.DelayAnalyzer(self.uroad_survey, self.stop_survey, self.data['q'])
            self.data['delay'] = delay_analyzer.result()

        if self.iroad_survey:
            cvcc_analyzer = analyzer.CVCCAnalyzer(self.iroad_survey, self.agent_manager.actual_clock.now)
            self.data['CVCC'] = cvcc_analyzer.result()

            # stoplights = collections.defaultdict(list)
            # for key in self.scene.controls.keys():
            #     for c in self.scene.controls[key]:
            #         if isinstance(c, control.StopLight):
            #             stoplights[key].append(c)
            #
            # delay_analyzer = analyzer.DelayAnalyzer(self.data['CVCC'], self.iroad_survey, stoplights,
            #                                         self.agent_manager.actual_clock.now)
            # self.data['delay'] = delay_analyzer.result()

        pos = 'Position'
        r = 'Red'
        g = 'Green'
        y = 'Yellow'
        state = 'Start State'
        time = 'Start Time'

        stoplight_rows_dict = collections.OrderedDict()

        for c_list in list(self.scene.controls.values()):
            for c in c_list:
                if isinstance(c, control.StopLight):
                    location = 'road: ' + str(c.road) + ', lane: ' + str(c.lane) + ', pos: ' + str(c.pos)
                    if c.init_state[0] == 0:
                        init_state = r
                    elif c.init_state[0] == 1:
                        init_state = g
                    else:
                        init_state = y

                    stoplight_rows_dict[location] = {r: c.phase[0], g: c.phase[1], y: c.phase[2],
                                                     state: init_state, time: c.init_state[1]}

        self.data['Signal Cycle'] = dict(col_names=[pos, r, g, y, state, time], rows=stoplight_rows_dict)



