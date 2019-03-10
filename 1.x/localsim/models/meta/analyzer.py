import collections, numbers
import abc
from localsim.utils import signal


class AbstractAnalyzer(signal.Signal):
    __metaclass__ = abc.ABCMeta

    def __init__(self, **data):
        pass

    @abc.abstractmethod
    def analyze(self):
        pass

    @abc.abstractmethod
    def result(self):
        pass


class SpaceMeanSpeedAnalyzer(AbstractAnalyzer):
    def __init__(self, u_observer):
        super(SpaceMeanSpeedAnalyzer, self).__init__()
        self.log = u_observer.result()['log']
        self.time_ended = u_observer.result()['time_ended']
        self.col_names = ['t'] + self.log.keys()

    def analyze(self):
        u_table = collections.defaultdict(lambda: collections.defaultdict())
        survey_totals = collections.defaultdict(lambda: collections.defaultdict())

        for t in range(300, self.time_ended/1000 + 1, 300):

            #Does this also get total number of agents that passed through a survey zone (throughput)?
            for survey in self.log:
                total_time = 0
                agent_count = 0
                total_delay = 0
                for agent in self.log[survey]:
                    if not isinstance(self.log[survey][agent], numbers.Number):
                        if self.log[survey][agent]['exit'] is not None and (t - 299) < self.log[survey][agent]['exit'] < t:
                            actual_time = self.log[survey][agent]['exit']-self.log[survey][agent]['entry']
                            total_time += actual_time
                            agent_count += 1
                            '''
                            Ideal time is the length of the survey zone divided by the maximum speed of the agent.
                            Agent's maximum speed is min(survey zone speed limit, max speed of the agent).
                            Delay is the actual time minus the ideal time.
                            This gets the average delay per survey zone.
                            '''
                            ideal_speed = min(self.log[survey][agent]['vel_max'], self.log[survey]['survey_speed'])
                            ideal_time = self.log[survey]['survey_length'] / ideal_speed
                            time_delay = actual_time - ideal_time
                            total_delay += time_delay

                if 'total_time' in survey_totals[survey].keys():
                    survey_totals[survey]['total_time'] += total_time
                    survey_totals[survey]['agent_count'] += agent_count
                    ###STILL UNSURE ABOUT THIS
                    survey_totals[survey]['total_delay'] += total_delay
                else:
                    survey_totals[survey]['total_time'] = total_time
                    survey_totals[survey]['agent_count'] = agent_count
                    ###STILL UNSURE ABOUT THIS
                    survey_totals[survey]['total_delay'] = total_delay

                if agent_count > 0:
                    ave_time = total_time / agent_count
                    #What is this computing?
                    u_table[t][survey] = 3.6 * self.log[survey]['survey_length']/ave_time
                else:
                    u_table[t][survey] = None

        for survey in survey_totals:
            if survey_totals[survey]['agent_count'] > 0:
                ###Displays throughput per survey zone in the 'Speed' spreadsheet
                u_table['Throughput'][survey] = survey_totals[survey]['agent_count']
                ###Displays average delay per survey zone in the 'Speed' spreadsheet
                u_table['Average Delay'][survey] = survey_totals[survey]['total_delay'] / survey_totals[survey]['agent_count']

                u_table['Average'][survey] = 3.6 * self.log[survey]['survey_length'] / \
                                             (survey_totals[survey]['total_time'] /
                                              survey_totals[survey]['agent_count'])

        return u_table

    def result(self):
        return dict(col_names=self.col_names, rows=self.analyze())


class DensityAnalyzer(AbstractAnalyzer):
    def __init__(self, k_zones, time_ended):
        super(DensityAnalyzer, self).__init__()
        self.time_ended = time_ended
        self.labels = [zone().id for zone in k_zones]
        self.col_names = ['t'] + self.labels
        self.zones = k_zones

    def analyze(self):
        k_table = collections.defaultdict(lambda: collections.defaultdict())
        k_ave_table = collections.defaultdict(lambda: collections.defaultdict())

        for t in range(60, self.time_ended/1000 + 1, 60):
            for zone in self.zones:
                agent_count = zone().count[t]
                name = zone().id

                k_table[t][name] = agent_count/(zone().zone_m * zone().road.lanes)

                ave_t = (t / 60) % 5  # every 5 mins (300 s), get average of previous 5 densities
                if ave_t == 0:
                    ave_sum = 0
                    for time in range((t/5), (t+60), (t/5)):
                        ave_sum += k_table[time][name]
                    k_ave_table[t][name] = ave_sum / 5

        k_table_copy = k_ave_table.copy()

        for zone in self.zones:
            if len(k_table_copy) > 0:
                name = zone().id
                k_ave_table['Average'][name] = (sum(k_table_copy[t][name]
                                                    for t in k_table_copy.keys()))/len(k_table_copy)

        return k_ave_table

    def result(self):
        return dict(col_names=self.col_names, rows=self.analyze())


class VolumeAnalyzer(AbstractAnalyzer):
    def __init__(self, q_zones, time_ended):
        super(VolumeAnalyzer, self).__init__()
        self.labels = [zone().id for zone in q_zones]
        self.col_names = ['t'] + self.labels
        self.zones = q_zones
        self.time_ended = time_ended

    def analyze(self):
        q_table = collections.defaultdict(lambda: collections.defaultdict())

        for t in range(300, self.time_ended/1000 + 1, 300):
            for zone in self.zones:
                name = zone().id
                data = zone().result()
                q_table[t][name] = sum(len(data[i]) for i in range(t-299, t+1))

        q_table_copy = q_table.copy()
        for item in self.labels:
            q_table['Total'][item] = sum(q_table_copy[t][item] for t in q_table_copy.keys())
            q_table['Average Volume'][item] = float(q_table['Total'][item]) / float((self.time_ended / 1000))

        return q_table

    def result(self):
        return dict(col_names=self.col_names, rows=self.analyze())


class CVCCAnalyzer(AbstractAnalyzer):
    # Counts the total amount of vehicles that passed through the zone at a given timestep
    def __init__(self, cvcc_zones, time_ended):
        super(CVCCAnalyzer, self).__init__()
        self.label = [zone().id for zone in cvcc_zones]
        self.cnames = ['t'] + self.label
        self.zones = cvcc_zones
        self.time_ended = time_ended

    def analyze(self):
        cvcc_table = collections.defaultdict(lambda: collections.defaultdict())

        for t in range(1, self.time_ended/1000):
            for zone in self.zones:
                name = zone().id
                data = zone().result()
                output = len(data[1]) if t == 1 else cvcc_table[t-1][name] + len(data[t])
                cvcc_table[t][name] = output

        # for zone in self.zones:
        #     name = zone().road.label + zone().id
        #
        #     # TODO: Compute for sfr and actual volume
        #     cvcc_table['Saturation flow rate'][name] = 0
        #     cvcc_table['Actual volume'][name] = 0

        return cvcc_table

    def result(self):
        return dict(col_names=self.cnames, rows=self.analyze())


class LOSAnalyzer(AbstractAnalyzer):
    def __init__(self, los_observer):
        super(LOSAnalyzer, self).__init__()
        self.los_observer = los_observer
        self.log = los_observer.result()['log']
        self.time_ended = los_observer.result()['time_ended']
        self.col_names = ['t'] + self.log.keys()

    def analyze(self):
        los_table = collections.defaultdict(lambda: collections.defaultdict())

        for t in range(300, self.time_ended / 1000 + 1, 300):
            for road in self.log:
                agent_count = 0

                for agent in self.log[road]:
                    if not isinstance(self.log[road][agent], numbers.Number):
                        if self.log[road][agent]['entry'] is not None and \
                                ((t-299) < self.log[road][agent]['entry'] < t):
                            agent_count += 1

                los_table[t][road] = agent_count

        los_table_copy = los_table.copy()

        for road in self.log:
            los_table['Total'][road] = sum(los_table_copy[t][road] for t in los_table_copy.keys())

            duration = float(self.time_ended/1000)
            ave_volume = float(los_table['Total'][road]) / (duration / 3600.0)
            los_table['Average Volume'][road] = ave_volume

            capacity = self.los_observer.scene.get_road_by_label(road).lanes * 1250
            v_c = ave_volume / capacity
            if v_c <= 0.20:
                los = 'A'
            elif 0.20 < v_c <= 0.50:
                los = 'B'
            elif 0.50 < v_c <= 0.70:
                los = 'C'
            elif 0.70 < v_c <= 0.85:
                los = 'D'
            elif 0.85 < v_c <= 1.0:
                los = 'E'
            else:
                los = 'F'

            los_table['LOS (v/c)'][road] = los

        return los_table

    def result(self):
        return dict(col_names=self.col_names, rows=self.analyze())


class DelayAnalyzer(AbstractAnalyzer):

    def __init__(self, zones, stoplights, volume_data):
        super(DelayAnalyzer, self).__init__()
        self.label = [zone().id for zone in zones]
        self.stoplights = stoplights
        self.zones = zones
        self.volume_data = volume_data
        self.cnames = [' '] + self.label

    def analyze(self):
        delay_table = collections.defaultdict(lambda: collections.defaultdict())

        for zone in self.zones:
            name = zone().id
            volume = self.volume_data['rows']['Total'][name] * 1.1  # convert to PCU

            try:
                actual_red, actual_green, yellow_time = self.stoplights[zone().road.label].phase
                cycle_time = sum([actual_red, actual_green, yellow_time])

                effective_green = actual_green + 1.0
                effective_red = cycle_time - effective_green
                sfr = 2000.0
                y = float(volume) / sfr

                delay = (effective_red ** 2) / ((2 * cycle_time) * (1 - y))
                delay_table['Average delay'][name] = delay

            except KeyError:
                pass

        return delay_table

    def result(self):
        return dict(col_names=self.cnames, rows=self.analyze())


# class DelayAnalyzer(AbstractAnalyzer):
#
#     def __init__(self, cvcc_data, cvcc_zones, stoplights, time_ended):
#         super(DelayAnalyzer, self).__init__()
#         self.data = cvcc_data
#         self.zones = cvcc_zones
#         self.stoplights = stoplights
#         self.time_ended = time_ended
#         self.col_names = [' '] + [zone().road.label + zone().id for zone in cvcc_zones]
#
#     def analyze(self):
#         delay_table = collections.defaultdict(lambda: collections.defaultdict())
#
#         for zone in self.zones:
#             name = zone().road.label + zone().id
#             sfr = self.data['rows']['Saturation flow rate'][name]
#             volume = self.data['rows']['Actual volume'][name]
#             red_time = self.stoplights[zone().road][0].phase[0] if self.stoplights else 0
#             cycle_time = sum(t for t in self.stoplights[zone().road][0].phase) if self.stoplights else 0
#
#             delay = (red_time**2) / ((2*cycle_time) * (1 - (volume/sfr))) if self.stoplights else 0
#
#             delay_table['Average delay'][name] = delay
#
#         return delay_table
#
#     def result(self):
#         return dict(col_names=self.col_names, rows=self.analyze())
