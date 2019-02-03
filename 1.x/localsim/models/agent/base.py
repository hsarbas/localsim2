from abc import ABCMeta, abstractmethod
import weakref
from localsim.utils import signal
from localsim.models.agent import const
import collections
import itertools
from localsim.analysis import matrices
import exceptions
import localsim
import numpy as np
from scipy.stats import norm
import movement_models
from ..infra.control.concrete import StopLight
from ..meta import conflict_helper
import dists
from localsim.utils import tools
import math
import random

config = localsim.conf()

_id_counter = itertools.count()

DELIB_FRONT = 'FRONT'
DELIB_ACC = 'ACC'
DELIB_SIDE = 'SIDE'


class AbstractAgent(signal.Signal):
    """Implements the car agent; uses the car-following models; extends the Signal class."""

    __metaclass__ = ABCMeta
    events = ['move', 'destroy', 'intention_enter', 'intention_exit']

    acc_dist = matrices.random_event_generator({3.0: 0.2, 2.5: 0.3, 3.5: 0.4, 4.0: 0.1})
    p_dist = dists.politeness()

    def __init__(self, type_, width, length, vel, acc, route_list, dstn, vel_max=None, acc_max=None, dec_max=1.0,
                 safe_gap=const.MIN_GAP_V0, left_bias=0.0, right_bias=0.0):

        self.id = hex(_id_counter.next())
        self.type = type_

        self.width = width
        self.length = length

        # self.vel_max = vel_max or max(13.89, np.random.normal(16.67, 3.0))
        self.vel_max = config.desired_velocity
        self.safe_gap = config.minimum_headway
        self.safe_time_headway = config.safe_time_headway

        self.acceleration_threshold = config.acceleration_threshold
        self.politeness_factor = config.politeness_factor
        self.safe_braking_deceleration = config.safe_braking_deceleration

        self.acc_max = acc_max or AbstractAgent.acc_dist.next()
        self.vel = min(vel, self.vel_max)
        self.acc = min(acc, self.acc_max)
        self.dec_max = dec_max
        # self.safe_gap = max(const.MIN_GAP_V0 / 2.0, safe_gap)

        self.politeness = AbstractAgent.p_dist.next()

        self.left_bias = left_bias
        self.right_bias = right_bias

        self.sensor = None
        self.actuator = None

        self._delib_state = DELIB_SIDE
        self._update_counter = 0
        self._lc_delay = const.LC_DELAY * .75 + np.random.normal()
        self._lc_dest_dir = const.THROUGH
        self._mlc_delay = 0.0
        self._mlc_delay_flag = False
        self._memory = dict()
        self._allow_dlc = True
        self.sight_distance = compute_ssd(self.vel)
        self.effective_vel_max = self.vel_max

        self.critical_gap = 3.75  # s
        self.q_d = 0  # stopped delay value
        self._dwell_tag = False
        self._first_acc_tag = False
        self._comp_acc = 0.0
        self._dwell = 0.0  # minor priority conflict dwell time in seconds

        self.lc_state = const.NORMAL_MERGE
        self.lc_gridlock_row = False

        self.neighborhood = dict()
        self.route = None
        self.position = dict()
        self.controls = []
        self.controls_restriction = []

        self.conflict_zones = None  # newCA
        self._ignore_conflict = False  # newCA
        self.conflict_neighborhood = None  # newCA

        self.route_list = [route for route in route_list if route[-1] == dstn]
        self.dest = dstn
        self.route_taken = []

    def allow_dlc(self, flag=None):
        if flag is None:
            return self._allow_dlc
        else:
            self._allow_dlc = flag

    def mlc_delay(self, flag=None):
        if flag is None:
            return self._mlc_delay
        else:
            self._mlc_delay = 0.0
            self._mlc_delay_flag = flag

    def remember(self, key, delay):
        if key not in self._memory:
            self._memory[key] = delay - const.DT
            if self._memory[key] < 0.0:
                self._memory[key] = 0.0

    def remembers(self, key):
        return key in self._memory

    def valid(self, key):
        return self._memory[key] > 0.0

    def _update_memory(self):
        for key in list(self._memory.keys()):
            if self._memory[key] > 0.0:
                self._memory[key] -= const.DT

    def _update_lc_delay(self, reset=False):
        if reset:
            self._lc_delay = 0.0
        self._lc_delay += const.DT

    def lc_processing(self):
        return 0.0 < self._lc_delay < const.LC_DELAY

    def call_counts(self):
        return self._update_counter

    def deliberate_side(self):
        if self.lc_processing():
            return const.THROUGH

        if not self.conflict_zones and not self._allow_dlc:
            self.allow_dlc(True)

        self._lc_dest_dir = const.THROUGH
        allowed_moves, lc_type = self.get_allowed_moves()

        if lc_type == const.DLC:
            left_bias, right_bias, acc_thresh, forced = self.get_restriction_bias()
            return self.discretionary_lane_change(allowed_moves, left_bias=left_bias, right_bias=right_bias,
                                                  acc_thresh=acc_thresh, forced=forced)
        elif lc_type == const.MLC:
            if np.random.random() < self.prob_respond_mlc():
                return self.mandatory_lane_change(allowed_moves)

        return const.THROUGH

    def deliberate_acc(self):
        lc_type = self.get_allowed_moves()[1]

        front = self.neighborhood['front']
        vel_front = const.LARGE_NUMBER if front is None else front.vel
        gap_front = self.neighborhood['gap_front']
        vel_lead = const.LARGE_NUMBER
        gap_lead = const.LARGE_NUMBER
        vel_max = self.effective_vel_max

        for dir_ in ['left', 'right']:
            lead = self.neighborhood['%s_lead' % dir_]
            lead_gap = self.neighborhood['gap_%s_lead' % dir_]
            dest_side = const.RIGHT if dir_ == 'right' else const.LEFT

            vel_lead_t = const.LARGE_NUMBER
            gap_lead_t = const.LARGE_NUMBER

            if lead and lead.lc_state == const.FORCED_MERGE and lead.lane_changing() == dest_side:
                if lead.lc_gridlock_row:
                    gap_lead_t = self.safe_gap
                    vel_lead_t = const.ALMOST_STOP
                    self.lc_gridlock_row = False
                elif lead.vel <= const.ALMOST_STOP:
                    if lead_gap >= self.safe_gap:
                        gap_lead_t = max(self.safe_gap, lead_gap)
                        vel_lead_t = lead.vel
                else:
                    gap_lead_t = lead_gap
                    vel_lead_t = tools.decompose(lead.vel, math.pi / 4.0)[0]

                if gap_lead >= gap_lead_t:
                    gap_lead = gap_lead_t
                    vel_lead = vel_lead_t

        if lc_type == const.MLC:
            gap_front = min(gap_front, gap_lead)
            vel_front = min(vel_front, vel_lead)
            if self.route['estop_dist'] <= gap_front:
                vel_front = 0.0
                gap_front = self.route['estop_dist']

            if self.lc_state == const.FORCED_MERGE and not self.lc_gridlock_row:  # Entering ROW
                for dir_ in ['right', 'left']:
                    side = const.LEFT if dir_ == 'left' else const.RIGHT
                    lag = self.neighborhood['%s_lag' % dir_]

                    if self.lane_changing() == side:
                        # if not lag or lag.vel <= const.ALMOST_STOP:
                        if lag:
                            self.lc_gridlock_row = True
                            break

            if self.lc_gridlock_row:  # Responding to self ROW
                if front is None:
                    if self.lane_changing() == const.LEFT:
                        if not self.neighborhood['left_lead']:
                            # gap_front = self.safe_gap
                            # vel_front = min(5.56, vel_max)
                            gap_front = const.LARGE_NUMBER
                            vel_front - const.LARGE_NUMBER

                    elif self.lane_changing() == const.RIGHT:
                        if not self.neighborhood['right_lead']:
                            # gap_front = self.safe_gap
                            # vel_front = min(5.56, vel_max)
                            gap_front = const.LARGE_NUMBER
                            vel_front = const.LARGE_NUMBER

        if self.lc_state == const.FORCED_MERGE and not self.lc_gridlock_row:
            vel_max = min(max(5.56, self.vel * 0.95), vel_max)

        acc = movement_models.car_following(self.vel, vel_max, self.acc_max, self.dec_max, vel_front, gap_front,
                                            safe_gap=self.safe_gap, safe_time_headway=self.safe_time_headway)
        acc = min(acc, self.react_to_control())

        if not self._ignore_conflict:
            # If a conflict area is detected along the SSD, use the acceleration computed when the area was first
            # sighted as input for computing acceleration when reacting to conflict area.
            # Continue using the acceleration until the vehicle has crossed the conflict area
            if self.conflict_zones:
                if not self._first_acc_tag:
                    self._first_acc_tag = True
                    self._comp_acc = acc
                acc = min(acc, self.react_to_conflict_zone(self._comp_acc))
                self.allow_dlc(False)
            else:
                self._first_acc_tag = False
                self._comp_acc = 0.0

        return acc

    def deliberate_front(self):
        self._update_precept(route=True)
        if self.route:
            return self.route.get('destination')
        return None

    def get_restriction_bias(self):
        left_bias = self.left_bias
        right_bias = self.right_bias
        # acc_thresh = const.A_THRESH
        acc_thresh = self.acceleration_threshold
        forced = False

        for control in self.controls_restriction:
            if control['type'] == 'TypeRestrictionZone':
                if self.__class__.__name__ in control['restrict']:
                    if control['lane'] < self.position['lane']:  # control is on left side
                        left_bias = control['bias']
                    elif control['lane'] > self.position['lane']:  # control is on right side
                        right_bias = control['bias']
                    elif control['lane'] == self.position['lane']:
                        acc_thresh = const.LARGE_NUMBER
                        forced = True
                else:
                    if control['lane'] < self.position['lane']:
                        right_bias = control['bias']
                    elif control['lane'] > self.position['lane']:
                        left_bias = control['bias']
                    elif control['lane'] == self.position['lane']:
                        acc_thresh = -const.LARGE_NUMBER
                        forced = True

            elif control['type'] == 'BusTerminalZone':
                if self.__class__.__name__ != 'Bus':
                    if control['lane'] < self.position['lane']:
                        left_bias = const.LARGE_NUMBER
                    elif control['lane'] > self.position['lane']:
                        right_bias = const.LARGE_NUMBER
                    elif control['lane'] == self.position['lane']:
                        acc_thresh = const.LARGE_NUMBER
                        forced = True

        return left_bias, right_bias, acc_thresh, forced

    def discretionary_lane_change(self, allowed_moves, left_bias, right_bias, acc_thresh, forced):
        front = self.neighborhood['front']
        if front and front.lc_processing():
            return const.THROUGH

        incentives = {const.LEFT: 0.0, const.RIGHT: 0.0}

        for dir_ in [const.LEFT, const.RIGHT]:
            front = self.neighborhood['front']

            if (dir_ in allowed_moves) and not (front and front.lc_processing()) and \
                    self.accept_gap(dir_, const.DLC, forced):

                acc = self.get_mobil_accelerations(dir_)

                if movement_models.mobil_safety(acc['acc_new_lag'], b_safe=self.safe_braking_deceleration):
                    acc['a_thresh'] = acc_thresh
                    acc['p'] = self.politeness_factor
                    incentives[dir_] = movement_models.mobil_incentive(**acc)

                if dir_ == const.LEFT:
                    incentives[dir_] += left_bias
                elif dir_ == const.RIGHT:
                    incentives[dir_] += right_bias

        if incentives[const.LEFT] > 0.0 or incentives[const.RIGHT] > 0.0:
            if incentives[const.LEFT] > incentives[const.RIGHT]:
                self._lc_dest_dir = const.LEFT
                return const.LEFT
            else:
                self._lc_dest_dir = const.RIGHT
                return const.RIGHT

        return const.THROUGH

    def mandatory_lane_change(self, allowed_moves):
        for d in [const.LEFT, const.RIGHT]:
            if d in allowed_moves:
                self._lc_dest_dir = d

                if self.lc_state == const.NORMAL_MERGE:
                    if self.accept_gap(d, const.MLC):
                        acc = self.get_mobil_accelerations(d, lag_only=True)
                        if movement_models.mobil_safety(acc['acc_new_lag'], b_safe=self.safe_braking_deceleration):
                            return d

                if np.random.random() <= self.prob_enter_forced_merge(d):
                    self.lc_state = const.FORCED_MERGE
                else:
                    self.lc_state = const.NORMAL_MERGE
                    self.lc_gridlock_row = False

                if self.lc_state == const.FORCED_MERGE:
                    if self.accept_gap(d, const.MLC, forced=True):
                        acc = self.get_mobil_accelerations(d, lag_only=True)
                        if movement_models.mobil_safety(acc['acc_new_lag'], b_safe=self.safe_braking_deceleration):
                            self.lc_state = const.NORMAL_MERGE
                            return d
                break

        return const.THROUGH

    def get_mobil_accelerations(self, dir_, lag_only=False):
        prefix = 'left' if dir_ == const.LEFT else 'right'

        lead = self.neighborhood['%s_lead' % prefix]
        gap_lead = self.neighborhood['gap_%s_lead' % prefix]
        vel_lead = const.LARGE_NUMBER if lead is None else lead.vel
        lag = self.neighborhood['%s_lag' % prefix]
        gap_lag = self.neighborhood['gap_%s_lag' % prefix]

        vel_max = self.effective_vel_max

        ret = {}

        if lag:
            if lead:
                acc_new_lag = movement_models.car_following(lag.vel, lag.effective_vel_max, lag.acc_max, lag.dec_max,
                                                            lead.vel, gap_lag + self.length + gap_lead,
                                                            safe_gap=lag.safe_gap,
                                                            safe_time_headway=self.safe_time_headway)
            else:
                acc_new_lag = movement_models.car_following(
                    lag.vel, lag.effective_vel_max, lag.acc_max, lag.dec_max, const.LARGE_NUMBER, const.LARGE_NUMBER,
                    safe_time_headway=self.safe_time_headway)
            acc_curr_lag = movement_models.car_following(
                lag.vel, lag.effective_vel_max, lag.acc_max, lag.dec_max, self.vel, gap_lag, safe_gap=lag.safe_gap,
                safe_time_headway=self.safe_time_headway)
        else:
            acc_curr_lag = 0.0
            acc_new_lag = 0.0

        ret['acc_curr_lag'] = acc_curr_lag
        ret['acc_new_lag'] = acc_new_lag

        if not lag_only:
            front = self.neighborhood['front']
            gap_front = self.neighborhood['gap_front']
            vel_front = const.LARGE_NUMBER if front is None else front.vel
            back = self.neighborhood['back']
            gap_back = self.neighborhood['gap_back']

            gap_front_control = const.LARGE_NUMBER
            gap_lead_control = const.LARGE_NUMBER

            gap_front_limit = const.LARGE_NUMBER
            limit_front_vel_max = self.effective_vel_max
            gap_adj_limit = const.LARGE_NUMBER
            limit_adj_vel_max = self.effective_vel_max

            for control in self.controls_restriction:
                if control['type'] in ['Stop', 'StopLight', 'Yield']:
                    if control['lane'] == self.position['lane'] and control['entrydist'] < gap_front_control:
                        gap_front_control = control['entrydist']
                    elif control['lane'] == self.position['lane'] + dir_ and control['entrydist'] < gap_lead_control:
                        gap_lead_control = control['entrydist']
                elif control['type'] == 'SpeedLimitZone':
                    if control['lane'] == self.position['lane']:
                        limit_front_vel_max = control['limit']
                        gap_front_limit = control['entrydist']
                    elif control['lane'] == self.position['lane'] + dir_:
                        limit_adj_vel_max = control['limit']
                        gap_adj_limit = control['entrydist']

            if gap_front < gap_front_control:
                v_max = min(vel_max, limit_front_vel_max)
                acc_curr = movement_models.car_following(self.vel, v_max, self.acc_max, self.dec_max, vel_front, gap_front,
                                                         safe_gap=self.safe_gap,
                                                         safe_time_headway=self.safe_time_headway)
            else:
                if gap_front_control != const.LARGE_NUMBER:
                    acc_curr = -self.acc
                else:
                    acc_curr = movement_models.car_following(self.vel, self.vel_max, self.acc_max, self.dec_max,
                                                             limit_front_vel_max, gap_front_limit,
                                                             safe_time_headway=self.safe_time_headway)

            if gap_lead < gap_lead_control:
                v_max = min(vel_max, limit_adj_vel_max)
                acc_new = movement_models.car_following(self.vel, v_max, self.acc_max, self.dec_max, vel_lead, gap_lead,
                                                        safe_gap=self.safe_gap,
                                                        safe_time_headway=self.safe_time_headway)
            else:
                if gap_lead_control != const.LARGE_NUMBER:
                    acc_new = -self.acc
                else:
                    acc_new = movement_models.car_following(self.vel, self.vel_max, self.acc_max, self.dec_max,
                                                            limit_adj_vel_max, gap_adj_limit,
                                                            safe_time_headway=self.safe_time_headway)

            if back:
                acc_curr_back = movement_models.car_following(
                    back.vel, vel_max, back.acc_max, back.dec_max, self.vel, gap_back, safe_gap=back.safe_gap,
                    safe_time_headway=self.safe_time_headway)
                if front:
                    acc_new_back = movement_models.car_following(
                        back.vel, vel_max, back.acc_max, back.dec_max, front.vel, gap_back + self.length + gap_front,
                        safe_gap=back.safe_gap, safe_time_headway=self.safe_time_headway)
                else:
                    acc_new_back = movement_models.car_following(
                        back.vel, vel_max, back.acc_max, back.dec_max, const.LARGE_NUMBER, const.LARGE_NUMBER,
                        safe_time_headway=self.safe_time_headway)
            else:
                acc_curr_back = 0.0
                acc_new_back = 0.0

            ret['acc_curr'] = acc_curr
            ret['acc_new'] = acc_new
            ret['acc_curr_back'] = acc_curr_back
            ret['acc_new_back'] = acc_new_back

        return ret

    def get_allowed_moves(self):
        moves = []

        if self.route and 'allowed_lanes' in self.route:
            allowed_lanes = self.route['allowed_lanes']
        else:
            allowed_lanes = range(self.position['road'].lanes)

        if self.position['lane'] in allowed_lanes:
            lc_type = const.DLC
            if self.allow_dlc() and self.position['lane'] + const.LEFT in allowed_lanes:
                moves.append(const.LEFT)

            moves.append(const.THROUGH)

            if self.allow_dlc() and self.position['lane'] + const.RIGHT in allowed_lanes:
                moves.append(const.RIGHT)

        else:
            lc_type = const.MLC
            dists = [abs(self.position['lane'] - alane) for alane in allowed_lanes]
            nearest_allowed = allowed_lanes[dists.index(min(dists))]

            if nearest_allowed < self.position['lane']:
                moves.append(const.LEFT)

            if self.route and self.route['estop_dist'] > 0.0 or self.position['lane'] in allowed_lanes:
                moves.append(const.THROUGH)

            if nearest_allowed > self.position['lane']:
                moves.append(const.RIGHT)

        return moves, lc_type

    def critical_gaps(self, dir_, forced):

        prefix = 'left' if dir_ == const.LEFT else 'right'

        # critical gaps
        if forced:
            g_lead = const.MIN_GAP_V0  # function to compute decreasing crit gap
            g_lag = const.MIN_GAP_V0  # function to compute decreasing crit gap

        else:
            if self.neighborhood['%s_lead' % prefix]:
                vel_lead = self.neighborhood['%s_lead' % prefix].vel
                dv_lead = vel_lead - self.vel
            else:
                dv_lead = self.vel

            if self.neighborhood['%s_lag' % prefix]:
                vel_lag = self.neighborhood['%s_lag' % prefix].vel
                dv_lag = self.vel - vel_lag
            else:
                vel_lag = 0
                dv_lag = self.vel

            if dv_lag < 0:
                g_lag = const.LARGE_NUMBER
            else:
                g_lag = self.critical_gap * vel_lag

            if dv_lead < 0:
                g_lead = (self.critical_gap + (-dv_lead / const.B_SAFE)) * self.vel # increase lead crit gap to ensure no collision
            else:
                g_lead = self.critical_gap * self.vel

        return g_lead, g_lag

    def prob_gap_acceptance(self, dir_, g_lead, g_lag, type_):
        # See Ahmed's dissertation
        prefix = 'left' if dir_ == const.LEFT else 'right'

        if self.neighborhood['%s_lead' % prefix]:
            dv_lead = self.neighborhood['%s_lead' % prefix].vel - self.vel
        else:
            dv_lead = -self.vel

        if self.neighborhood['%s_lag' % prefix]:
            dv_lag = self.neighborhood['%s_lag' % prefix].vel - self.vel
        else:
            dv_lag = -self.vel

        if type_ == const.MLC:
            prob = norm.cdf((np.log(g_lead) - 0.508) / 0.488 + (0.420 * min(0.0, dv_lead)) / 0.488) * \
                   norm.cdf(
                       (np.log(g_lag) - 2.02) / 0.526 + (-0.153 * min(0.0, dv_lag) - 0.188 * max(0.0, dv_lag)) / 0.526)
        else:
            prob = norm.cdf((np.log(g_lead) - 0.384) / 0.859) * norm.cdf(
                np.log(g_lag) / 1.07 - (0.587 + 0.0483 * min(0.0, dv_lag) + 0.356 * max(0.0, dv_lag)) / 1.07)

        return prob

    def prob_respond_mlc(self):
        # Parameter is only mlc_delay
        delta_first_gap = 1 if self.mlc_delay() > 0.0 else 0

        prob = 1 / (1 + np.exp(0.654 - 0.577 * self.mlc_delay() + 0.874 * delta_first_gap))

        return prob

    def prob_enter_forced_merge(self, dir_):
        if dir_ == const.LEFT:
            prefix = 'left'
        else:
            prefix = 'right'

        # Compute delta v
        if self.neighborhood['%s_lead' % prefix] is None:
            delta_v = const.LARGE_NUMBER  # default value if no lead(?)
        else:
            delta_v = self.neighborhood['%s_lead' % prefix].vel - self.vel

        # Compute lead + lag gap
        rem_dist_impact = 1 / (1 + np.exp(-0.027 * self.route['estop_dist']))

        prob = 1 / (1 + np.exp(3.16 - 0.303 * min(0, delta_v) - 2.05 * rem_dist_impact -
                               0.285 * (self.neighborhood['gap_%s_lead' % prefix] +
                                        self.neighborhood['gap_%s_lag' % prefix])))

        return prob

    def accept_gap(self, dir_, type_, forced=False):
        prefix = 'left' if dir_ == const.LEFT else 'right'

        crit_gap_lead, crit_gap_lag = self.critical_gaps(dir_, forced)

        gap_lead = self.neighborhood['gap_%s_lead' % prefix]
        gap_lag = self.neighborhood['gap_%s_lag' % prefix]

        return gap_lead >= crit_gap_lead and gap_lag >= crit_gap_lag

    def _update_precept(self, position=False, route=False, neighborhood=False, controls=False, conflict=False):
        if self.sensor is None:
            raise exceptions.MissingSensorError

        if position:
            position = self.sensor.perceive_road(raw=False)
            self.position['road'] = position[0]
            self.position['pos'] = position[1]
            self.position['lane'] = position[2]
            self.position['pos_rear'] = position[3]
            self.position['road_length'] = position[4]
            self.position['end_dist'] = self.position['road_length'] - self.position['pos']
            self.effective_vel_max = min(self.vel_max, tools.kph_to_mps(self.position['road'].speed_limit))
        if route:
            self.route = self.sensor.perceive_route()
        if neighborhood:
            self.neighborhood = self.sensor.perceive_neighborhood()
        if controls:
            self.controls = self.sensor.perceive_controls(self.position['lane'])
            self.controls_restriction = self.sensor.perceive_controls_restriction()

            for control in self.controls:  # Assume no overlapping SpeedLimitZone
                if control['type'] == 'SpeedLimitZone' and control['entrydist'] == 0.0:
                    self.effective_vel_max = min(self.vel_max, self.position['road'].speed_limit, control['limit'])
                    break
        if conflict:
            self.conflict_zones = self.sensor.perceive_conflict_zones(self.position['lane'])  # newCA
            # self.conflict_neighborhood = self.sensor.perceive_conflict_neighborhood(self.conflict_zones)   # newCA

    def update_side(self):
        if self.actuator is None:
            raise exceptions.MissingActuatorError

        if self._delib_state == DELIB_SIDE:
            self._delib_state = DELIB_ACC
        else:
            raise exceptions.CannotDecideException

        self._update_memory()
        self._update_precept(neighborhood=True, route=True, position=True, controls=True)

        if self.route is not None:
            if not self._mlc_delay_flag:
                self.mlc_delay(True)
        else:
            self.mlc_delay(False)

        if self._mlc_delay_flag:
            self._mlc_delay += const.DT

        dlane = self.deliberate_side()

        if self.actuator.act(dlane=dlane):
            self._update_lc_delay(True)
            self._update_precept(controls=True, position=True)
        else:
            self._update_lc_delay()

    def update_acc(self):
        if self.actuator is None:
            raise exceptions.MissingActuatorError

        if self._delib_state == DELIB_ACC:
            self._delib_state = DELIB_FRONT
        else:
            raise exceptions.CannotDecideException

        self._update_precept(neighborhood=True, conflict=True)
        acc = self.deliberate_acc()

        self.actuator.act(acc=acc)
        self.sight_distance = compute_ssd(self.vel)

    def update_front(self):
        if self.actuator is None:
            raise exceptions.MissingActuatorError

        if self._delib_state == DELIB_FRONT:
            self._delib_state = DELIB_SIDE
        else:
            raise exceptions.CannotDecideException

        self._update_counter += 1
        destination = self.deliberate_front()

        if self.actuator.act(destination=destination):
            self.fire('move')

    def lane_changing(self):
        return self._lc_dest_dir

    def react_to_control(self):
        acc = const.LARGE_NUMBER

        for control in self.controls:
            acc_t = acc
            if control['type'] == 'StopLight':
                dist = control['entrydist']
                state = control['state']

                if state == StopLight.RED or (state == StopLight.YELLOW and dist > 6):
                    acc_t = movement_models.car_following(self.vel, self.effective_vel_max, self.acc_max, self.dec_max,
                                                          0.0, dist, safe_gap=self.safe_gap,
                                                          safe_time_headway=self.safe_time_headway)

            elif control['type'] == 'SpeedLimitZone':
                # reaction inside the zone is already captured by the effective_vel_max. see update precepts
                if control['entrydist'] - self.safe_gap > 0.0:
                    acc_t = movement_models.car_following(self.vel, self.effective_vel_max, self.acc_max, self.dec_max,
                                                          control['limit'], self.sight_distance, safe_gap=0,
                                                          safe_time_headway=self.safe_time_headway)

            elif control['type'] == 'Yield':
                if control['entrydist'] - self.safe_gap > 0.0:
                    acc_t = movement_models.car_following(self.vel, self.effective_vel_max, self.acc_max, self.dec_max,
                                                          0.0, self.sight_distance, safe_gap=0,
                                                          safe_time_headway=self.safe_time_headway)

            elif control['type'] == 'Stop':
                id_ = control['id']

                if (control['entrydist'] <= self.neighborhood['gap_front']) and self.vel < const.ALMOST_STOP:
                    self.remember(id_, const.STOP_DELAY)

                if not self.remembers(id_) or self.valid(id_):
                    acc_t = movement_models.car_following(self.vel, self.effective_vel_max, self.acc_max, self.dec_max,
                                                          0.0, control['entrydist'], safe_gap=self.safe_gap,
                                                          safe_time_headway=self.safe_time_headway)

            elif control['type'] == 'BusTerminalZone':
                acc_t = self.react_to_bus_terminal(control['label'], control['entrydist'], control['exitdist'],
                                                   control['mean'], control['std_dev'], acc_t)

            acc = min(acc_t, acc)

        return acc

    def react_to_conflict_zone(self, target_acc):
        acc_list = [1000.0]
        vel_max = self.effective_vel_max
        # for conf_zone in self.conflict_zones:
        #
        #     acc_t = 1000.0
        #
        #     entrydist = conf_zone['entrydist']
        #     exitdist = conf_zone['exitdist']
        #     conf_road = conf_zone['road']
        #     conf_rank = conf_road.priority
        #     acc_u = [1000.0]
        #
        #     for zone in self.conflict_neighborhood:
        #         if entrydist > 0:  # approaching
        #             if zone.road.src_road == conf_road.src_road and zone.road.dst_road != conf_road.dst_road:
        #                 # diverging
        #                 if len(self.conflict_neighborhood[zone]['atop']) > 0:  # atop is not clear
        #                     acc_u.append(movement_models.car_following(self.vel, vel_max, self.acc_max, self.dec_max,
        #                                                                0.0, entrydist,
        #                                                                safe_time_headway=self.safe_time_headway))
        #
        #                 if len(self.conflict_neighborhood[zone]['approaching']) > 0:
        #
        #                     for agent in self.conflict_neighborhood[zone]['approaching'].values():
        #                         if zone.distance_from(agent.position['pos'], agent.position['road'])['entry'] < entrydist:
        #                             acc_u.append(
        #                                 movement_models.car_following(self.vel, vel_max, self.acc_max, self.dec_max,
        #                                                               0.0, entrydist -
        #                                                               zone.distance_from(agent.position['pos_rear'],
        #                                                                                  agent.position['road'])['entry'],
        #                                                               safe_time_headway=self.safe_time_headway))
        #
        #                 if len(self.conflict_neighborhood[zone]['approaching_ext']) > 0:
        #
        #                     for agent in self.conflict_neighborhood[zone]['approaching_ext'].values():
        #
        #                         if zone.road == self.position['road'] and agent.position['pos'] > self.position['pos']:
        #                             acc_u.append(
        #                                 movement_models.car_following(self.vel, vel_max, self.acc_max, self.dec_max,
        #                                                               0.0,
        #                                                               agent.position['pos_rear'] - self.position['pos'],
        #                                                               safe_time_headway=self.safe_time_headway))
        #             else:  # crossing or converging
        #                 if self.vel > const.ALMOST_STOP and not self.neighborhood['front']:
        #                     self.q_d = 0
        #                     self.critical_gap = self.critical_gap
        #                 elif self.q_d >= 27 * 4 and self.q_d % 4 == 0:
        #                     # self.critical_gap = max(0.5,
        #                     #                         self.critical_gap * (27.0 / (float(self.q_d) / 4.0 + 27.0) + 0.5))
        #                     self.critical_gap = 0.0
        #
        #                 if len(self.conflict_neighborhood[zone]['atop']) > 0:  # and (not conf_rank or conf_rank == zone.road.priority):  # atop is not clear
        #                     acc_u.append(movement_models.car_following(self.vel, vel_max, self.acc_max, self.dec_max,
        #                                                                0.0, entrydist,
        #                                                                safe_time_headway=self.safe_time_headway))
        #                 elif (len(self.conflict_neighborhood[zone]['approaching']) > 0 or
        #                       len(self.conflict_neighborhood[zone]['approaching_ext']) > 0):
        #                     safely_proceed_list = []
        #                     for agent in self.conflict_neighborhood[zone]['approaching'].values() + \
        #                             self.conflict_neighborhood[zone]['approaching_ext'].values():
        #                         a_dist = zone.distance_from(agent.position['pos'], agent.position['road'])
        #                         # additional 2 second 'dwell' time for minor road
        #                         if self.neighborhood['front']:
        #                             self._dwell_tag = True
        #                         if self._dwell_tag and conf_rank == 'minor':
        #                             # multiply by 4 to accomodate dt
        #                             if self._dwell < (const.DWELL_TIME * 4):
        #                                 self._dwell += const.DT
        #                                 acc_u.append(0.0)
        #                             else:
        #                                 self._dwell = 0.0
        #                                 self._dwell_tag = False
        #                         safely_proceed_list.append(conflict_helper.can_proceed(
        #                             perceiver=dict(acc=target_acc,
        #                                            amax=self.acc_max,
        #                                            vel=self.vel,
        #                                            entrydist=entrydist,
        #                                            exitdist=exitdist,
        #                                            length=self.length,
        #                                            priority=conf_rank,
        #                                            t_gap=self.critical_gap),
        #                             neighbor=dict(acc=agent.acc,
        #                                           amax=agent.acc_max,
        #                                           vel=agent.vel,
        #                                           entrydist=a_dist['entry'],
        #                                           exitdist=a_dist['exit'],
        #                                           length=agent.length,
        #                                           priority=agent.position['road'].priority)))
        #
        #                     if False in safely_proceed_list:
        #                         acc_u.append(movement_models.car_following(
        #                             self.vel, vel_max, self.acc_max, self.dec_max, 0.0, entrydist,
        #                             safe_time_headway=self.safe_time_headway))
        #                         self.q_d += 1
        #                         # self.q_d = self.q_d + 3
        #
        #         else:  # atop
        #             if len(self.conflict_neighborhood[zone]['atop']) > 0:  # atop is not clear
        #                     for agent in self.conflict_neighborhood[zone]['atop'].values():
        #                         if agent.vel > self.vel:
        #                             acc_u.append(
        #                                 movement_models.car_following(self.vel, vel_max, self.acc_max, self.dec_max,
        #                                                               0.0, 0.01,
        #                                                               safe_time_headway=self.safe_time_headway))
        #         acc_t = min(acc_u)
        #
        #     acc_list.append(acc_t)

        if self.conflict_zones:
            self.fire('intention_enter', road=self.conflict_zones[0]['road'], group=self.conflict_zones[0]['confgroup'],
                      gap=self.neighborhood['gap_front'])

            if self.conflict_zones[0]['locked']:
                entrydist = self.conflict_zones[0]['entrydist']
                acc = movement_models.car_following(self.vel, vel_max, self.acc_max, self.dec_max, 0.0, entrydist)
                acc_list.append(acc)
            else:
                if self.conflict_zones[0]['entrydist'] == 0.0:
                    if self.conflict_zones[0]['exitdist'] <= 2.0:
                        self.fire('intention_exit', road=self.conflict_zones[0]['road'],
                                  group=self.conflict_zones[0]['confgroup'])

        return min(acc_list)

    @abstractmethod
    def react_to_bus_terminal(self, label, entrydist, exitdist, mean, std_dev, acc_t):
        pass

    def __repr__(self):
        return '%s #%s' % (self.type, self.id)

    def __del__(self):
        self.neighborhood = None
        self.route = None
        self.controls = None
        self.controls_restriction = None
        self.position = None
        self.fire('destroy')


class AgentManager(signal.Signal):
    """Manages agents; extends the Signal class"""

    events = ['new_agent', 'kill_agent', 'move_agent', 'update_agent']

    def __init__(self):
        self.agents = weakref.WeakKeyDictionary()
        self._road_index = collections.defaultdict(list)
        self.actual_clock = signal.Clock(int(const.DT * 1000), dt_coarse=1000)

        self.DTA_results = {"time": collections.defaultdict(list), "speed": collections.defaultdict(list)}
        self.route_time_arr = collections.defaultdict(list)

        self.correct_decisions = 0
        self.incorrect_decisions = 0

    def step(self):
        current = []
        data = []
        self.actual_clock.next()

        for agent in list(self.agents):
            agent.update_side()

        for agent in list(self.agents):
            agent.update_acc()

        for agent in list(self.agents):
            agent.update_front()

        for agent in list(self.agents):
            # data.append({'id': int(agent.id, 16), 'road': agent.position['road'].label, 'type': agent.type,
            #              'pos': agent.position['pos'], 'lane': agent.position['lane'], 'lc_delay': agent._lc_delay,
            #              'lc_dest_dir': agent._lc_dest_dir, 'lc_state': agent.lc_state})
            data.append({'id': int(agent.id, 16), 'road': agent.position['road'].label, 'type': agent.type,
                         'pos': agent.position['pos'], 'lane': agent.position['lane'], 'lc_delay': agent._lc_delay,
                         'lc_dest_dir': agent._lc_dest_dir})
            current.append(agent.position)

        return data

    def add_agent(self, agent, road, pos, lane):
        if agent in self.agents.keys():
            raise KeyError

        self.agents[agent] = (road, pos, lane)
        self._road_index[road].append(agent)
        self.fire('new_agent', agent=agent, road=road)

    def remove_agent(self, agent):
        if agent not in self.agents.keys():
            raise KeyError

        road, _, _ = self.agents[agent]
        self._road_index[road].remove(agent)

        del self.agents[agent]
        self.fire('kill_agent', agent=agent, road=road, time=agent.call_counts() * const.DT)

    def update_agent(self, agent, road, pos, lane):
        old_road, _, _ = self.agents[agent]

        if old_road != road:
            self._road_index[old_road].remove(agent)
            self._road_index[road].append(agent)
            self.fire('move_agent', agent=agent, old_road=old_road, road=road, time=agent.call_counts() * const.DT)
        self.agents[agent] = (road, pos, lane)
        self.fire('update_agent', agent=agent, road=road, pos=pos, time=agent.call_counts() * const.DT)

    def members(self, road, start=0, end=None, lane=None):
        members = list(self._road_index[road])

        if start or end is not None:
            end = road.length if end is None else end
            assert start <= end
            members = [agent for agent in members if self._filter_within(agent, road, start, end, lane)]
        return members

    def _filter_within(self, agent, road, start, end, lane):
        road_, pos, lane_ = self.agents[agent]

        if road_ == road:
            same_lane = True
            if lane is not None:
                same_lane = lane == lane_
            rear = pos - config.to_px(agent.length)
            return ((start <= pos <= end or start <= rear <= end) or (rear <= start <= pos and rear <= end <= pos))\
                and same_lane
        return False


def compute_ssd(velocity, grav=const.G, friction=const.F, perc_time=const.PRT, min_ssd=const.MIN_SIGHT_DIST):
    """
    Stopping sight distance (SSD) is a near worst-case distance a vehicle driver needs to be able to see in order
    have room to stop before colliding with an object ahead of the road.

    SSD is composed of the following:
    (1) Perception-Reaction Distance
         - the distance it takes for a road user to realize that a reaction is needed due to a road condition
         - equal to agent's velocity (in m/s) times the perception-reaction time (2.5 seconds)
    (2) Braking Distance
        - the distance it takes to complete the maneuver (braking)
        - equal to agent's velocity  (in m/s) divided by the product of twice the weight force acceleration
            due to gravity (19.6 m/s^2) and coefficient of friction between car tires and asphalt roads

    :param velocity: Velocity of sensing agent in m/s
    :param grav: Gravitational acceleration in m/s^2
    :param friction: Friction coefficient between car tires and road
    :param perc_time: Perception time in sec
    :param min_ssd: Minimum SSD in meters

    :return: SSD of the sensing agent in METERS. Minimum of 15.0 meters
    """
    braking_dist = velocity ** 2 / (grav * 2.0 * friction)
    perception_reaction_dist = velocity * perc_time
    ssd = braking_dist + perception_reaction_dist

    ssd = max(min_ssd, ssd)  # in m

    return ssd
