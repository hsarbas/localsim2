def complete_strategy(cls):
    if 'left_press' not in cls.__dict__:
        @staticmethod
        def left_press(*args, **kwargs):
            pass
        cls.left_press = left_press

    if 'left_motion' not in cls.__dict__:
        @staticmethod
        def left_motion(*args, **kwargs):
            pass
        cls.left_motion = left_motion

    if 'left_release' not in cls.__dict__:
        @staticmethod
        def left_release(*args, **kwargs):
            pass
        cls.left_release = left_release

    if 'right_click' not in cls.__dict__:
        @staticmethod
        def right_click(*args, **kwargs):
            pass
        cls.right_click = right_click

    if 'right_menu' not in cls.__dict__:
        @staticmethod
        def right_menu(*args, **kwargs):
            pass
        cls.right_menu = right_menu

    return cls


class CannotCreateInstanceError(Exception):
    pass


def prevent_instantiation(cls):
    @staticmethod
    def __new__(cls, *args, **kwargs):
        raise CannotCreateInstanceError
    cls.__new__ = __new__

    return cls


def dist_to_segment(obj, dist):
    # Finds the appropriate segment based on distance from the source node
    for segment in obj.segments:
        dist -= segment.length
        if dist <= 0:
            return segment
    return None


def point_to_segment(obj, x, y):
    # Finds the appropriate segment where the pointer is located
    from localsim.utils import tools
    for segment in obj.segments:
        rx, ry = tools.orthogonal_projection(segment.src.x, segment.src.y, x, y, segment.dx, segment.dy)
        da = tools.distance(rx - segment.src.x, ry - segment.src.y)
        db = tools.distance(segment.dst.x - rx, segment.dst.y - ry)
        if tools.almost_equal(da + db, segment.length, 0.001):
            return segment
    return None


def point_to_lane(obj, x, y):
    # Finds the appropriate lane where the pointer is located
    from localsim.utils import tools
    from math import floor
    segment = point_to_segment(obj, x, y)

    if obj.__class__.__name__ == 'InterruptedRoad':

        src_road = obj.in_matrix.keys()
        dst_road = obj.out_matrix.values()
        src_mid = (src_road[0] + src_road[-1] + 1) / 2.0
        dst_mid = (dst_road[0] + dst_road[-1] + 1) / 2.0

        smx, smy = tools.delta_pt_in_perp_line(obj.src_road.src.x, obj.src_road.src.y,
                                               obj.src_road.dst.y, obj.src_road.dst.y,
                                               (-obj.src_road.lanes / 2.0 + src_mid) * obj.lane_width)

        dmx, dmy = tools.delta_pt_in_perp_line(obj.dst_road.src.x, obj.dst_road.src.y,
                                               obj.dst_road.dst.x, obj.dst_road.dst.y,
                                               (-obj.dst_road.lanes / 2.0 + dst_mid) * obj.lane_width)
        smx, smy = smx + obj.src_road.dst.x, smy + obj.src_road.dst.y
        dmx, dmy = dmx + obj.dst_road.src.x, dmy + obj.dst_road.src.y

        if obj.segments[0] == obj.segments[-1]:
            dx, dy = tools.delta_pt_in_perp_line(smx, smy, dmx, dmy, obj.width/2.0)
            ax, ay = smx - dx, smy - dy
        elif segment == obj.segments[0]:
            dx, dy = tools.delta_pt_in_perp_line(smx, smy, segment.dst.x, segment.dst.y, obj.width/2.0)
            ax, ay = smx - dx, smy - dy
        elif segment == obj.segments[-1]:
            dx, dy = tools.delta_pt_in_perp_line(segment.src.x, segment.src.y, dmx, dmy, obj.width/2.0)
            ax, ay = segment.src.x - dx, segment.src.y - dy
        else:
            dx, dy = tools.delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x,
                                                 segment.dst.y, obj.width/2.0)
            ax, ay = segment.src.x - dx, segment.src.y - dy
    else:
        dx, dy = tools.delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x,
                                             segment.dst.y, obj.width/2.0)
        ax, ay = segment.src.x - dx, segment.src.y - dy

    xp, yp = tools.orthogonal_projection(ax, ay, x, y, segment.dx, segment.dy)
    dist = tools.distance(x - xp, y - yp)
    lane = floor(dist / obj.lane_width)
    return lane


def point_to_dist(obj, x, y):
    # Computes an estimated distance between the source node and the pointer
    # if the pointer is located inside the road
    from localsim.utils import tools
    pos = 0
    for segment in obj.segments.segments:
        rx, ry = tools.orthogonal_projection(segment.src.x, segment.src.y, x, y, segment.dx, segment.dy)

        da = tools.distance(rx - segment.src.x, ry - segment.src.y)
        db = tools.distance(segment.dst.x - rx, segment.dst.y - ry)
        if tools.almost_equal(da + db, segment.length, 0.001):
            pos += tools.distance(rx - segment.src.x, ry-segment.src.y)
            break
        pos += segment.length
    return pos
