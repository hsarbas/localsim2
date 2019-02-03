import collections
import os
import zipfile
import weakref
import localsim

from localsim.serialization import codec, serial_cache, purge_cache
from localsim.serialization import deserialize as _deserialize
from localsim.serialization import serialize as _serialize
from localsim.utils import tools
from localsim.models.infra.road import road as _road
from localsim.models.meta import traffic
from localsim.models.agent import const
from localsim.analysis import matrices

config = localsim.conf()

_tmp_dir = 'tmp'
_tmp_files = dict(
    node=os.path.join(_tmp_dir, 'node.json'),
    control=os.path.join(_tmp_dir, 'control.json'),
    uroad=os.path.join(_tmp_dir, 'uroad.json'),
    iroad=os.path.join(_tmp_dir, 'iroad.json'),
    route=os.path.join(_tmp_dir, 'route.json'),
    data=os.path.join(_tmp_dir, 'data.json'),
    config=os.path.join(_tmp_dir, 'config.json'),
    landmark=os.path.join(_tmp_dir, 'landmark.json'),
    dispatcher=os.path.join(_tmp_dir, 'dispatcher.json'),
    surveyor=os.path.join(_tmp_dir, 'surveyor.json'),
    conflict_zone=os.path.join(_tmp_dir, 'conflict_zone.json')
)


def _remove_tmp_files():
    for f in _tmp_files.values():
        try:
            os.remove(f)
        except OSError as e:
            print 'Removing tmp files error:', e


def serialize(scene_obj, filename):
    zip_file = zipfile.ZipFile(filename, 'w')

    _serialize(scene_obj.iroads, codec.JSONEncoder, _tmp_files['iroad'], cached=True)
    zip_file.write(_tmp_files['iroad'])

    _serialize(scene_obj.uroads, codec.JSONEncoder, _tmp_files['uroad'], cached=True)
    zip_file.write(_tmp_files['uroad'])

    _serialize(scene_obj.landmarks, codec.JSONEncoder, _tmp_files['landmark'], cached=True)
    zip_file.write(_tmp_files['landmark'])

    _serialize(
        [r for r in scene_obj.dispatcher.values() if r], codec.JSONEncoder, _tmp_files['dispatcher'], cached=False)
    zip_file.write(_tmp_files['dispatcher'])

    _serialize(
        [c for c_list in scene_obj.controls.values() for c in c_list],
        codec.JSONEncoder, _tmp_files['control'], cached=False
    )
    zip_file.write(_tmp_files['control'])

    _serialize(scene_obj.surveyors, codec.JSONEncoder, _tmp_files['surveyor'], cached=True)
    zip_file.write(_tmp_files['surveyor'])

    _serialize(
        [cz for cz_list in scene_obj.conflict_zones.values() for cz in cz_list],
        codec.JSONEncoder, _tmp_files['conflict_zone'], cached=False
    )
    zip_file.write(_tmp_files['conflict_zone'])

    _serialize(
        [r for r in scene_obj.routes.values() if r], codec.JSONEncoder, _tmp_files['route'], cached=False)
    zip_file.write(_tmp_files['route'])

    _serialize(
        [d for d in serial_cache() if isinstance(d, matrices.ObservationMatrix)],
        codec.JSONEncoder, _tmp_files['data'], cached=False
    )
    zip_file.write(_tmp_files['data'])

    from infra.road import node
    nodes = [n for n in serial_cache() if isinstance(n, node.Node)]
    _serialize(nodes, codec.JSONEncoder, _tmp_files['node'], cached=False)
    zip_file.write(_tmp_files['node'])

    _serialize([localsim.conf()], codec.JSONEncoder, _tmp_files['config'], cached=False)
    zip_file.write(_tmp_files['config'])

    purge_cache()
    _remove_tmp_files()


def deserialize(filename, scene):
    """Lone method to deserialize JSON file into a Scene object"""

    zip_file = zipfile.ZipFile(filename)
    zip_file.extractall()

    _deserialize(codec.JSONDecoder, _tmp_files['node'], cached=True)
    _deserialize(codec.JSONDecoder, _tmp_files['data'], cached=False)
    uroads = _deserialize(codec.JSONDecoder, _tmp_files['uroad'], cached=True)
    iroads = _deserialize(codec.JSONDecoder, _tmp_files['iroad'], cached=True)
    landmarks = _deserialize(codec.JSONDecoder, _tmp_files['landmark'])
    dispatchers = _deserialize(codec.JSONDecoder, _tmp_files['dispatcher'], cached=False)
    controls = _deserialize(codec.JSONDecoder, _tmp_files['control'], cached=False)
    routes = _deserialize(codec.JSONDecoder, _tmp_files['route'], cached=False)
    surveyors = _deserialize(codec.JSONDecoder, _tmp_files['surveyor'], cached=False)
    conflict_zones = _deserialize(codec.JSONDecoder, _tmp_files['conflict_zone'], cached=False)

    # set cached to True for signalized control
    try:
        config_data = _deserialize(codec.JSONDecoder, _tmp_files['config'], cached=False)
        config = localsim.conf()
        config.px2m_factor = config_data[0].px2m_factor

        config.desired_velocity = config_data[0].desired_velocity or const.VEL_DES
        config.minimum_headway = config_data[0].minimum_headway or const.MIN_GAP_V0
        config.safe_time_headway = config_data[0].safe_time_headway or const.SAFE_TIME_HEADWAY

        config.acceleration_threshold = config_data[0].acceleration_threshold or const.A_THRESH
        config.politeness_factor = config_data[0].politeness_factor or const.P
        config.safe_braking_deceleration = config_data[0].safe_braking_deceleration or const.B_SAFE

    except IOError:
        print 'Invalid read'
        
    for uroad in uroads:
        scene.add_road(uroad)
    for iroad in iroads:
        scene.add_road(iroad)
    for dispatcher in dispatchers:
        scene.add_dispatcher(dispatcher)
    for control in controls:
        scene.add_control(control)
    for route in routes:
        scene.add_route(route)
    for landmark in landmarks:
        scene.add_landmark(landmark)
    for survey in surveyors:
        scene.add_surveyor(survey)
    for conflict_zone in conflict_zones:
        scene.add_conflict_zone(conflict_zone)

    purge_cache()
    _remove_tmp_files()
    return scene


def x_deserialize(filename):
    zip_file = zipfile.ZipFile(filename)
    zip_file.extractall()


class Scene(object):
    """Scene object to represent the road map"""

    def __init__(self):
        self.iroads = []
        self.uroads = []
        self.landmarks = []
        self.surveyors = weakref.WeakKeyDictionary()
        self.controls = weakref.WeakKeyDictionary()
        self.conflict_zones = collections.defaultdict(list)
        self.controls = collections.defaultdict(list)
        self.routes = weakref.WeakKeyDictionary()
        self.dispatcher = weakref.WeakKeyDictionary()

        self._road_entries_index = collections.defaultdict(list)
        self._road_exits_index = collections.defaultdict(list)
        self._road_label_index = weakref.WeakValueDictionary()

        self._route_masterlist = []
        self._od_list = []
        self.route_distances = {}
        self.routing_mode = None

    @property
    def route_masterlist(self):
        return self._route_masterlist

    @route_masterlist.setter
    def route_masterlist(self, new_masterlist):
        self._route_masterlist = new_masterlist

    @property
    def od_list(self):
        return self._od_list

    @od_list.setter
    def od_list(self, new_od_list):
        self._od_list = new_od_list

    def entries(self, road):
        return list(self._road_entries_index[road])

    def add_dispatcher(self, dispatcher):
        self.dispatcher[dispatcher.uroad] = dispatcher

    def exits(self, road):
        return list(self._road_exits_index[road])

    def add_road(self, road):
        if isinstance(road, _road.UninterruptedRoad):
            if road not in self.uroads:
                self.uroads.append(road)
                self.routes[road] = None
                self.dispatcher[road] = traffic.Entry(road, {})

                assert road.label not in self._road_label_index
                self._road_label_index[road.label] = road

        elif isinstance(road, _road.InterruptedRoad):
            if road not in self.iroads:
                self.iroads.append(road)

                self._road_entries_index[road] = [road.src_road]
                self._road_exits_index[road] = [road.dst_road]

                self._road_entries_index[road.dst_road].append(road)
                self._road_exits_index[road.src_road].append(road)

                self.routes[road.src_road] = traffic.Route(road.src_road, self.exits(road.src_road))
                if road.dst_road in self.dispatcher:
                    del self.dispatcher[road.dst_road]

                assert road.label not in self._road_label_index
                self._road_label_index[road.label] = road

        else:
            raise TypeError

    def remove_road(self, road):
        if road in self.controls:
            del self.controls[road]

        if isinstance(road, _road.UninterruptedRoad):
            if road in self.uroads:
                for e in self.entries(road):
                    self.remove_road(e)
                for e in self.exits(road):
                    self.remove_road(e)
                self.uroads.remove(road)
                del self._road_entries_index[road]
                del self._road_exits_index[road]

        elif isinstance(road, _road.InterruptedRoad):
            if road in self.iroads:
                if road in self.controls:
                    self.controls.pop(road)
                if road in self.conflict_zones:
                    self.conflict_zones.pop(road)
                self.iroads.remove(road)

                del self._road_entries_index[road]
                del self._road_exits_index[road]
                self._road_entries_index[road.dst_road].remove(road)
                self._road_exits_index[road.src_road].remove(road)

                if len(self.exits(road.src_road)) > 0:
                    self.routes[road.src_road] = traffic.Route(road.src_road, self.exits(road.src_road))
                else:
                    self.routes[road.src_road] = None

                self.dispatcher[road.dst_road] = traffic.Entry(road.dst_road, {})
        else:
            raise TypeError

    def edit_uroad(self, road, values):
        if road in self.uroads:
            label, lanes, lane_width, limit, priority, type_, z_axis = values

            if lanes < road.lanes:
                for c in list(self.controls.get(road, [])):
                    if c.lane + 1 > lanes:
                        self.controls[road].remove(c)

                for e in self.entries(road):
                    for c in list(self.controls.get(e, [])):
                        if c.lane + 1 > lanes:
                            self.controls[e].remove(c)
                for e in self.exits(road):
                    for c in list(self.controls.get(e, [])):
                        if c.lane + 1 > lanes:
                            self.controls[e].remove(c)

            v = self._road_label_index[road.label]
            del self._road_label_index[road.label]

            road.label = label
            road.speed_limit = limit
            road.lanes = lanes
            road.lane_width = lane_width
            road.priority = priority
            road.type = type_
            road.z_axis = z_axis

            self._road_label_index[label] = v

    def edit_iroad(self, road, ilist, olist, values):
        if road in self.iroads:
            label, lane_width, limit, priority, type_, z_axis = values

            if road in self.controls:
                self.controls.pop(road)

            v = self._road_label_index[road.label]
            del self._road_label_index[road.label]

            road.label = label
            road.lane_width = lane_width
            road.speed_limit = limit
            road.lanes = len(ilist)
            road.edit_lane_match(ilist, olist)
            road.priority = priority
            road.type = type_
            road.z_axis = z_axis

            self._road_label_index[label] = v
            self.routes[road.src_road] = traffic.Route(road.src_road, self.exits(road.src_road))

    def road_names(self):
        return list(self._road_label_index.keys())

    def get_road_by_label(self, label):
        return self._road_label_index[label]

    def entry_roads(self):
        return [road for road in self.uroads if not self.entries(road)]

    def exit_roads(self):
        return [road for road in self.uroads if not self.exits(road)]

    def routable_roads(self):
        return list(set(road.src_road for road in self.iroads))

    def add_control(self, control):
        if control.road not in self.controls:
            self.controls[control.road] = []
        if control not in self.controls[control.road]:
            self.controls[control.road].append(control)

    def remove_control(self, control):
        for road in self.controls:
            if control in self.controls[road]:
                self.controls[road].remove(control)
                break

    def add_route(self, route):
        self.routes[route.uroad] = route

    def remove_route(self, route):
        for road in self.routes:
            if self.routes[road] == route:
                self.routes[road] = None
                break

    def add_surveyor(self, survey):
        if survey.road not in self.surveyors:
            self.surveyors[survey.road] = []
        if survey not in self.surveyors[survey.road]:
            self.surveyors[survey.road].append(survey)

    def remove_surveyor(self, survey):
        for road in self.surveyors:
            if survey in self.surveyors[road]:
                self.surveyors[road].remove(survey)
                break

    # newCA
    def add_conflict_zone(self, conflict_zone):
        if conflict_zone not in self.conflict_zones[conflict_zone.road]:
            self.conflict_zones[conflict_zone.road].append(conflict_zone)

    # newCA
    def remove_conflict_zone(self, conflict_zone):
        # for road in self.conflict_zones:
        #     for zone in self.conflict_zones[road]:
        #         print 'road: {}, conflict:{}'.format(zone.road.label, zone.conflict_group)
        # print '^ before remove'
        for road in self.conflict_zones:
            if conflict_zone in self.conflict_zones[road]:
                conf_ids = conflict_zone.conflict_group
                self.conflict_zones[road].remove(conflict_zone)
                break
        for road in self.conflict_zones:
            for zone in self.conflict_zones[road]:
                id_ = list(set(conf_ids).intersection(set(zone.conflict_group)))
                if id_:
                    zone.conflict_group.remove(id_[0])
        # for road in self.conflict_zones:
        #     for zone in self.conflict_zones[road]:
        #         print 'road: {}, conflict:{}'.format(zone.road.label, zone.conflict_group)
        # print 'nothing follows ====================================='

    def get_confzone_by_id(self, id_):
        marker = False
        zone = None
        for road in self.conflict_zones:
            for zone in self.conflict_zones[road]:
                if zone.id == id_:
                    marker = True
                    break
            if marker:
                break

        return zone

    def get_confzones_by_confgroup(self, confgroup):
        ret = []

        for conflict_zones in self.conflict_zones.values():
            for conflict_zone in conflict_zones:
                if confgroup in conflict_zone.conflict_group and conflict_zone not in ret:
                    ret.append(conflict_zone)

        return ret

    def add_landmark(self, landmark):
        if landmark not in self.landmarks:
            self.landmarks.append(landmark)

    def remove_landmark(self, landmark):
        if landmark in self.landmarks:
            self.landmarks.remove(landmark)

    @staticmethod
    def activate_collectors(zones):
        for zone in zones:
            zone().active = True

    def __del__(self):
        print 'scene deleting...'

    @staticmethod
    def locate_global(road, pos, lane):
        # assert road.length >= pos and road.lanes >= lane
        # for strip-based, float(strip)/strip_per_lane. lane param may take float value

        # Get segment where the agent is located, if possible

        if road.__class__.__name__ == 'InterruptedRoad':

            in_side = road.in_matrix.keys()
            out_side = road.out_matrix.values()
            for segment in road.segments:
                if segment.length >= pos:
                    break
                pos -= segment.length
            x0, y0 = segment.src.x, segment.src.y
            xt, yt = segment.dst.x, segment.dst.y

            if segment == road.segments[0]:
                d = (in_side[0] + in_side[-1] + 1) / 2.0
                t_road = road.src_road.segments[-1]
                ex, ey = tools.delta_pt_in_perp_line(t_road.src.x, t_road.src.y, t_road.dst.x, t_road.dst.y,
                                                     road.src_road.width/2.0)
                rx0, ry0, rxt, ryt = t_road.src.x - ex, t_road.src.y - ey, t_road.dst.x - ex, t_road.dst.y - ey
                xn, yn = tools.delta_pt_in_perp_line(rx0, ry0, rxt, ryt, d * road.src_road.lane_width)
                x0, y0 = rxt + xn, ryt + yn

            if segment == road.segments[-1]:
                d = (out_side[0] + out_side[-1] + 1) / 2.0
                t_road = road.dst_road.segments[0]
                ex, ey = tools.delta_pt_in_perp_line(t_road.src.x, t_road.src.y, t_road.dst.x, t_road.dst.y,
                                                     road.dst_road.width/2.0)
                rx0, ry0, rxt, ryt = t_road.src.x - ex, t_road.src.y - ey, t_road.dst.x - ex, t_road.dst.y - ey
                xn, yn = tools.delta_pt_in_perp_line(rx0, ry0, rxt, ryt, d * road.dst_road.lane_width)
                xt, yt = rx0 + xn, ry0 + yn

        elif road.__class__.__name__ == 'UninterruptedRoad':
            for segment in road.segments:
                if segment.length >= pos:
                    break
                pos -= segment.length
            x0, y0 = segment.src.x, segment.src.y
            xt, yt = segment.dst.x, segment.dst.y
        # Get global longitude
        long_dx, long_dy = tools.delta_pt_in_line(x0, y0, xt, yt, pos)

        # Get innermost lane
        edge_x, edge_y = tools.delta_pt_in_perp_line(x0, y0, xt, yt, road.width / 2.0)
        ref_x0, ref_y0, ref_xt, ref_yt = x0 - edge_x, y0 - edge_y, xt - edge_x, yt - edge_y

        # Get actual point
        lat_dx, lat_dy = tools.delta_pt_in_perp_line(ref_x0, ref_y0, ref_xt, ref_yt, lane *
                                                     road.lane_width)
        # print lat_dx, lat_dy
        x = ref_x0 + long_dx + lat_dx
        y = ref_y0 + long_dy + lat_dy

        return round(x, 0), round(y, 0)

    def build_route_list(self):
        route_masterlist = []

        for entry__ in self.entry_roads():
            for exit__ in self.exit_roads():

                # Handles the case where there is only 1 uroad on map
                if entry__ == exit__:
                    route_masterlist.append([str(entry__)])
                else:
                    for path in tools.depth_first_search(self, entry__, exit__):
                        if path is not None:
                            route_masterlist.append([str(road.label) for road in path])

        # Get the list of all entry roads and exit roads; next line removes duplicates
        ent_list = [path[0] for path in route_masterlist]
        ent_list = list(collections.OrderedDict.fromkeys(ent_list))

        ext_list = [path[-1] for path in route_masterlist]
        ext_list = list(collections.OrderedDict.fromkeys(ext_list))

        od_comb = [[entry, exit] for entry in ent_list for exit in ext_list]

        valid_od_comb = [pair for pair in od_comb
                         if len([route for route in route_masterlist if (route[0] == pair[0] and route[-1] == pair[-1])]) > 0]

        # Get the total lengths of each route in route_masterlist
        road_lengths = []
        for route__ in route_masterlist:
            length = 0
            for road__ in route__:
                length += self.get_road_by_label(road__).length
            road_lengths.append(length)

        for i in range(len(route_masterlist)):
            self.route_distances[tuple(route_masterlist[i])] = config.to_m(road_lengths[i])

        # Order
        sorted_route_masterlist = [e[1] for e in sorted(zip(road_lengths, route_masterlist))]

        return sorted_route_masterlist, valid_od_comb

    def set_route(self):
        for uroad in self.dispatcher.keys():

            route_list = [route for route in self.route_masterlist if str(uroad.label) == route[0]]
            od_list = [pair for pair in self.od_list if pair[0] == str(uroad.label)]
            dest_list = [pair[1] for pair in od_list]
            self.dispatcher[uroad].route_list = route_list
            self.dispatcher[uroad].dest_list = dest_list
