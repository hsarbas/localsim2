from localsim.models.infra.road.road import InterruptedRoad, UninterruptedRoad
from localsim.utils import containers
import const
import localsim
import exceptions
import collections
from localsim.models.infra.control import concrete as con
import weakref
from localsim.utils import tools
from random import choice
from localsim import sim_settings as simcfg
import base

config = localsim.conf()


class Actuator(object):
    """Given an agent and the agent manager, determines the agent's next action, considering routing and laning."""

    def __init__(self, agent, agent_manager):
        self._agent = weakref.ref(agent)
        self._agent_manager = weakref.ref(agent_manager)

    @property
    def agent(self):
        return self._agent()

    @property
    def agent_manager(self):
        return self._agent_manager()

    def act(self, acc=None, dlane=None, destination=None):
        road, pos, lane = self.agent_manager.agents[self.agent]

        if dlane is not None:
            if dlane != const.THROUGH:
                self.agent_manager.update_agent(self.agent, road, pos, lane + dlane)
                return True
            return False
        elif acc is not None:
            vel_new = round(self.agent.vel + acc * const.DT, 2)

            if vel_new >= 0.0:
                self.agent.vel = min(vel_new, self.agent.effective_vel_max)
                self.agent.acc = min(acc, self.agent.acc_max)
            else:
                self.agent.vel = 0.0
                self.agent.acc = 0.0

            return True
        else:
            new_pos = round(pos + config.to_px(self.agent.vel * const.DT), 2)
            new_lane = lane
            if new_pos > road.length:
                new_pos -= road.length

                if isinstance(road, InterruptedRoad):
                    new_lane = road.out_matrix[lane]
                elif isinstance(destination, InterruptedRoad):
                    if lane in destination.in_matrix:
                        new_lane = destination.in_matrix[lane]
                    else:
                        ins = destination.in_matrix.keys()
                        in_diff = [abs(i - lane) for i in ins]
                        l = ins[in_diff.index(min(in_diff))]
                        new_lane = destination.in_matrix[l]

                    self.agent.gridlock_row = False
                else:
                    if self.agent.sensor.scene.routes.get(road) is None:

                        if self.agent.sensor.scene.routing_mode == const.DYNAMIC_ROUTING:
                            self.agent.sensor.update_route_list(None, "exit")
                            self.agent_manager.route_time_arr[tuple(self.agent.route_taken)].append(
                                self.agent.call_counts() * const.DT)

                        self.agent_manager.remove_agent(self.agent)
                        return False
                    else:
                        raise exceptions.CannotActCorrectLyException('Missed route. Possibly driving impossibly fast.')

                road = destination
            self.agent_manager.update_agent(self.agent, road, new_pos, new_lane)
            return True


class Sensor(object):
    def __init__(self, agent, agent_manager, scene_):
        self._agent = weakref.ref(agent)
        self._agent_manager = weakref.ref(agent_manager)
        self._scene = weakref.ref(scene_)
        self._curr_route = None
        self._dest_iroad = None

        self._known_routes = agent.route_list
        self.route_finalized = False

        self.correct_decide = 0
        self.incorrect_decide = 0

    def route_list(self):
        return self._known_routes

    @property
    def agent(self):
        return self._agent()

    @property
    def agent_manager(self):
        return self._agent_manager()

    @property
    def scene(self):
        return self._scene()

    def perceive_road(self, raw=True):
        location = self.agent_manager.agents[self.agent]

        if location is None:
            raise exceptions.CannotPerceiveCorrectlyException

        road, pos, lane = location
        road_length = road.length
        pos_rear = pos - config.to_px(self.agent.length)

        if not raw:
            pos = config.to_m(pos)
            road_length = config.to_m(road_length)
            pos_rear = config.to_m(pos_rear)
        return road, pos, lane, pos_rear, road_length

    def perceive_route(self):
        road, pos, lane = self.agent_manager.agents[self.agent]

        if self._curr_route is None:
            if isinstance(road, UninterruptedRoad):
                route = self.scene.routes[road]

                if route:
                    self._curr_route = route
                    self._dest_iroad = None
                else:
                    return None
            else:
                raise exceptions.MissingRouteError

        # Get triggers for the given route
        ret = self._curr_route.trigger(road, pos, self._dest_iroad)

        if ret:
            if ret['type'] in ['onset', 'emergency_stop']:
                if self._dest_iroad is None or not self.route_finalized:
                    if ret['type'] != 'emergency_stop':
                        self._dest_iroad = self.delegate_next_road(self.scene.routing_mode,
                                                                   simcfg.ROUTE_SELECTION_CRITERIA)

                    elif ret['type'] in ['emergency_stop']:
                        self._dest_iroad = self.delegate_next_road(self.scene.routing_mode,
                                                                   simcfg.ROUTE_SELECTION_CRITERIA, penalty=True)
                        assert self._dest_iroad is not None

                        self.route_finalized = True
                        if self.scene.routing_mode == const.DYNAMIC_ROUTING:
                            self.update_route_list(self._dest_iroad.label, "non-exit")

                ret['destination'] = self._dest_iroad
                ret['allowed_lanes'] = self._dest_iroad.in_matrix.keys()
                # ret['estop_dist'] = config.to_m(ret['estop_dist'])
                ins = self._dest_iroad.in_matrix.keys()
                lanes_to_cross = min([abs(i - lane) for i in ins])
                ret['estop_dist'] = round(max(0.0, (config.to_m(road.length) - config.to_m(pos) -
                                                    self.agent.length - self.agent.safe_gap) *
                                              lanes_to_cross - self.agent.safe_gap * 0.5 * lanes_to_cross), 2)
            elif ret['type'] == 'offset':
                ret['allowed_lanes'] = self._dest_iroad.out_matrix.values()
            elif ret['type'] == 'proper':
                ret['destination'] = self._dest_iroad.dst_road
            else:
                raise exceptions.CannotPerceiveCorrectlyException
            return ret

        else:
            self._curr_route = None
            self._dest_iroad = None
            self.route_finalized = False
            return None

    @staticmethod
    def _select_neighbor(agent, my_pos, pos, dir_lat, neighbor, gap_front, gap_back):
        if dir_lat == const.THROUGH:
            if pos > my_pos:
                if neighbor['gap_front'] > gap_front:
                    neighbor['front'] = agent
                    neighbor['gap_front'] = gap_front
            elif pos < my_pos:
                if neighbor['gap_back'] > gap_back:
                    neighbor['back'] = agent
                    neighbor['gap_back'] = gap_back
        elif dir_lat in [const.LEFT, const.RIGHT]:
            prefix = 'left' if dir_lat == const.LEFT else 'right'

            if pos > my_pos:
                if neighbor['gap_%s_lead' % prefix] > gap_front:
                    neighbor['%s_lead' % prefix] = agent
                    neighbor['gap_%s_lead' % prefix] = gap_front
            elif pos <= my_pos:
                if neighbor['gap_%s_lag' % prefix] > gap_back:
                    neighbor['%s_lag' % prefix] = agent
                    neighbor['gap_%s_lag' % prefix] = gap_back

    def perceive_neighborhood(self):
        my_road, my_pos, my_lane = self.agent_manager.agents[self.agent]

        ssd_front, ssd_back, ssd_lat = self.agent.sight_distance, 2 * self.agent.length, 1

        neighborhood = dict(front=None, gap_front=const.LARGE_NUMBER,
                            left_lead=None, gap_left_lead=const.LARGE_NUMBER,
                            right_lead=None, gap_right_lead=const.LARGE_NUMBER,
                            back=None, gap_back=const.LARGE_NUMBER,
                            left_lag=None, gap_left_lag=const.LARGE_NUMBER,
                            right_lag=None, gap_right_lag=const.LARGE_NUMBER)

        front_reach = my_pos + config.to_px(ssd_front)
        back_reach = my_pos - config.to_px(ssd_back)

        section = self.agent_manager.members(my_road, start=back_reach,
                                             end=front_reach if front_reach <= my_road.length else my_road.length)
        section.remove(self.agent)
        my_pos = config.to_m(my_pos)

        for agent in section:
            road, pos, lane = self.agent_manager.agents[agent]
            pos = config.to_m(pos)
            dir_ = lane - my_lane

            gap_front = round(pos - agent.length - my_pos, 2)
            gap_back = round(my_pos - self.agent.length - pos, 2)

            self._select_neighbor(agent, my_pos, pos, dir_, neighborhood, gap_front, gap_back)

        if front_reach > my_road.length and self._dest_iroad:
            if my_road != self._dest_iroad:
                section = self.agent_manager.members(self._dest_iroad, start=0.0, end=front_reach - my_road.length)
                lane_matrix = self._dest_iroad.in_matrix
            else:
                section = self.agent_manager.members(self._dest_iroad.dst_road, start=0.0,
                                                     end=front_reach - my_road.length)
                lane_matrix = self._dest_iroad.out_matrix

            for agent in section:
                road, pos, lane = self.agent_manager.agents[agent]
                pos = config.to_m(pos)
                if my_lane in lane_matrix:
                    dir_ = lane - lane_matrix[my_lane]

                    my_pos_adj = -(config.to_m(my_road.length) - my_pos)
                    gap_front = round((pos - agent.length) - my_pos_adj, 2)
                    self._select_neighbor(agent, my_pos_adj, pos, dir_, neighborhood, gap_front, 10000.0)
                else:
                    dists = [abs(my_lane - alane) for alane in self.agent.route['allowed_lanes']]
                    nearest_allowed = self.agent.route['allowed_lanes'][dists.index(min(dists))]
                    min_dist = nearest_allowed - my_lane

                    if abs(min_dist) == 1:
                        dir_ = lane - lane_matrix[my_lane + min_dist] + min_dist

                        my_pos_adj = -(config.to_m(my_road.length) - my_pos)
                        gap_front = round((pos - agent.length) - my_pos_adj, 2)
                        self._select_neighbor(agent, my_pos_adj, pos, dir_, neighborhood, gap_front, 10000.0)

        if back_reach < 0.0:
            if isinstance(my_road, UninterruptedRoad):
                roads = self.scene.entries(my_road)
                mtx = None
            else:
                roads = [self._dest_iroad.src_road]
                mtx = self._dest_iroad.in_matrix

            for entry_road in roads:
                section = self.agent_manager.members(entry_road, start=entry_road.length + back_reach)
                lane_matrix = mtx or entry_road.out_matrix

                for agent in section:
                    road, pos, lane = self.agent_manager.agents[agent]
                    pos = config.to_m(pos)

                    if lane in lane_matrix:
                        dir_ = lane_matrix[lane] - my_lane
                        gap_back = round((my_pos - self.agent.length) + (config.to_m(entry_road.length) - pos), 2)

                        my_pos_adj = config.to_m(road.length) + my_pos
                        self._select_neighbor(agent, my_pos_adj, pos, dir_, neighborhood, 10000.0, gap_back)

        return containers.SafeDict(*self.agent.__class__.__bases__, **neighborhood)

    def perceive_controls(self, lane):
        my_road, my_pos, _ = self.agent_manager.agents[self.agent]

        ssd_front = config.to_px(self.agent.sight_distance)
        controls = filter(None, [control.trigger(my_pos, lane, ssd_front) for control in
                                 self.scene.controls.get(my_road, [])])

        front_ext = my_pos + ssd_front - my_road.length
        ext = my_pos - my_road.length

        if front_ext > 0.0 and self._dest_iroad:
            is_uroad = my_road.__class__ == UninterruptedRoad
            is_iroad = my_road.__class__ == InterruptedRoad

            if is_uroad and lane in self._dest_iroad.in_matrix:
                controls += filter(None, (control.trigger(ext, self._dest_iroad.in_matrix[lane], front_ext)
                                          for control in self.scene.controls.get(self._dest_iroad, [])))
            elif is_iroad and lane in my_road.out_matrix:
                controls += filter(None, (control.trigger(ext, my_road.out_matrix[lane], front_ext)
                                          for control in self.scene.controls.get(self._dest_iroad.dst_road, [])))

        for control in controls:
            control['entrydist'] = config.to_m(control['entrydist'])
            if control['type'] == 'BusTerminalZone':
                control['exitdist'] = config.to_m(control['exitdist'])

        return controls

    def perceive_controls_restriction(self):
        my_road, my_pos, _ = self.agent_manager.agents[self.agent]
        types = (con.TypeRestrictionZone, con.BusTerminalZone, con.StopLight, con.Stop, con.SpeedLimitZone)

        ssd_front = config.to_px(self.agent.sight_distance)
        controls = []

        for lane in range(my_road.lanes):
            controls += filter(None, [control.trigger(my_pos, lane, ssd_front) for control in
                                      self.scene.controls.get(my_road, []) if isinstance(control, types)])
        front_ext = my_pos + ssd_front - my_road.length
        ext = my_pos - my_road.length

        if front_ext > 0.0 and self._dest_iroad:
            is_uroad = my_road.__class__ == UninterruptedRoad
            is_iroad = my_road.__class__ == InterruptedRoad

            for lane in range(my_road.lanes):
                if is_uroad and lane in self._dest_iroad.in_matrix:
                    controls += filter(None, [control.trigger(ext, self._dest_iroad.in_matrix[lane], front_ext)
                                              for control in self.scene.controls.get(self._dest_iroad, [])
                                              if isinstance(control, types)])
                elif is_iroad and lane in my_road.out_matrix:
                    controls += filter(None, [control.trigger(ext, my_road.out_matrix[lane], front_ext)
                                              for control in self.scene.controls.get(self._dest_iroad.dst_road, [])
                                              if isinstance(control, types)])

        for control in controls:
            control['entrydist'] = config.to_m(control['entrydist'])

        return controls

    def perceive_conflict_zones(self, lane):
        my_road, my_pos, _ = self.agent_manager.agents[self.agent]

        ssd_front = config.to_px(self.agent.sight_distance)
        # conflict_zones = []
        # for confzone in self.scene.conflict_zones[my_road]:
        #     if confzone:
        #         conflict_zones.append(confzone.trigger(my_pos, lane, ssd_front, self.agent.length))

        conflict_zones = filter(None, [confzone.trigger(my_pos, lane, ssd_front, self.agent.length)
                                       for confzone in self.scene.conflict_zones[my_road]])

        front_ext = my_pos + ssd_front - my_road.length
        ext = my_pos - my_road.length

        if front_ext > 0.0 and self._dest_iroad:
            is_uroad = my_road.__class__ == UninterruptedRoad
            is_iroad = my_road.__class__ == InterruptedRoad

            if is_uroad and lane in self._dest_iroad.in_matrix:
                conflict_zones += filter(None, (confzone.trigger(ext, self._dest_iroad.in_matrix[lane], front_ext,
                                                                 self.agent.length)
                                                for confzone in self.scene.conflict_zones[self._dest_iroad]))
            elif is_iroad and lane in my_road.out_matrix:
                conflict_zones += filter(None, (confzone.trigger(ext, my_road.out_matrix[lane], front_ext,
                                                                 self.agent.length)
                                                for confzone in self.scene.conflict_zones[self._dest_iroad.dst_road]))

        for confzone in conflict_zones:
            confzone['entrydist'] = config.to_m(confzone['entrydist'])
            confzone['exitdist'] = config.to_m(confzone['exitdist'])

        return conflict_zones

    # def perceive_conflict_zones(self, lane):
    #     my_road, my_pos, my_lane = self.agent_manager.agents[self.agent]
    #     ssd_front = config.to_px(self.agent.sight_distance)
    #
    #     front_ext = my_pos + ssd_front - my_road.length
    #     ext = my_pos - my_road.length
    #     zones = self.scene.conflict_zones
    #
    #     conflict_zone = None
    #     print 'sensor road:', self._dest_iroad
    #
    #     if isinstance(my_road, UninterruptedRoad):
    #         try:
    #             # conflict_zone = zones[self._dest_iroad][0].trigger(ext, self._dest_iroad.in_matrix[lane], front_ext,
    #             #                                                    self.agent.length)
    #             conflict_zone = zones[self._dest_iroad][0]
    #
    #         except IndexError:
    #             pass
    #
    #     elif isinstance(my_road, InterruptedRoad):
    #         try:
    #             # conflict_zone = zones[my_road][0].trigger(ext, my_lane, front_ext, self.agent.length)
    #             conflict_zone = zones[my_road][0]
    #
    #         except IndexError:
    #             pass
    #
    #     # print 'sensor:', conflict_zone
    #     return conflict_zone

    def perceive_conflict_neighborhood(self, curr_conflict):
        if curr_conflict:
            conflict_group = curr_conflict[0]['confgroup']
            _conflict_to_be_removed = self.scene.get_confzone_by_id(curr_conflict[0]['id'])

            conflict_neighborhood = self.scene.get_confzones_by_confgroup(conflict_group)
            if _conflict_to_be_removed in conflict_neighborhood:
                conflict_neighborhood.remove(_conflict_to_be_removed)

            return conflict_neighborhood

        else:
            return None

    # def perceive_conflict_neighborhood(self, my_conflict_zones):
    #     my_road, my_pos, _ = self.agent_manager.agents[self.agent]
    #     conf_neighborhood = collections.defaultdict(lambda: collections.defaultdict())
    #
    #     if my_conflict_zones:
    #         for my_zone in my_conflict_zones:
    #             all_zones = [self.scene.conflict_zones[road]
    #                          for road in [road for road in self.scene.conflict_zones.keys()
    #                                       if len(self.scene.conflict_zones[road]) > 0 and (road != my_zone['road'])]]
    #
    #             other_zones = [all_zones[i][j] for i in range(0, len(all_zones)) for j in range(0, len(all_zones[i]))
    #                            if len(set(all_zones[i][j].conflict_group) & set(my_zone['confgroup'])) > 0]
    #
    #             for zone in other_zones:
    #                 ssd_front = config.to_px(base.compute_ssd(zone.road.speed_limit))  # search area
    #                 conf_neighborhood[zone]['entry_pos'] = config.to_m(zone.pos)
    #                 conf_neighborhood[zone]['exit_pos'] = config.to_m(zone.exit)
    #                 conf_neighborhood[zone]['approaching'] = \
    #                     [i for row in [
    #                         self.agent_manager.members(zone.road, start=max(zone.pos - ssd_front, 0), end=zone.pos,
    #                                                    lane=lane)
    #                         for lane in zone.lanes_affected] for i in row]  # flatten the list
    #                 conf_neighborhood[zone]['approaching'] = containers.SafeDict(*self.agent.__class__.__bases__,
    #                                                                              **{str(i): agent for i, agent
    #                                                                                 in enumerate(
    #                                                                                  conf_neighborhood[zone][
    #                                                                                      'approaching'])})
    #
    #                 conf_neighborhood[zone]['approaching_ext'] = containers.SafeDict(None, None)
    #                 conf_neighborhood[zone]['atop'] = \
    #                     [i for row in [self.agent_manager.members(zone.road, start=zone.pos, end=zone.exit,
    #                                                               lane=lane) for lane in zone.lanes_affected] for i in
    #                      row]
    #                 # flatten the list
    #                 conf_neighborhood[zone]['atop'] = containers.SafeDict(*self.agent.__class__.__bases__,
    #                                                                       **{str(i): agent for i, agent in enumerate(
    #                                                                           conf_neighborhood[zone][
    #                                                                               'atop'])})
    #
    #                 if ssd_front > zone.pos:
    #                     conf_neighborhood[zone]['approaching_ext'] = \
    #                         [i for row in [self.agent_manager.members(zone.road.src_road,
    #                                                                   start=zone.road.src_road.length - (
    #                                                                     ssd_front - zone.pos),
    #                                                                   end=zone.road.src_road.length, lane=lane)
    #                                        for lane in zone.lanes_affected] for i in row]
    #                     conf_neighborhood[zone]['approaching_ext'] = containers.SafeDict(
    #                         *self.agent.__class__.__bases__,
    #                         **{str(i): agent for i, agent in enumerate(
    #                             conf_neighborhood[zone][
    #                                 'approaching_ext'])})
    #         return conf_neighborhood
    #     return None

    def delegate_next_road(self, mode, criteria, penalty=False):

        if mode == const.STATIC_ROUTING:
            next_link = self.scene.get_road_by_label((self._curr_route.find_destination(self.agent.type)))
            return next_link

        elif mode == const.DYNAMIC_ROUTING:

            # Second line removes duplicates from a list whilst preserving order
            next_links = [route[1] for route in self._known_routes]
            next_links = list(collections.OrderedDict.fromkeys(next_links))

            # Case 1: Only 1 next link. No alternate routes
            if len(next_links) == 1:
                return self.scene.get_road_by_label(next_links[0])

            # Build the array that tracks the number of cars in each lane
            # Build the array that builds the travel time for each lane
            count_array = []
            travel_time_array = []
            for next_link in next_links:
                next_road = self.scene.get_road_by_label(next_link)
                # Get next merge
                next_merge = tools.find_next_merge(self._known_routes)
                road_length_inpx = tools.get_total_length(next_link, next_merge, self._known_routes, self.scene)
                road_length = config.to_m(road_length_inpx)
                cars_in_link = self.agent_manager.members(next_road, start=0,
                                                          end=min(next_road.length, const.MIN_SIGHT_DIST))
                #                cars_in_link = self.agent_manager.members(next_road)
                count_array.append(len(cars_in_link))

                if len(cars_in_link) == 0:
                    travel_time_array.append(road_length / min(80.0, next_road.speed_limit))
                elif len(cars_in_link) > 0:
                    # Finding average speed. Inelegant
                    ave_vel = tools.average([car.vel for car in cars_in_link])
                    travel_time_array.append(
                        road_length / min(max(ave_vel, const.ALMOST_STOP), next_road.speed_limit))

            # Code for penalizing routes that require an agent to make "massive leap"
            if penalty:
                for i in range(len(next_links)):
                    next_road = self.scene.get_road_by_label(next_links[i])
                    if self.agent.position["lane"] not in next_road.in_matrix.keys():
                        travel_time_array[i] *= 2.5  # penalty factor

            # Since lower travel time is better, then use reciprocals for weights
            inv_travel_time_array = [1 / time for time in travel_time_array]

            # Case 2: When default route ties with other route, pick the default route
            # Case 3: If all roads are empty, pick the default route
            if max(inv_travel_time_array) == inv_travel_time_array[0] or sum(count_array) == 0:

                if penalty:
                    if next_links[travel_time_array.index(min(travel_time_array))] == next_links[0]:
                        self.correct_decide += 1
                    else:
                        self.incorrect_decide += 1
                return self.scene.get_road_by_label(next_links[0])

            # Normalize values
            inv_travel_time_array_norm = [weight / sum(inv_travel_time_array) for weight in inv_travel_time_array]

            # Next link selection (probabilistic OR max or inv_trav_time_array_norm)
            if criteria == "probabilistic":
                new_next_link = choice(next_links, 1, True, inv_travel_time_array_norm)
                new_next_link = new_next_link[0]
            elif criteria == "DUO":
                # Pick the route with highest weight.
                new_next_link = next_links[inv_travel_time_array_norm.index(max(inv_travel_time_array_norm))]
            else:
                print "invalid criteria"

            if penalty:
                if next_links[travel_time_array.index(min(travel_time_array))] == new_next_link:
                    self.correct_decide += 1
                else:
                    self.incorrect_decide += 1

            return self.scene.get_road_by_label(new_next_link)

        else:
            print "Invalid mode!"

    def update_route_list(self, next_link, mode):
        if mode == "non-exit":
            # Remove all routes from the choice set whose next link is not the one chosen
            new_route = [route for route in self._known_routes if route[1] == next_link]
            self.agent.route_taken.append(self._known_routes[0][0])
            self.agent.route_taken.append(str(next_link))

            # For each route in the choice set, remove the first two elements.
            new_route = [route[2:] for route in new_route]
            self.set_known_routes(new_route)

        elif mode == "exit":
            # Update the link history of the agent
            self.agent.route_taken.append(self._known_routes[0][0])

            self.agent_manager.correct_decisions += self.correct_decide
            self.agent_manager.incorrect_decisions += self.incorrect_decide

        else:
            print "Invalid mode."

    def set_known_routes(self, new_route):
        self._known_routes = new_route
